import { normalizeProductCatalog } from "../../Products/product-schema.js";

const STORAGE_KEY = "lootifer-admin-products-v1";
const DATA_URL = new URL("../../Data/products.json", import.meta.url).href;

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
    throw new Error("Unable to load products catalog.");
  }

  const rawProducts = await response.json();
  return {
    products: normalizeProductCatalog(rawProducts),
    source: "file",
  };
};

export const saveProductCatalog = (products = []) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
};

export const clearSavedCatalog = () => {
  localStorage.removeItem(STORAGE_KEY);
};
