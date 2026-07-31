import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createProductCard } from "../../Components/ProductCard.js";
import { normalizeProduct } from "../../Products/product-schema.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";
import { createShoppingUi, bindShoppingActions, attachProductCardInteractions, syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");
const wishlistGrid = document.getElementById("wishlistGrid");

if (headerRoot) headerRoot.innerHTML = createHeader("wishlist");
if (footerRoot) footerRoot.innerHTML = createFooter();

const shoppingRoot = document.createElement("div");
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });

const renderWishlist = async () => {
  const items = shoppingState.getWishlist();
  if (!wishlistGrid) return;

  try {
    const response = await fetch("Data/products.json");
    const rawProducts = await response.json();
    const catalog = rawProducts.map(normalizeProduct);
    const wishlistItems = catalog.filter((product) => items.some((item) => item.id === product.id));

    wishlistGrid.innerHTML = wishlistItems.length
      ? wishlistItems.map((item) => createProductCard(item)).join("")
      : '<p class="card-empty">Your wishlist is empty. Save a few grails from the catalog and they will appear here.</p>';
  } catch (error) {
    wishlistGrid.innerHTML = '<p class="card-empty">Your wishlist is unavailable right now.</p>';
  }

  wishlistGrid.querySelectorAll("[data-action]").forEach((trigger) => {
    const product = {
      id: Number(trigger.dataset.productId || 0),
      name: trigger.dataset.productName || "Collector item",
      price: Number(trigger.dataset.productPrice || 0),
      image: trigger.dataset.productImage || "",
      universe: trigger.dataset.productUniverse || "",
      franchise: trigger.dataset.productFranchise || "",
      edition: trigger.dataset.productEdition || "",
      stock: Number(trigger.dataset.productStock || 0),
      slug: trigger.dataset.productSlug || "",
    };
    bindShoppingActions(product, trigger);
  });
  attachProductCardInteractions(wishlistGrid);
  syncHeaderCounters();
};

renderWishlist();
window.addEventListener("lootifer:state-updated", renderWishlist);
