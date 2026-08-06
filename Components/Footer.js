const footerCopy = {
  en: {
    intro: "From my private collection to yours. Many items are available only once.",
    private: "Private sale • no physical shop",
    collection: "Collection",
    all: "All products",
    wishlist: "Wishlist",
    cart: "Cart",
    service: "Customer service",
    contact: "Contact",
    checkout: "Checkout",
    terms: "Terms",
    lootifer: "Lootifer",
    about: "About",
    collections: "Collections",
    once: "Once it is gone, it is gone",
    built: "Carefully built for collectors.",
  },
  nl: {
    intro: "Van mijn privécollectie naar die van jou. Veel items zijn maar één keer beschikbaar.",
    private: "Particuliere verkoop • geen fysieke winkel",
    collection: "Collectie",
    all: "Alle producten",
    wishlist: "Verlanglijst",
    cart: "Winkelwagen",
    service: "Klantenservice",
    contact: "Contact",
    checkout: "Afrekenen",
    terms: "Voorwaarden",
    lootifer: "Lootifer",
    about: "Over ons",
    collections: "Collecties",
    once: "Op is op",
    built: "Met zorg gebouwd voor verzamelaars.",
  },
};

const getLanguage = () => {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en";
};

const updateFooterLanguage = (language = getLanguage()) => {
  if (typeof document === "undefined") return;
  const dictionary = footerCopy[language] || footerCopy.en;
  document.querySelectorAll("[data-footer-copy]").forEach((element) => {
    const value = dictionary[element.dataset.footerCopy];
    if (value) element.textContent = value;
  });
};

if (typeof window !== "undefined") {
  window.addEventListener("lootifer:language-change", (event) => {
    updateFooterLanguage(event.detail?.language || "en");
  });
}

export const createFooter = () => {
  const copy = footerCopy[getLanguage()] || footerCopy.en;
  if (typeof queueMicrotask === "function") queueMicrotask(() => updateFooterLanguage());

  return `
    <footer id="footer" class="footer premium-footer reveal">
      <div class="footer-brand-block">
        <a class="brand footer-brand" href="index.html" aria-label="Lootifer home">
          <span class="brand-mark brand-mark-angular" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <path d="M11 8v30h27" />
              <path d="M18 8v21L38 9" />
              <path d="M18 29h12" />
            </svg>
          </span>
          <span class="brand-wordmark">
            <strong>Lootifer</strong>
            <small>Collectibles</small>
          </span>
        </a>
        <p data-footer-copy="intro">${copy.intro}</p>
        <span class="footer-private-label" data-footer-copy="private">${copy.private}</span>
      </div>

      <div class="footer-column">
        <h3 data-footer-copy="collection">${copy.collection}</h3>
        <a href="all-products.html" data-footer-copy="all">${copy.all}</a>
        <a href="wishlist.html" data-footer-copy="wishlist">${copy.wishlist}</a>
        <a href="cart.html" data-footer-copy="cart">${copy.cart}</a>
      </div>

      <div class="footer-column">
        <h3 data-footer-copy="service">${copy.service}</h3>
        <a href="contact.html" data-footer-copy="contact">${copy.contact}</a>
        <a href="checkout.html" data-footer-copy="checkout">${copy.checkout}</a>
        <a href="terms.html" data-footer-copy="terms">${copy.terms}</a>
      </div>

      <div class="footer-column">
        <h3 data-footer-copy="lootifer">${copy.lootifer}</h3>
        <a href="about.html" data-footer-copy="about">${copy.about}</a>
        <a href="index.html#categories" data-footer-copy="collections">${copy.collections}</a>
        <a href="shop.html" data-footer-copy="once">${copy.once}</a>
      </div>

      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Lootifer Collectibles</span>
        <span data-footer-copy="built">${copy.built}</span>
      </div>
    </footer>
  `;
};
