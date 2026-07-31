import { shoppingState } from "./Experience/shopping-state.js";
import {
  getCollectorScore,
  getProductBadges,
  getStockLabel,
  getStockTone,
} from "./Collector/collector-experience.js";

export const createProductCard = (product) => {
  const image = product.image || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80";
  const slug = product.slug || product.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const badges = getProductBadges(product)
    .map((badge) => `<span class="collector-badge ${badge.tone}">${badge.label}</span>`)
    .join("");
  const stockTone = getStockTone(product);
  const stockLabel = getStockLabel(product);
  const collectorScore = getCollectorScore(product);
  const inWishlist = shoppingState.isWishlisted(product.id);

  return `
    <article class="collectible-card reveal" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${slug}" tabindex="0">
      <div class="card-media">
        <a href="product.html?slug=${slug}" class="card-link" aria-label="View ${product.name}">
          <img src="${image}" alt="${product.name}" loading="lazy" />
        </a>
        <button class="wishlist-heart ${inWishlist ? "active" : ""}" data-action="toggle-wishlist" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${slug}" type="button" aria-label="Toggle wishlist for ${product.name}">${inWishlist ? "♥" : "♡"}</button>
        <button class="quick-view-pill" data-action="quick-view" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${slug}" type="button">Quick View</button>
      </div>
      <div class="card-body">
        <div class="collector-badges">${badges}</div>
        <p class="card-meta">${product.universe || product.category} • ${product.franchise || "Collector"}</p>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <p class="collector-score">${collectorScore}</p>
        <div class="card-footer">
          <span>$${product.price}</span>
          <div class="card-actions">
            <button class="text-link" data-action="add-to-cart" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${slug}" type="button">Add to cart</button>
            <button class="text-link" data-action="toggle-compare" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${slug}" type="button">Compare</button>
            <a href="product.html?slug=${slug}">View</a>
          </div>
        </div>
        <span class="stock-pill ${stockTone}">${stockLabel} • ${product.stock > 0 ? `${product.stock} left` : "out now"}</span>
      </div>
    </article>
  `;
};
