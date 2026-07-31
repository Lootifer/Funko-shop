export const createHeader = (active = "home") => `
  <header class="topbar">
    <a class="brand" href="index.html" aria-label="Lootifer home">
      <span class="brand-mark">L</span>
      <span>
        <strong>Lootifer</strong>
        <small>Collectibles</small>
      </span>
    </a>

    <nav class="nav-links" aria-label="Primary navigation">
      <a href="index.html" class="${active === "home" ? "active" : ""}">/</a>
      <a href="index.html" class="${active === "home" ? "active" : ""}">Home</a>
      <a href="shop.html" class="${active === "shop" ? "active" : ""}">/shop</a>
      <a href="shop.html" class="${active === "shop" ? "active" : ""}">Shop</a>
      <a href="wishlist.html" class="${active === "wishlist" ? "active" : ""}">/wishlist</a>
      <a href="wishlist.html" class="${active === "wishlist" ? "active" : ""}">Wishlist <span class="wishlist-counter" data-header-wishlist-count>0</span></a>
      <a href="about.html" class="${active === "about" ? "active" : ""}">/about</a>
      <a href="contact.html" class="${active === "contact" ? "active" : ""}">/contact</a>
    </nav>

    <a class="nav-cta" href="shop.html">Shop now</a>
  </header>
`;
