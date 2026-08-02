export const createHeader = (active = "home") => `
  <header class="topbar">
    <a class="brand" href="index.html" aria-label="Lootifer startpagina">
      <span class="brand-mark">L</span>
      <span>
        <strong>Lootifer</strong>
        <small>Collectibles</small>
      </span>
    </a>

    <nav class="nav-links" aria-label="Primary navigation">
      <a href="index.html" class="${active === "home" ? "active" : ""}">Start</a>
      <a href="shop.html" class="${active === "shop" ? "active" : ""}">Winkel</a>
      <a href="wishlist.html" class="${active === "wishlist" ? "active" : ""}">Verlanglijst <span class="wishlist-counter" data-header-wishlist-count>0</span></a>
      <a href="cart.html" class="${active === "cart" ? "active" : ""}">Winkelwagen <span class="wishlist-counter cart-counter" data-header-cart-count>0</span></a>
      <a href="checkout.html" class="${active === "checkout" ? "active" : ""}">Afrekenen</a>
      <a href="about.html" class="${active === "about" ? "active" : ""}">Over ons</a>
      <a href="contact.html" class="${active === "contact" ? "active" : ""}">Contact</a>
    </nav>

    <a class="nav-cta" href="cart.html">Bekijk winkelwagen</a>
  </header>
`;
