const STORAGE_KEYS = {
  cart: "lootifer-cart",
  wishlist: "lootifer-wishlist",
  compare: "lootifer-compare",
  recent: "lootifer-recent",
  notifications: "lootifer-notifications",
  club: "lootifer-club",
  orders: "lootifer-test-orders",
};

const emitStateChange = () => {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent("lootifer:state-updated"));
};

const readStorage = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch (error) {
    return [];
  }
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  if (key !== STORAGE_KEYS.orders) {
    emitStateChange();
  }
};

const normalizeProduct = (product) => ({
  id: product.id,
  slug: product.slug || product.name?.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  name: product.name,
  price: product.price,
  image: product.image,
  universe: product.universe,
  franchise: product.franchise,
  edition: product.edition,
  stock: product.stock,
});

export const shoppingState = {
  getCart() {
    return readStorage(STORAGE_KEYS.cart);
  },
  saveCart(items) {
    writeStorage(STORAGE_KEYS.cart, items);
  },
  clearCart() {
    this.saveCart([]);
    return [];
  },
  getCartQuantity() {
    return this.getCart().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  },
  getCartSubtotal() {
    return this.getCart().reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  },
  addToCart(product) {
    const current = this.getCart();
    const normalized = normalizeProduct(product);
    const existing = current.find((item) => item.id === normalized.id);

    if ((Number(normalized.stock) || 0) <= 0) {
      return { items: current, added: false, reason: "out-of-stock" };
    }

    const currentQuantity = existing ? Number(existing.quantity) || 0 : 0;
    if (currentQuantity >= (Number(normalized.stock) || 0)) {
      return { items: current, added: false, reason: "max-stock" };
    }

    if (existing) {
      existing.quantity += 1;
    } else {
      current.push({ ...normalized, quantity: 1 });
    }
    this.saveCart(current);
    return { items: current, added: true };
  },
  removeFromCart(productId) {
    const next = this.getCart().filter((item) => item.id !== productId);
    this.saveCart(next);
    return next;
  },
  updateCartQuantity(productId, quantity) {
    const next = this.getCart()
      .map((item) => {
        if (item.id !== productId) return item;
        const maxQuantity = Number(item.stock) || Number(quantity) || 0;
        const nextQuantity = Math.max(0, Math.min(Number(quantity) || 0, maxQuantity || Number(quantity) || 0));
        return { ...item, quantity: nextQuantity };
      })
      .filter((item) => item.quantity > 0);
    this.saveCart(next);
    return next;
  },
  incrementCartQuantity(productId) {
    const item = this.getCart().find((entry) => entry.id === productId);
    if (!item) return this.getCart();
    return this.updateCartQuantity(productId, (Number(item.quantity) || 0) + 1);
  },
  decrementCartQuantity(productId) {
    const item = this.getCart().find((entry) => entry.id === productId);
    if (!item) return this.getCart();
    return this.updateCartQuantity(productId, (Number(item.quantity) || 0) - 1);
  },
  getWishlist() {
    return readStorage(STORAGE_KEYS.wishlist);
  },
  saveWishlist(items) {
    writeStorage(STORAGE_KEYS.wishlist, items);
  },
  isWishlisted(productId) {
    return this.getWishlist().some((item) => item.id === productId);
  },
  toggleWishlist(product) {
    const normalized = normalizeProduct(product);
    const current = this.getWishlist();
    const next = current.some((item) => item.id === normalized.id)
      ? current.filter((item) => item.id !== normalized.id)
      : [...current, normalized];
    this.saveWishlist(next);
    return next;
  },
  getCompare() {
    return readStorage(STORAGE_KEYS.compare);
  },
  saveCompare(items) {
    writeStorage(STORAGE_KEYS.compare, items);
  },
  toggleCompare(product) {
    const normalized = normalizeProduct(product);
    const current = this.getCompare();
    const next = current.some((item) => item.id === normalized.id)
      ? current.filter((item) => item.id !== normalized.id)
      : [...current, normalized].slice(0, 3);
    this.saveCompare(next);
    return next;
  },
  getRecent() {
    return readStorage(STORAGE_KEYS.recent);
  },
  saveRecent(items) {
    writeStorage(STORAGE_KEYS.recent, items);
  },
  addRecent(product) {
    const normalized = normalizeProduct(product);
    const current = this.getRecent().filter((item) => item.id !== normalized.id);
    const next = [normalized, ...current].slice(0, 6);
    this.saveRecent(next);
    return next;
  },
  getNotifications() {
    return readStorage(STORAGE_KEYS.notifications);
  },
  saveNotifications(items) {
    writeStorage(STORAGE_KEYS.notifications, items);
  },
  addNotification(product) {
    const next = [{ id: Date.now(), product: normalizeProduct(product), createdAt: new Date().toISOString() }, ...this.getNotifications()].slice(0, 6);
    this.saveNotifications(next);
    return next;
  },
  subscribeToClub(email) {
    const current = readStorage(STORAGE_KEYS.club);
    const next = [...current, { email, createdAt: new Date().toISOString() }];
    writeStorage(STORAGE_KEYS.club, next);
    return next;
  },
  getOrders() {
    return readStorage(STORAGE_KEYS.orders);
  },
  saveOrders(orders) {
    writeStorage(STORAGE_KEYS.orders, orders);
  },
  addOrder(order) {
    const next = [order, ...this.getOrders()];
    this.saveOrders(next);
    return next;
  },
};
