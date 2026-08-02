import { shoppingState } from "./shopping-state.js";
import { buildCatalogIndex, loadRuntimeCatalog, updateRuntimeStockByItems } from "../../Products/runtime-catalog.js";

export const ORDER_STATUSES = [
  "Nieuw",
  "Bevestigd",
  "In behandeling",
  "Verzonden",
  "Afgerond",
  "Geannuleerd",
];

const ORDERS_STORAGE_KEY = "lootifer-test-orders";

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
  return shoppingState.getOrders().map((order) => ({
    status: "Nieuw",
    isTestOrder: true,
    stockRestoredAt: null,
    ...order,
  }));
};

export const saveOrders = (orders = []) => {
  shoppingState.saveOrders(orders);
  emitInventoryUpdate();
  return orders;
};

export const addOrder = (order) => {
  const orders = [order, ...getOrders()];
  return saveOrders(orders);
};

export const getOrderById = (orderId) => {
  const id = Number(orderId) || 0;
  return getOrders().find((order) => Number(order.id) === id) || null;
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

export const applyStockReductionForOrder = async (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  return updateRuntimeStockByItems({ items, mode: "decrease" });
};

export const restoreStockForOrder = async (order) => {
  if (!order || !Array.isArray(order.items) || !order.items.length) {
    return { restored: false, reason: "empty" };
  }

  if (order.stockRestoredAt) {
    return { restored: false, reason: "already-restored" };
  }

  await updateRuntimeStockByItems({ items: order.items, mode: "increase" });
  return { restored: true };
};

export const updateOrderStatus = async (orderId, nextStatus) => {
  const id = Number(orderId) || 0;
  if (!id) throw new Error("Ongeldig order-id.");
  if (!ORDER_STATUSES.includes(nextStatus)) throw new Error("Ongeldige orderstatus.");

  const orders = getOrders();
  const order = orders.find((item) => Number(item.id) === id);
  if (!order) throw new Error("Order niet gevonden.");

  const previousStatus = order.status || "Nieuw";
  const shouldRestoreStock = nextStatus === "Geannuleerd" && previousStatus !== "Geannuleerd";

  if (shouldRestoreStock) {
    const restoration = await restoreStockForOrder(order);
    if (restoration.restored) {
      order.stockRestoredAt = new Date().toISOString();
    }
  }

  order.status = nextStatus;
  order.updatedAt = new Date().toISOString();
  saveOrders(orders);
  return order;
};

export const deleteOrderById = (orderId) => {
  const id = Number(orderId) || 0;
  const orders = getOrders();
  const next = orders.filter((order) => Number(order.id) !== id);
  saveOrders(next);
  return next;
};

export const deleteAllTestOrders = () => {
  const orders = getOrders();
  const backup = orders.filter((order) => order.isTestOrder !== false);
  const next = orders.filter((order) => order.isTestOrder === false);
  saveOrders(next);
  return {
    next,
    backup,
  };
};
