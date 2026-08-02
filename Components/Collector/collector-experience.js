import { shoppingState } from "../Experience/shopping-state.js";
import { createImageAttributes } from "../../Products/product-media.js";
import { formatCurrency } from "../../Assets/Js/formatting.js";

export const getProductBadges = (product) => {
  const badges = [];
  if (product.exclusive) badges.push({ label: "Exclusief", tone: "accent" });
  if (product.chase) badges.push({ label: "Chase", tone: "warning" });
  if (product.vaulted) badges.push({ label: "Gewaardeerd", tone: "muted" });
  if (product.stock <= 3 && product.stock > 0) badges.push({ label: "Bijna op", tone: "warning" });
  if (product.stock === 0) badges.push({ label: "Uitverkocht", tone: "danger" });
  if (product.releaseYear >= new Date().getFullYear() - 1) badges.push({ label: "Nieuw", tone: "accent" });
  if (product.price >= 150) badges.push({ label: "Gelimiteerd", tone: "muted" });
  return badges;
};

export const getStockTone = (product) => {
  if (product.stock === 0) return "danger";
  if (product.stock <= 3) return "warning";
  return "success";
};

export const getStockLabel = (product) => {
  if (product.stock === 0) return "Uitverkocht";
  if (product.stock <= 3) return "Weinig op voorraad";
  return "Op voorraad";
};

export const getCollectorScore = (product) => {
  const popularity = Number(product.price) + (product.exclusive ? 40 : 0) + (product.chase ? 25 : 0) + (product.vaulted ? 20 : 0) + (product.stock > 0 ? 10 : 0);
  const score = Math.min(5, Math.max(1, Math.round(popularity / 60)));
  return "★".repeat(score) + "☆".repeat(5 - score);
};

export const createQuickView = (product) => `
  <div class="quick-view-card">
    <img ${createImageAttributes({ src: product.image, alt: product.name })} />
    <div class="quick-view-body">
      <p class="eyebrow">Snel bekijken</p>
      <h3>${product.name}</h3>
      <p class="quick-view-price">${formatCurrency(product.price)}</p>
      <p>${product.edition || "Standaard"}</p>
      <div class="quick-view-actions">
        <button class="button primary" data-action="add-to-cart" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${product.slug || ""}" type="button">In winkelwagen</button>
      </div>
    </div>
  </div>
`;

export const renderWishlistSection = (products, container) => {
  if (!container) return;
  container.innerHTML = products.length
    ? products.map((product) => `<div class="drawer-item"><div class="drawer-item-body"><strong>${product.name}</strong><p>${formatCurrency(product.price)}</p></div></div>`).join("")
    : '<p class="card-empty">Je verlanglijst is leeg.</p>';
};

export const getRecentProducts = () => shoppingState.getRecent();
