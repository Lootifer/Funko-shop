import { shoppingState } from "./shopping-state.js";
import { createQuickView } from "../Collector/collector-experience.js";

const createItemMarkup = (item, type) => `
  <div class="drawer-item">
    <div class="drawer-item-media">
      <img src="${item.image || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80"}" alt="${item.name}" />
    </div>
    <div class="drawer-item-body">
      <strong>${item.name}</strong>
      <p>${type === "cart" ? `$${item.price} • Qty ${item.quantity}` : `$${item.price}`}</p>
      ${type === "cart" ? `<button class="text-link" data-cart-remove="${item.id}">Remove</button>` : ""}
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
    element.textContent = shoppingState.getCart().length;
  });
};

export const createShoppingUi = ({ root, product }) => {
  if (!root) return;

  const drawer = document.createElement("aside");
  drawer.className = "side-drawer";
  drawer.innerHTML = `
    <div class="drawer-header">
      <h3>Shopping Experience</h3>
      <button class="drawer-close" type="button">×</button>
    </div>
    <div class="drawer-tabs">
      <button class="drawer-tab active" data-view="cart">Cart</button>
      <button class="drawer-tab" data-view="wishlist">Wishlist</button>
      <button class="drawer-tab" data-view="compare">Compare</button>
      <button class="drawer-tab" data-view="recent">Recent</button>
    </div>
    <div class="drawer-content" id="drawerContent"></div>
    <div class="drawer-actions">
      <button class="button secondary" id="notifyButton" type="button">Notify me</button>
      <button class="button primary" id="whatsappButton" type="button">WhatsApp checkout</button>
    </div>
  `;
  const trigger = document.createElement("button");
  trigger.className = "shopping-trigger";
  trigger.type = "button";
  trigger.textContent = "🛍️ Cart";
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
          <p class="drawer-summary">Subtotal: $${cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}</p>
        `
        : '<p class="card-empty">Your cart is empty.</p>';
    } else if (activeView === "wishlist") {
      content.innerHTML = wishlist.length
        ? `<div class="drawer-list">${wishlist.map((item) => createItemMarkup(item, "wishlist")).join("")}</div>`
        : '<p class="card-empty">Your wishlist is empty.</p>';
    } else if (activeView === "compare") {
      content.innerHTML = compare.length
        ? `<div class="drawer-list">${compare.map((item) => createItemMarkup(item, "compare")).join("")}</div>`
        : '<p class="card-empty">Compare up to three products.</p>';
    } else {
      content.innerHTML = recent.length
        ? `<div class="drawer-list">${recent.map((item) => createItemMarkup(item, "recent")).join("")}</div>`
        : '<p class="card-empty">Recently viewed items will appear here.</p>';
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
      content.innerHTML = '<p class="card-empty">You will be notified when this item is back in stock.</p>';
    }
  });

  whatsappButton?.addEventListener("click", () => {
    const cart = shoppingState.getCart();
    const message = cart.length
      ? `Hello Lootifer! I would like to order: ${cart.map((item) => `${item.name} x${item.quantity}`).join(", ")}`
      : "Hello Lootifer! I would like to place an order.";
    window.open(`https://wa.me/31612345678?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  });

  content.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-cart-remove]");
    if (removeButton) {
      shoppingState.removeFromCart(Number(removeButton.dataset.cartRemove));
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
    card.addEventListener("mouseenter", () => {
      const item = getProductFromTrigger(card);
      if (item.id) {
        const overlay = document.getElementById("lootiferQuickViewOverlay");
        if (overlay) {
          const shell = overlay.querySelector(".quick-view-card-shell");
          shell.innerHTML = createQuickView(item);
          shell.querySelectorAll("[data-action]").forEach((trigger) => {
            bindShoppingActions(item, trigger);
          });
          overlay.classList.add("open");
        }
      }
    });

    card.addEventListener("mouseleave", () => {
      const overlay = document.getElementById("lootiferQuickViewOverlay");
      if (overlay) {
        overlay.classList.remove("open");
        overlay.querySelector(".quick-view-card-shell").innerHTML = "";
      }
    });
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
      shoppingState.addToCart(payload);
      trigger.textContent = "Added";
      setTimeout(() => {
        if (trigger.dataset.action === "add-to-cart") {
          trigger.textContent = "Add to cart";
        }
      }, 1200);
    }

    if (action === "toggle-wishlist") {
      shoppingState.toggleWishlist(payload);
      const isActive = shoppingState.isWishlisted(payload.id);
      trigger.classList.toggle("active", isActive);
      trigger.innerHTML = isActive ? "♥" : "♡";
    }

    if (action === "toggle-compare") {
      shoppingState.toggleCompare(payload);
      trigger.textContent = trigger.textContent === "Compare" ? "Compared" : "Compare";
    }

    if (action === "view-recent") {
      shoppingState.addRecent(payload);
    }

    if (action === "notify-stock") {
      shoppingState.addNotification(payload);
      trigger.textContent = "Notified";
      setTimeout(() => {
        trigger.textContent = "Notify me";
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

    window.dispatchEvent(new CustomEvent("lootifer:state-updated"));
  });
};
