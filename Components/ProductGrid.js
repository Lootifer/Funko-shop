import { createProductCard } from "./ProductCard.js";

export const createProductGrid = (products) => {
  if (!products.length) {
    return '<p class="card-empty">No collectibles match the current filters.</p>';
  }

  return `<div class="card-grid">${products.map((product) => createProductCard(product)).join("")}</div>`;
};
