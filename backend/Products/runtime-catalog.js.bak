import { normalizeProductCatalog } from "./product-schema.js";
import { adjustStockInApi, fetchProductsFromApi } from "../Assets/Js/api-client.js";

const DATA_URL = new URL("../Data/products.json", import.meta.url).href;

export const loadFileCatalog = async () => {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Productcatalogus kan niet worden geladen.");
  }
  const raw = await response.json();
  return normalizeProductCatalog(raw);
};

export const loadRuntimeCatalog = async () => {
  try {
    const apiProducts = await fetchProductsFromApi();
    if (apiProducts.length) {
      return {
        products: normalizeProductCatalog(apiProducts),
        source: "api",
      };
    }
  } catch {
    // Fall back to JSON file when API is unavailable.
  }

  return {
    products: await loadFileCatalog(),
    source: "file",
  };
};

export const saveRuntimeCatalog = (products = []) => {
  const normalized = normalizeProductCatalog(products);
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("lootifer:inventory-updated"));
    window.dispatchEvent(new CustomEvent("lootifer:state-updated", {
      detail: { key: "lootifer-runtime-catalog" },
    }));
  }
  return normalized;
};

export const updateRuntimeStockByItems = async ({ items = [], mode = "decrease" } = {}) => {
  const apiResult = await adjustStockInApi({
    items,
    mode,
    reason: mode === "increase" ? "runtime-order-reversal" : "runtime-order-checkout",
  });

  return {
    products: saveRuntimeCatalog(apiResult.products),
    warnings: apiResult.warnings,
    source: "api",
  };
};

export const buildCatalogIndex = (products = []) => {
  return new Map(products.map((product) => [Number(product.id) || 0, product]));
};
