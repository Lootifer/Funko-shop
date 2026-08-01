import { shoppingState } from "./Experience/shopping-state.js";
import {
  getCollectorScore,
  getProductBadges,
  getStockLabel,
  getStockTone,
} from "./Collector/collector-experience.js";
import { createImageAttributes } from "../Products/product-media.js";

export const createProductCard = (product) => {
  const safeName = String(product?.name || "Collector item");
  const image = product?.image;
  const slug = product?.slug || safeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const badges = getProductBadges(product)
    .map((badge) => `<span class="collector-badge ${badge.tone}">${badge.label}</span>`)
    .join("");
  const stockTone = getStockTone(product);
  const stockLabel = getStockLabel(product);
  const collectorScore = getCollectorScore(product);
  const inWishlist = shoppingState.isWishlisted(product?.id);
  const safePrice = Number(product?.price || 0);

  return `
    <article class="collectible-card reveal" data-product-id="${product.id}" data-product-name="${safeName}" data-product-price="${safePrice}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${slug}" tabindex="0">
      <div class="card-media">
        <a href="product.html?slug=${slug}" class="card-link" aria-label="View ${safeName}">
          <img ${createImageAttributes({ src: image, alt: safeName })} />
        </a>
        <button class="wishlist-heart ${inWishlist ? "active" : ""}" data-action="toggle-wishlist" data-product-id="${product.id}" data-product-name="${safeName}" data-product-price="${safePrice}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${slug}" type="button" aria-label="Toggle wishlist for ${safeName}">${inWishlist ? "♥" : "♡"}</button>
        <button class="quick-view-pill" data-action="quick-view" data-product-id="${product.id}" data-product-name="${safeName}" data-product-price="${safePrice}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${slug}" type="button">Quick View</button>
      </div>
      <div class="card-body">
        <div class="collector-badges">${badges}</div>
        <p class="card-meta">${product.universe || product.category} • ${product.franchise || "Collector"}</p>
        <h3>${safeName}</h3>
        <p>${product.description}</p>
        <p class="collector-score">${collectorScore}</p>
        <div class="card-footer">
          <span>$${safePrice}</span>
          <div class="card-actions">
            <button class="text-link" data-action="add-to-cart" data-product-id="${product.id}" data-product-name="${safeName}" data-product-price="${safePrice}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${slug}" type="button">Add to cart</button>
            <button class="text-link" data-action="toggle-compare" data-product-id="${product.id}" data-product-name="${safeName}" data-product-price="${safePrice}" data-product-image="${product.image || ""}" data-product-universe="${product.universe || ""}" data-product-franchise="${product.franchise || ""}" data-product-edition="${product.edition || ""}" data-product-stock="${product.stock || 0}" data-product-slug="${slug}" type="button">Compare</button>
            <a href="product.html?slug=${slug}">View</a>
          </div>
        </div>
        <span class="stock-pill ${stockTone}">${stockLabel} • ${product.stock > 0 ? `${product.stock} left` : "out now"}</span>
      </div>
    </article>
  `;
};
