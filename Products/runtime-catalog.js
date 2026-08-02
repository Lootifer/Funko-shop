import { normalizeProductCatalog } from "./product-schema.js";

export const ADMIN_PRODUCT_STORAGE_KEY = "lootifer-admin-products-v1";
const DATA_URL = new URL("../Data/products.json", import.meta.url).href;

const parseStoredCatalog = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return null;
    return normalizeProductCatalog(parsed);
  } catch {
    return null;
  }
};

export const loadFileCatalog = async () => {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Productcatalogus kan niet worden geladen.");
  }
  const raw = await response.json();
  return normalizeProductCatalog(raw);
};

export const loadRuntimeCatalog = async () => {
  const stored = parseStoredCatalog(localStorage.getItem(ADMIN_PRODUCT_STORAGE_KEY));
  if (stored?.length) {
    return {
      products: stored,
      source: "local",
    };
  }

  return {
    products: await loadFileCatalog(),
    source: "file",
  };
};

export const saveRuntimeCatalog = (products = []) => {
  const normalized = normalizeProductCatalog(products);
  localStorage.setItem(ADMIN_PRODUCT_STORAGE_KEY, JSON.stringify(normalized));
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("lootifer:inventory-updated"));
    window.dispatchEvent(new CustomEvent("lootifer:state-updated", {
      detail: { key: ADMIN_PRODUCT_STORAGE_KEY },
    }));
  }
  return normalized;
};

export const updateRuntimeStockByItems = async ({ items = [], mode = "decrease" } = {}) => {
  const { products } = await loadRuntimeCatalog();
  const grouped = items.reduce((accumulator, item) => {
    const id = Number(item.id) || 0;
    const quantity = Math.max(0, Number(item.quantity) || 0);
    if (!id || !quantity) return accumulator;
    accumulator[id] = (accumulator[id] || 0) + quantity;
    return accumulator;
  }, {});

  const warnings = [];

  const next = products.map((product) => {
    const id = Number(product.id) || 0;
    const delta = grouped[id] || 0;
    if (!delta) return product;

    const stock = Math.max(0, Number(product.stock) || 0);
    if (mode === "increase") {
      return { ...product, stock: stock + delta };
    }

    if (delta > stock) {
      warnings.push(`${product.name}: gevraagd ${delta}, beschikbaar ${stock}`);
      return { ...product, stock: 0 };
    }

    return { ...product, stock: Math.max(0, stock - delta) };
  });

  return {
    products: saveRuntimeCatalog(next),
    warnings,
  };
};

export const buildCatalogIndex = (products = []) => {
  return new Map(products.map((product) => [Number(product.id) || 0, product]));
};
