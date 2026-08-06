import { normalizeProductCatalog } from "../../Products/product-schema.js";
import {
  createProductInApi,
  deleteProductInApi,
  fetchProductsFromApi,
  SERVER_UNREACHABLE_MESSAGE,
  updateProductArchiveInApi,
  updateProductInApi,
  updateProductStockInApi,
} from "../../Assets/Js/api-client.js";

const DATA_URL = new URL("../../Data/products.json", import.meta.url).href;

const asFriendlyError = (error) => {
  if (error?.offline) {
    return new Error(SERVER_UNREACHABLE_MESSAGE);
  }

  const details = Array.isArray(error?.details) && error.details.length
    ? ` ${error.details.join(" ")}`
    : "";
  return new Error(`${String(error?.message || "Serverfout.")}${details}`.trim());
};

export const loadProductCatalog = async () => {
  try {
    const products = await fetchProductsFromApi();
    return {
      products: normalizeProductCatalog(products),
      source: "api",
    };
  } catch {
    const fallback = await loadFileProductCatalog();
    return {
      products: fallback,
      source: "file",
    };
  }
};

export const loadFileProductCatalog = async () => {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Bronbestand Data/products.json kan niet worden geladen.");
  }

  const rawProducts = await response.json();
  return normalizeProductCatalog(rawProducts);
};

const emitInventoryEvents = () => {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("lootifer:inventory-updated"));
  window.dispatchEvent(new CustomEvent("lootifer:state-updated", {
    detail: { key: "lootifer-api-products" },
  }));
};

export const createProduct = async (product) => {
  try {
    const created = await createProductInApi(product);
    emitInventoryEvents();
    return created;
  } catch (error) {
    throw asFriendlyError(error);
  }
};

export const saveProduct = async (id, product) => {
  try {
    const updated = await updateProductInApi(id, product);
    emitInventoryEvents();
    return updated;
  } catch (error) {
    throw asFriendlyError(error);
  }
};

export const changeProductStock = async (id, stock) => {
  try {
    const updated = await updateProductStockInApi(id, stock);
    emitInventoryEvents();
    return updated;
  } catch (error) {
    throw asFriendlyError(error);
  }
};

export const archiveProduct = async (id, archived) => {
  try {
    const updated = await updateProductArchiveInApi(id, archived);
    emitInventoryEvents();
    return updated;
  } catch (error) {
    throw asFriendlyError(error);
  }
};

export const deleteProduct = async (id) => {
  try {
    const result = await deleteProductInApi(id);
    emitInventoryEvents();
    return result;
  } catch (error) {
    throw asFriendlyError(error);
  }
};

export const clearSavedCatalog = () => {
  emitInventoryEvents();
};
