import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";
import { createShoppingUi, syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";
import { formatCurrency, formatQuantity } from "./formatting.js";
import { createImageAttributes } from "../../Products/product-media.js";
import { getProductPriceLabel } from "../../Products/product-pricing.js";
import { synchronizeCartWithInventory } from "../../Components/Experience/order-inventory.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");
const cartItems = document.getElementById("cartItems");
const cartSummary = document.getElementById("cartSummary");
const cartMeta = document.getElementById("cartMeta");
const cartWarnings = document.createElement("div");
cartWarnings.className = "checkout-notice";
cartWarnings.style.display = "none";

cartMeta?.insertAdjacentElement("afterend", cartWarnings);

if (headerRoot) headerRoot.innerHTML = createHeader("cart");
if (footerRoot) footerRoot.innerHTML = createFooter();

const shoppingRoot = document.createElement("div");
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });

const renderCart = () => {
  const cart = shoppingState.getCart();
  const quantity = shoppingState.getCartQuantity();
  const subtotal = shoppingState.getCartSubtotal();

  if (cartMeta) {
    cartMeta.textContent = `${formatQuantity(quantity)} artikel${quantity === 1 ? "" : "en"}`;
  }

  if (!cartItems || !cartSummary) return;

  if (!cart.length) {
    cartItems.innerHTML = `
      <div class="card-empty">
        <h3>Je winkelwagen is leeg.</h3>
        <p>Voeg producten toe vanuit de winkel of gebruik de snelle winkelwagenknop.</p>
        <div class="cart-actions" style="justify-content: center;">
          <a class="button primary" href="shop.html">Verder winkelen</a>
        </div>
      </div>
    `;
    cartSummary.innerHTML = `
      <div class="summary-line"><span>Subtotaal</span><strong>${formatCurrency(0)}</strong></div>
      <div class="summary-total"><span>Totaal</span><strong>${formatCurrency(0)}</strong></div>
    `;
    syncHeaderCounters();
    return;
  }

  cartItems.innerHTML = `
    <div class="cart-list">
      ${cart
        .map(
          (item) => `
            <article class="cart-item">
              <div class="cart-item-image">
                <img ${createImageAttributes({ src: item.image, alt: item.name })} />
              </div>
              <div class="cart-item-body">
                <p class="card-meta">${item.universe || "Collector"}</p>
                <h3>${item.name}</h3>
                <p class="cart-item-meta">Prijs ${getProductPriceLabel(item, formatCurrency)} &middot; Totaal ${formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}</p>
                <div class="cart-item-actions">
                  <button class="quantity-btn" type="button" data-cart-decrement="${item.id}" aria-label="Verlaag aantal">&minus;</button>
                  <span class="quantity-value">${formatQuantity(item.quantity)}</span>
                  <button class="quantity-btn" type="button" data-cart-increment="${item.id}" aria-label="Verhoog aantal">+</button>
                  <button class="text-link" type="button" data-cart-remove="${item.id}">Verwijderen</button>
                </div>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;

  cartSummary.innerHTML = `
    <div class="summary-line"><span>Subtotaal</span><strong>${formatCurrency(subtotal)}</strong></div>
    <div class="summary-total"><span>Totaal</span><strong>${formatCurrency(subtotal)}</strong></div>
  `;

  syncHeaderCounters();
};

const renderWarnings = (warnings = []) => {
  if (!cartWarnings) return;
  if (!warnings.length) {
    cartWarnings.style.display = "none";
    cartWarnings.innerHTML = "";
    return;
  }

  cartWarnings.style.display = "block";
  cartWarnings.innerHTML = `<strong>Voorraad bijgewerkt:</strong><ul>${warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>`;
};

const syncAndRenderCart = async () => {
  try {
    const sync = await synchronizeCartWithInventory();
    renderWarnings(sync.warnings);
  } catch (error) {
    console.error("Cart-inventaris kon niet worden gesynchroniseerd:", error);
  }
  renderCart();
};

cartItems?.addEventListener("click", (event) => {
  const increment = event.target.closest("[data-cart-increment]");
  if (increment) {
    shoppingState.incrementCartQuantity(Number(increment.dataset.cartIncrement));
    renderCart();
    return;
  }

  const decrement = event.target.closest("[data-cart-decrement]");
  if (decrement) {
    shoppingState.decrementCartQuantity(Number(decrement.dataset.cartDecrement));
    renderCart();
    return;
  }

  const remove = event.target.closest("[data-cart-remove]");
  if (remove) {
    shoppingState.removeFromCart(Number(remove.dataset.cartRemove));
    renderCart();
  }
});

window.addEventListener("lootifer:state-updated", renderCart);
window.addEventListener("lootifer:inventory-updated", syncAndRenderCart);
syncAndRenderCart();