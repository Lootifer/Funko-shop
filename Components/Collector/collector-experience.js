import { shoppingState } from "../Experience/shopping-state.js";

export const getProductBadges = (product) => {
  const badges = [];
  if (product.exclusive) badges.push({ label: "Exclusive", tone: "accent" });
  if (product.chase) badges.push({ label: "Chase", tone: "warning" });
  if (product.vaulted) badges.push({ label: "Vaulted", tone: "muted" });
  if (product.stock <= 3 && product.stock > 0) badges.push({ label: "Low Stock", tone: "warning" });
  if (product.stock === 0) badges.push({ label: "Sold Out", tone: "danger" });
  if (product.releaseYear >= new Date().getFullYear() - 1) badges.push({ label: "New", tone: "accent" });
  if (product.price >= 150) badges.push({ label: "Limited", tone: "muted" });
  return badges;
};

export const getStockTone = (product) => {
  if (product.stock === 0) return "danger";
  if (product.stock <= 3) return "warning";
  return "success";
};

export const getStockLabel = (product) => {
  if (product.stock === 0) return "Sold Out";
  if (product.stock <= 3) return "Low Stock";
  return "In Stock";
};

export const getCollectorScore = (product) => {
  const popularity = Number(product.price) + (product.exclusive ? 40 : 0) + (product.chase ? 25 : 0) + (product.vaulted ? 20 : 0) + (product.stock > 0 ? 10 : 0);
  const score = Math.min(5, Math.max(1, Math.round(popularity / 60)));
  return "★".repeat(score) + "☆".repeat(5 - score);
};

export const createQuickView = (product) => `
  <div class="quick-view-card">
    <img src="${product.image || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80"}" alt="${product.name}" />
    <div class="quick-view-body">
      <p class="eyebrow">Quick View</p>
      <h3>${product.name}</h3>
      <p class="quick-view-price">$${product.price}</p>
      <p>${product.edition || "Standard"}</p>
      <div class="quick-view-actions">
        <button class="button primary" data-action="add-to-cart" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${product.slug || ""}" type="button">Get Yours</button>
      </div>
    </div>
  </div>
`;

export const renderWishlistSection = (products, container) => {
  if (!container) return;
  container.innerHTML = products.length
    ? products.map((product) => `<div class="drawer-item"><div class="drawer-item-body"><strong>${product.name}</strong><p>$${product.price}</p></div></div>`).join("")
    : '<p class="card-empty">Your wishlist is empty.</p>';
};

export const getRecentProducts = () => shoppingState.getRecent();
