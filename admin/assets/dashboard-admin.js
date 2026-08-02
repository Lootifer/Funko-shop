import { loadProductCatalog } from "./product-admin-state.js";
import { getProductCompleteness } from "./product-admin-utils.js";

const nodes = {
  totalProducts: document.getElementById("statTotalProducts"),
  totalUniverses: document.getElementById("statTotalUniverses"),
  lowStock: document.getElementById("statLowStock"),
  completeProducts: document.getElementById("statCompleteProducts"),
  incompleteProducts: document.getElementById("statIncompleteProducts"),
};

const setText = (node, value) => {
  if (!node) return;
  node.textContent = String(value);
};

const renderDashboardStats = async () => {
  try {
    const { products } = await loadProductCatalog();
    const activeProducts = products.filter((product) => !product.archived);
    const universes = new Set(activeProducts.map((product) => String(product.universe || "").trim()).filter(Boolean));
    const lowStock = activeProducts.filter((product) => {
      const stock = Number(product.stock) || 0;
      return stock > 0 && stock <= 2;
    }).length;

    const completeProducts = activeProducts.filter((product) => getProductCompleteness(product).complete).length;
    const incompleteProducts = activeProducts.length - completeProducts;

    setText(nodes.totalProducts, activeProducts.length);
    setText(nodes.totalUniverses, universes.size);
    setText(nodes.lowStock, lowStock);
    setText(nodes.completeProducts, completeProducts);
    setText(nodes.incompleteProducts, incompleteProducts);
  } catch (error) {
    // Keep zero values if loading fails.
    console.error("Dashboardstatistieken konden niet worden geladen:", error);
  }
};

renderDashboardStats();
