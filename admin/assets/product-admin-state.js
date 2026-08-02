import { normalizeProductCatalog } from "../../Products/product-schema.js";

const STORAGE_KEY = "lootifer-admin-products-v1";
const DATA_URL = new URL("../../Data/products.json", import.meta.url).href;

export const ADMIN_STORAGE_KEY = STORAGE_KEY;

const parseStoredCatalog = (value) => {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return normalizeProductCatalog(parsed);
  } catch {
    return null;
  }
};

export const loadProductCatalog = async () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const storedCatalog = stored ? parseStoredCatalog(stored) : null;
  if (storedCatalog?.length) {
    return { products: storedCatalog, source: "local" };
  }

  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error("Productcatalogus kan niet worden geladen.");
  }

  const rawProducts = await response.json();
  return {
    products: normalizeProductCatalog(rawProducts),
    source: "file",
  };
};

export const loadFileProductCatalog = async () => {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Bronbestand Data/products.json kan niet worden geladen.");
  }

  const rawProducts = await response.json();
  return normalizeProductCatalog(rawProducts);
};

export const saveProductCatalog = (products = []) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("lootifer:inventory-updated"));
    window.dispatchEvent(new CustomEvent("lootifer:state-updated", {
      detail: { key: STORAGE_KEY },
    }));
  }
};

export const clearSavedCatalog = () => {
  localStorage.removeItem(STORAGE_KEY);
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("lootifer:inventory-updated"));
    window.dispatchEvent(new CustomEvent("lootifer:state-updated", {
      detail: { key: STORAGE_KEY },
    }));
  }
};
