import { shoppingState } from "./shopping-state.js";
import { createQuickView } from "../Collector/collector-experience.js";
import { createImageAttributes } from "../../Products/product-media.js";
import { formatCurrency, formatQuantity } from "../../Assets/Js/formatting.js";
import { getProductPriceLabel } from "../../Products/product-pricing.js";
import { getLootiferWhatsAppUrl } from "../../Assets/Js/store-config.js";
import { calculateOrderTotals } from "../../Shared/shipping.js";

let shoppingFeedback = null;
let shoppingFeedbackTimer = null;

const showShoppingFeedback = (message, tone = "accent") => {
  if (!shoppingFeedback) {
    shoppingFeedback = document.createElement("div");
    shoppingFeedback.className = "shopping-feedback";
    shoppingFeedback.setAttribute("role", "status");
    shoppingFeedback.setAttribute("aria-live", "polite");
    document.body.appendChild(shoppingFeedback);
  }

  shoppingFeedback.textContent = message;
  shoppingFeedback.dataset.tone = tone;
  shoppingFeedback.classList.add("visible");

  if (shoppingFeedbackTimer) window.clearTimeout(shoppingFeedbackTimer);
  shoppingFeedbackTimer = window.setTimeout(() => {
    shoppingFeedback?.classList.remove("visible");
  }, 2200);
};

const createItemMarkup = (item, type) => `
  <article class="drawer-item">
    <div class="drawer-item-media">
      <img ${createImageAttributes({ src: item.image, alt: item.name })} />
    </div>
    <div class="drawer-item-body">
      <strong>${item.name}</strong>
      <p class="drawer-item-meta">
        ${getProductPriceLabel(item, formatCurrency)}
        ${type === "cart" ? `<span aria-hidden="true">&bull;</span> Aantal ${formatQuantity(item.quantity)}` : ""}
      </p>
      ${type === "cart" ? `
        <div class="drawer-item-controls">
          <div class="drawer-quantity-controls" aria-label="Aantal aanpassen">
            <button class="quantity-btn" type="button" data-cart-decrement="${item.id}" aria-label="Verlaag aantal van ${item.name}">&minus;</button>
            <span class="quantity-value">${formatQuantity(item.quantity)}</span>
            <button class="quantity-btn" type="button" data-cart-increment="${item.id}" aria-label="Verhoog aantal van ${item.name}">+</button>
          </div>
          <button class="text-link" type="button" data-cart-remove="${item.id}">Verwijderen</button>
        </div>
      ` : ""}
    </div>
  </article>
`;

const getProductFromTrigger = (trigger) => {
  const card = trigger.closest(".collectible-card");
  const source = card || trigger;
  return {
    id: Number(source.dataset.productId || trigger.dataset.productId || 0),
    name: source.dataset.productName || trigger.dataset.productName || "Collectible",
    price: Number(source.dataset.productPrice || trigger.dataset.productPrice || 0),
    image: source.dataset.productImage || trigger.dataset.productImage || "",
    universe: source.dataset.productUniverse || trigger.dataset.productUniverse || "",
    franchise: source.dataset.productFranchise || trigger.dataset.productFranchise || "",
    edition: source.dataset.productEdition || trigger.dataset.productEdition || "",
    stock: Number(source.dataset.productStock || trigger.dataset.productStock || 0),
    slug: source.dataset.productSlug || trigger.dataset.productSlug || "",
  };
};

export const syncHeaderCounters = () => {
  const wishlistQuantity = shoppingState.getWishlist().length;
  const cartQuantity = shoppingState.getCartQuantity();

  document.querySelectorAll("[data-header-wishlist-count]").forEach((element) => {
    element.textContent = wishlistQuantity;
  });

  document.querySelectorAll("[data-header-cart-count]").forEach((element) => {
    element.textContent = cartQuantity;
  });

  document.querySelectorAll("[data-shopping-trigger-count]").forEach((element) => {
    element.textContent = cartQuantity;
    element.classList.toggle("is-empty", cartQuantity <= 0);
  });
};

export const createShoppingUi = ({ root } = {}) => {
  if (!root) return;

  const backdrop = document.createElement("button");
  backdrop.className = "drawer-backdrop";
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "Winkelwagen sluiten");
  backdrop.tabIndex = -1;

  const drawer = document.createElement("aside");
  drawer.className = "side-drawer";
  drawer.id = "lootiferShoppingDrawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-hidden", "true");
  drawer.setAttribute("aria-labelledby", "shoppingDrawerTitle");
  drawer.innerHTML = `
    <div class="drawer-header">
      <div>
        <p class="drawer-eyebrow">2nd Life Toys</p>
        <h3 id="shoppingDrawerTitle">Winkelwagen</h3>
      </div>
      <button class="drawer-close" type="button" aria-label="Winkelwagen sluiten">&times;</button>
    </div>
    <div class="drawer-tabs" role="tablist" aria-label="Winkeloverzicht">
      <button class="drawer-tab active" type="button" role="tab" aria-selected="true" data-view="cart">Winkelwagen</button>
      <button class="drawer-tab" type="button" role="tab" aria-selected="false" data-view="wishlist">Verlanglijst</button>
      <button class="drawer-tab" type="button" role="tab" aria-selected="false" data-view="compare">Vergelijken</button>
      <button class="drawer-tab" type="button" role="tab" aria-selected="false" data-view="recent">Recent bekeken</button>
    </div>
    <div class="drawer-content" id="drawerContent"></div>
    <div class="drawer-actions">
      <a class="button primary drawer-primary-action" id="drawerPrimaryAction" href="checkout.html">Naar afrekenen</a>
      <a class="button secondary drawer-secondary-action" id="drawerSecondaryAction" href="cart.html">Volledige winkelwagen</a>
      <button class="button secondary drawer-whatsapp-action" id="whatsappButton" type="button">WhatsApp</button>
    </div>
  `;

  const trigger = document.createElement("button");
  trigger.className = "shopping-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Winkelwagen openen");
  trigger.setAttribute("aria-controls", drawer.id);
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 3h2l2.15 9.75a2 2 0 0 0 1.95 1.57h7.72a2 2 0 0 0 1.95-1.57L20.35 7H6.1"></path>
      <circle cx="10" cy="19" r="1.5"></circle>
      <circle cx="17" cy="19" r="1.5"></circle>
    </svg>
    <span class="shopping-trigger-count" data-shopping-trigger-count>${shoppingState.getCartQuantity()}</span>
  `;

  root.appendChild(backdrop);
  root.appendChild(trigger);
  root.appendChild(drawer);

  const content = drawer.querySelector("#drawerContent");
  const tabs = drawer.querySelectorAll(".drawer-tab");
  const closeButton = drawer.querySelector(".drawer-close");
  const drawerTitle = drawer.querySelector("#shoppingDrawerTitle");
  const primaryAction = drawer.querySelector("#drawerPrimaryAction");
  const secondaryAction = drawer.querySelector("#drawerSecondaryAction");
  const whatsappButton = drawer.querySelector("#whatsappButton");

  const overlay = document.createElement("div");
  overlay.className = "quick-view-overlay";
  overlay.id = "lootiferQuickViewOverlay";
  overlay.innerHTML = '<div class="quick-view-card-shell"></div>';
  document.body.appendChild(overlay);

  let activeView = "cart";

  const setDrawerOpen = (open) => {
    drawer.classList.toggle("drawer-open", open);
    backdrop.classList.toggle("drawer-backdrop-open", open);
    trigger.setAttribute("aria-expanded", String(open));
    drawer.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("shopping-drawer-open", open);

    if (open) {
      render();
      window.setTimeout(() => closeButton?.focus(), 50);
    }
  };

  const refreshDrawer = () => {
    if (drawer.classList.contains("drawer-open")) render();
  };

  const closeQuickView = () => {
    overlay.classList.remove("open");
    const shell = overlay.querySelector(".quick-view-card-shell");
    if (shell) shell.innerHTML = "";
  };

  const updateDrawerActions = (cartLength) => {
    const isCart = activeView === "cart";
    const isWishlist = activeView === "wishlist";

    if (primaryAction) {
      primaryAction.hidden = !isCart || cartLength <= 0;
    }

    if (whatsappButton) {
      whatsappButton.hidden = !isCart || cartLength <= 0;
    }

    if (secondaryAction) {
      if (isCart) {
        secondaryAction.href = "cart.html";
        secondaryAction.textContent = "Volledige winkelwagen";
      } else if (isWishlist) {
        secondaryAction.href = "wishlist.html";
        secondaryAction.textContent = "Open verlanglijst";
      } else {
        secondaryAction.href = "shop.html";
        secondaryAction.textContent = "Naar de winkel";
      }
    }

    const visibleActionCount = [primaryAction, secondaryAction, whatsappButton]
      .filter((element) => element && !element.hidden)
      .length;
    drawer.querySelector(".drawer-actions")?.classList.toggle("single-action", visibleActionCount === 1);
  };

  const render = () => {
    const cart = shoppingState.getCart();
    const wishlist = shoppingState.getWishlist();
    const compare = shoppingState.getCompare();
    const recent = shoppingState.getRecent();

    if (activeView === "cart") {
      if (drawerTitle) drawerTitle.textContent = "Winkelwagen";
      content.innerHTML = cart.length
        ? `
          <div class="drawer-list">${cart.map((item) => createItemMarkup(item, "cart")).join("")}</div>
          ${(() => {
            const totals = calculateOrderTotals(shoppingState.getCartSubtotal());
            return `
              <div class="drawer-summary"><span>Subtotaal</span><strong>${formatCurrency(totals.subtotal)}</strong></div>
              <div class="drawer-summary"><span>Verzending</span><strong>${totals.hasFreeShipping ? "Gratis" : formatCurrency(totals.shippingCost)}</strong></div>
              <div class="drawer-summary drawer-summary-total"><span>Totaal</span><strong>${formatCurrency(totals.total)}</strong></div>
            `;
          })()}
        `
        : `
          <div class="drawer-empty-state">
            <strong>Je winkelwagen is leeg.</strong>
            <p>Voeg een product toe vanuit de winkel.</p>
          </div>
        `;
    } else if (activeView === "wishlist") {
      if (drawerTitle) drawerTitle.textContent = "Verlanglijst";
      content.innerHTML = wishlist.length
        ? `<div class="drawer-list">${wishlist.map((item) => createItemMarkup(item, "wishlist")).join("")}</div>`
        : '<div class="drawer-empty-state"><strong>Je verlanglijst is leeg.</strong><p>Sla een product op met het hartje.</p></div>';
    } else if (activeView === "compare") {
      if (drawerTitle) drawerTitle.textContent = "Vergelijken";
      content.innerHTML = compare.length
        ? `<div class="drawer-list">${compare.map((item) => createItemMarkup(item, "compare")).join("")}</div>`
        : '<div class="drawer-empty-state"><strong>Nog niets om te vergelijken.</strong><p>Voeg maximaal drie producten toe.</p></div>';
    } else {
      if (drawerTitle) drawerTitle.textContent = "Recent bekeken";
      content.innerHTML = recent.length
        ? `<div class="drawer-list">${recent.map((item) => createItemMarkup(item, "recent")).join("")}</div>`
        : '<div class="drawer-empty-state"><strong>Nog geen recente producten.</strong><p>Bekeken items verschijnen hier.</p></div>';
    }

    updateDrawerActions(cart.length);
    syncHeaderCounters();
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeQuickView();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeView = tab.dataset.view || "cart";
      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });
      render();
    });
  });

  trigger.addEventListener("click", () => setDrawerOpen(true));
  closeButton?.addEventListener("click", () => setDrawerOpen(false));
  backdrop.addEventListener("click", () => setDrawerOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("drawer-open")) {
      setDrawerOpen(false);
      trigger.focus();
    }
  });

  whatsappButton?.addEventListener("click", () => {
    const cart = shoppingState.getCart();
    const totals = calculateOrderTotals(shoppingState.getCartSubtotal());
    const message = cart.length
      ? `Hallo Lootifer! Ik heb interesse in: ${cart.map((item) => `${item.name} x${item.quantity}`).join(", ")}. Totaal inclusief verzending: ${formatCurrency(totals.total)}.`
      : "Hallo Lootifer! Ik wil graag een bestelling plaatsen.";
    window.open(getLootiferWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  });

  content.addEventListener("click", (event) => {
    const incrementButton = event.target.closest("[data-cart-increment]");
    if (incrementButton) {
      const productId = Number(incrementButton.dataset.cartIncrement);
      const beforeItem = shoppingState.getCart().find((item) => item.id === productId);
      const beforeQuantity = Number(beforeItem?.quantity) || 0;
      shoppingState.incrementCartQuantity(productId);
      const afterItem = shoppingState.getCart().find((item) => item.id === productId);
      const afterQuantity = Number(afterItem?.quantity) || 0;
      showShoppingFeedback(
        afterQuantity === beforeQuantity ? "De maximale voorraad is bereikt." : "Aantal bijgewerkt.",
        afterQuantity === beforeQuantity ? "warning" : "accent"
      );
      render();
      return;
    }

    const decrementButton = event.target.closest("[data-cart-decrement]");
    if (decrementButton) {
      shoppingState.decrementCartQuantity(Number(decrementButton.dataset.cartDecrement));
      showShoppingFeedback("Aantal bijgewerkt.", "accent");
      render();
      return;
    }

    const removeButton = event.target.closest("[data-cart-remove]");
    if (removeButton) {
      shoppingState.removeFromCart(Number(removeButton.dataset.cartRemove));
      showShoppingFeedback("Product uit de winkelwagen verwijderd.", "accent");
      render();
    }
  });

  window.addEventListener("lootifer:state-updated", () => {
    syncHeaderCounters();
    refreshDrawer();
  });

  syncHeaderCounters();
  render();
};

export const attachProductCardInteractions = (container = document) => {
  if (!container) return;
  container.querySelectorAll(".collectible-card").forEach((card) => {
    card.setAttribute("data-quick-view-enabled", "true");
  });
};

export const bindShoppingActions = (product, trigger) => {
  if (!trigger) return;

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    const action = trigger.dataset.action;
    const payload = product || getProductFromTrigger(trigger);
    if (!payload) return;

    if (action === "add-to-cart") {
      const result = shoppingState.addToCart(payload);
      if (result.added) {
        trigger.textContent = "Toegevoegd";
        showShoppingFeedback("Toegevoegd aan winkelwagen.", "accent");
        setTimeout(() => {
          if (trigger.dataset.action === "add-to-cart") {
            trigger.textContent = "In winkelwagen";
          }
        }, 1200);
      } else if (result.reason === "out-of-stock") {
        showShoppingFeedback("Dit product is niet op voorraad.", "warning");
      } else if (result.reason === "price-on-request") {
        showShoppingFeedback("Prijs op aanvraag. Neem contact op voor dit item.", "warning");
      } else {
        showShoppingFeedback("Je hebt de maximale voorraad bereikt.", "warning");
      }
    }

    if (action === "toggle-wishlist") {
      shoppingState.toggleWishlist(payload);
      const isActive = shoppingState.isWishlisted(payload.id);
      trigger.classList.toggle("active", isActive);
      trigger.innerHTML = isActive ? "&#9829;" : "&#9825;";
      showShoppingFeedback(isActive ? "Toegevoegd aan verlanglijst." : "Verwijderd uit verlanglijst.", "accent");
    }

    if (action === "toggle-compare") {
      shoppingState.toggleCompare(payload);
      trigger.textContent = trigger.textContent === "Vergelijken" ? "Toegevoegd" : "Vergelijken";
      showShoppingFeedback("Vergelijking bijgewerkt.", "accent");
    }

    if (action === "view-recent") {
      shoppingState.addRecent(payload);
    }

    if (action === "notify-stock") {
      shoppingState.addNotification(payload);
      trigger.textContent = "Gemeld";
      setTimeout(() => {
        trigger.textContent = "Meld mij";
      }, 1200);
    }

    if (action === "quick-view") {
      const overlay = document.getElementById("lootiferQuickViewOverlay");
      if (overlay) {
        const shell = overlay.querySelector(".quick-view-card-shell");
        if (!shell) return;
        shell.innerHTML = createQuickView(payload);
        shell.querySelectorAll("[data-action]").forEach((actionTrigger) => {
          bindShoppingActions(payload, actionTrigger);
        });
        overlay.classList.add("open");
      }
    }
  });
};