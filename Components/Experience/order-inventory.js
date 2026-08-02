import { shoppingState } from "./shopping-state.js";
import { buildCatalogIndex, loadRuntimeCatalog } from "../../Products/runtime-catalog.js";
import {
  SERVER_UNREACHABLE_MESSAGE,
  createOrderInApi,
  deleteOrderInApi,
  fetchOrderByNumberFromApi,
  fetchOrdersFromApi,
  updateOrderStatusInApi,
} from "../../Assets/Js/api-client.js";

export const ORDER_STATUSES = [
  "Nieuw",
  "Bevestigd",
  "In behandeling",
  "Verzonden",
  "Afgerond",
  "Geannuleerd",
];

const ORDERS_STORAGE_KEY = "lootifer-test-orders";
let ordersCache = [];

const emitInventoryUpdate = () => {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("lootifer:inventory-updated"));
  window.dispatchEvent(new CustomEvent("lootifer:state-updated", {
    detail: { key: ORDERS_STORAGE_KEY },
  }));
};

export const createOrderNumber = () => {
  const stamp = new Date();
  const datePart = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}`;
  const timePart = String(stamp.getTime()).slice(-5);
  return `LOOT-${datePart}-${timePart}`;
};

export const getOrders = () => {
  return ordersCache.map((order) => ({
    status: "Nieuw",
    isTestOrder: true,
    stockRestoredAt: null,
    ...order,
  }));
};

const setOrdersCache = (orders = []) => {
  ordersCache = Array.isArray(orders) ? [...orders] : [];
  emitInventoryUpdate();
  return getOrders();
};

const toFriendlyError = (error) => {
  if (error?.offline) {
    return new Error(SERVER_UNREACHABLE_MESSAGE);
  }

  const details = Array.isArray(error?.details) && error.details.length
    ? ` ${error.details.join(" ")}`
    : "";
  return new Error(`${String(error?.message || "Er is een fout opgetreden bij de server.")}${details}`.trim());
};

export const syncOrdersFromApi = async () => {
  try {
    const orders = await fetchOrdersFromApi();
    return setOrdersCache(orders);
  } catch (error) {
    throw toFriendlyError(error);
  }
};

export const saveOrders = (orders = []) => {
  return setOrdersCache(orders);
};

export const addOrder = (order) => {
  return createOrderInApi(order)
    .then((created) => {
      const local = getOrders().filter((item) => item.number !== created.number);
      saveOrders([created, ...local]);
      return created;
    })
    .catch((error) => {
      throw toFriendlyError(error);
    });
};

export const getOrderByNumber = async (orderNumber) => {
  try {
    const order = await fetchOrderByNumberFromApi(orderNumber);
    if (!order) return null;

    const current = getOrders();
    const next = current.some((item) => item.number === order.number)
      ? current.map((item) => (item.number === order.number ? order : item))
      : [order, ...current];
    saveOrders(next);
    return order;
  } catch (error) {
    throw toFriendlyError(error);
  }
};

export const synchronizeCartWithInventory = async () => {
  const cart = shoppingState.getCart();
  const { products } = await loadRuntimeCatalog();
  const index = buildCatalogIndex(products);
  const warnings = [];
  let changed = false;

  const nextCart = cart
    .map((item) => {
      const current = index.get(Number(item.id) || 0);
      if (!current) {
        changed = true;
        warnings.push(`${item.name}: niet meer beschikbaar`);
        return null;
      }

      const requested = Math.max(0, Number(item.quantity) || 0);
      const available = Math.max(0, Number(current.stock) || 0);
      const corrected = Math.min(requested, available);

      if (corrected !== requested || Number(item.stock) !== available || Number(item.price) !== Number(current.price)) {
        changed = true;
      }

      if (corrected <= 0) {
        warnings.push(`${current.name}: uitverkocht tijdens je sessie`);
        return null;
      }

      if (corrected < requested) {
        warnings.push(`${current.name}: aangepast naar ${corrected} door beperkte voorraad`);
      }

      return {
        ...item,
        name: current.name,
        slug: current.slug,
        image: current.image,
        universe: current.universe,
        franchise: current.franchise,
        edition: current.edition,
        price: current.price,
        stock: available,
        quantity: corrected,
      };
    })
    .filter(Boolean);

  if (changed) {
    shoppingState.saveCart(nextCart);
  }

  return {
    cart: nextCart,
    warnings,
    changed,
  };
};

export const updateOrderStatus = async (orderNumber, nextStatus) => {
  try {
    const updated = await updateOrderStatusInApi(orderNumber, nextStatus);
    const current = getOrders();
    const next = current.some((item) => item.number === updated.number)
      ? current.map((item) => (item.number === updated.number ? updated : item))
      : [updated, ...current];
    saveOrders(next);
    return updated;
  } catch (error) {
    throw toFriendlyError(error);
  }
};

export const deleteOrderByNumber = async (orderNumber) => {
  try {
    const deleted = await deleteOrderInApi(orderNumber);
    if (!deleted) return false;
    const next = getOrders().filter((order) => order.number !== orderNumber);
    saveOrders(next);
    return true;
  } catch (error) {
    throw toFriendlyError(error);
  }
};

export const getLegacyLocalOrders = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const backupLegacyLocalOrders = () => {
  const legacy = getLegacyLocalOrders();
  return JSON.stringify(legacy, null, 2);
};

export const migrateLegacyLocalOrdersToApi = async (orders = []) => {
  const source = Array.isArray(orders) ? orders : [];
  const migrated = [];
  const errors = [];

  for (const order of source) {
    try {
      const created = await createOrderInApi(order);
      migrated.push(created);
    } catch (error) {
      errors.push({
        number: order?.number || "onbekend",
        message: toFriendlyError(error).message,
      });
    }
  }

  if (migrated.length) {
    await syncOrdersFromApi();
  }

  return {
    migrated,
    errors,
  };
};
