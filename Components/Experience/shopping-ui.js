import { shoppingState } from "./shopping-state.js";
import { createQuickView } from "../Collector/collector-experience.js";
import { createImageAttributes } from "../../Products/product-media.js";
import { formatCurrency, formatQuantity } from "../../Assets/Js/formatting.js";

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
  <div class="drawer-item">
    <div class="drawer-item-media">
      <img ${createImageAttributes({ src: item.image, alt: item.name })} />
    </div>
    <div class="drawer-item-body">
      <strong>${item.name}</strong>
      <p>${formatCurrency(item.price)}${type === "cart" ? ` • Aantal ${formatQuantity(item.quantity)}` : ""}</p>
      ${type === "cart" ? `
        <div class="drawer-quantity-controls">
          <button class="quantity-btn" type="button" data-cart-decrement="${item.id}" aria-label="Verlaag aantal van ${item.name}">−</button>
          <span class="quantity-value">${formatQuantity(item.quantity)}</span>
          <button class="quantity-btn" type="button" data-cart-increment="${item.id}" aria-label="Verhoog aantal van ${item.name}">+</button>
        </div>
        <button class="text-link" data-cart-remove="${item.id}">Verwijderen</button>
      ` : ""}
    </div>
  </div>
`;

const getProductFromTrigger = (trigger) => {
  const card = trigger.closest(".collectible-card");
  const source = card || trigger;
  return {
    id: Number(source.dataset.productId || trigger.dataset.productId || 0),
    name: source.dataset.productName || trigger.dataset.productName || "Collector item",
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
  document.querySelectorAll("[data-header-wishlist-count]").forEach((element) => {
    element.textContent = shoppingState.getWishlist().length;
  });
  document.querySelectorAll("[data-header-cart-count]").forEach((element) => {
    element.textContent = shoppingState.getCartQuantity();
  });
};

export const createShoppingUi = ({ root, product }) => {
  if (!root) return;

  const drawer = document.createElement("aside");
  drawer.className = "side-drawer";
  drawer.innerHTML = `
    <div class="drawer-header">
      <h3>Winkelwagen</h3>
      <button class="drawer-close" type="button">×</button>
    </div>
    <div class="drawer-tabs">
      <button class="drawer-tab active" data-view="cart">Winkelwagen</button>
      <button class="drawer-tab" data-view="wishlist">Verlanglijst</button>
      <button class="drawer-tab" data-view="compare">Vergelijken</button>
      <button class="drawer-tab" data-view="recent">Recent</button>
    </div>
    <div class="drawer-content" id="drawerContent"></div>
    <div class="drawer-actions">
      <button class="button secondary" id="notifyButton" type="button">Meld mij</button>
      <a class="button secondary" href="cart.html">Open winkelwagen</a>
      <button class="button primary" id="whatsappButton" type="button">WhatsApp afrekenen</button>
    </div>
  `;
  const trigger = document.createElement("button");
  trigger.className = "shopping-trigger";
  trigger.type = "button";
  trigger.textContent = "🛍️ Winkelwagen";
  root.appendChild(trigger);
  root.appendChild(drawer);

  const content = drawer.querySelector("#drawerContent");
  const overlay = document.createElement("div");
  overlay.className = "quick-view-overlay";
  overlay.id = "lootiferQuickViewOverlay";
  overlay.innerHTML = '<div class="quick-view-card-shell"></div>';
  document.body.appendChild(overlay);
  const tabs = drawer.querySelectorAll(".drawer-tab");
  const closeButton = drawer.querySelector(".drawer-close");
  const notifyButton = drawer.querySelector("#notifyButton");
  const whatsappButton = drawer.querySelector("#whatsappButton");
  let activeView = "cart";

  const refreshDrawer = () => {
    if (drawer.classList.contains("drawer-open")) {
      render();
    }
  };

  const openQuickView = (item) => {
    const shell = overlay.querySelector(".quick-view-card-shell");
    if (!shell) return;
    shell.innerHTML = createQuickView(item);
    shell.querySelectorAll("[data-action]").forEach((trigger) => {
      bindShoppingActions(undefined, trigger);
    });
    overlay.classList.add("open");
  };

  const closeQuickView = () => {
    overlay.classList.remove("open");
    overlay.querySelector(".quick-view-card-shell").innerHTML = "";
  };

  const render = () => {
    const cart = shoppingState.getCart();
    const wishlist = shoppingState.getWishlist();
    const compare = shoppingState.getCompare();
    const recent = shoppingState.getRecent();

    if (activeView === "cart") {
      content.innerHTML = cart.length
        ? `
          <div class="drawer-list">${cart.map((item) => createItemMarkup(item, "cart")).join("")}</div>
          <p class="drawer-summary">Subtotaal: ${formatCurrency(shoppingState.getCartSubtotal())}</p>
          <a class="button secondary drawer-link" href="cart.html">Naar volledige winkelwagen</a>
        `
        : '<p class="card-empty">Je winkelwagen is leeg.</p>';
    } else if (activeView === "wishlist") {
      content.innerHTML = wishlist.length
        ? `<div class="drawer-list">${wishlist.map((item) => createItemMarkup(item, "wishlist")).join("")}</div>`
        : '<p class="card-empty">Je verlanglijst is leeg.</p>';
    } else if (activeView === "compare") {
      content.innerHTML = compare.length
        ? `<div class="drawer-list">${compare.map((item) => createItemMarkup(item, "compare")).join("")}</div>`
        : '<p class="card-empty">Vergelijk tot drie producten.</p>';
    } else {
      content.innerHTML = recent.length
        ? `<div class="drawer-list">${recent.map((item) => createItemMarkup(item, "recent")).join("")}</div>`
        : '<p class="card-empty">Recent bekeken items verschijnen hier.</p>';
    }
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeQuickView();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeView = tab.dataset.view;
      tabs.forEach((item) => item.classList.toggle("active", item === tab));
      render();
    });
  });

  trigger.addEventListener("click", () => {
    drawer.classList.toggle("drawer-open");
    if (drawer.classList.contains("drawer-open")) {
      render();
    }
  });

  closeButton?.addEventListener("click", () => {
    drawer.classList.remove("drawer-open");
  });

  notifyButton?.addEventListener("click", () => {
    if (product) {
      shoppingState.addNotification(product);
      content.innerHTML = '<p class="card-empty">Je ontvangt een melding zodra dit item terug op voorraad is.</p>';
    }
  });

  whatsappButton?.addEventListener("click", () => {
    const cart = shoppingState.getCart();
    const message = cart.length
      ? `Hallo Lootifer! Ik wil graag bestellen: ${cart.map((item) => `${item.name} x${item.quantity}`).join(", ")}`
      : "Hallo Lootifer! Ik wil graag een bestelling plaatsen.";
    window.open(`https://wa.me/31612345678?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
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
      if (afterQuantity === beforeQuantity) {
        showShoppingFeedback("De maximale voorraad is bereikt.", "warning");
      } else {
        showShoppingFeedback("Aantal bijgewerkt.", "accent");
      }
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
    card.setAttribute("data-quick-view-enabled", "false");
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
      } else {
        showShoppingFeedback("Je hebt de maximale voorraad bereikt.", "warning");
      }
    }

    if (action === "toggle-wishlist") {
      shoppingState.toggleWishlist(payload);
      const isActive = shoppingState.isWishlisted(payload.id);
      trigger.classList.toggle("active", isActive);
      trigger.innerHTML = isActive ? "♥" : "♡";
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
        shell.innerHTML = createQuickView(payload);
        shell.querySelectorAll("[data-action]").forEach((trigger) => {
          bindShoppingActions(payload, trigger);
        });
        overlay.classList.add("open");
      }
    }
  });
};
