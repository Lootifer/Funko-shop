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
    built: "Met zorg gebouwd voor verzamelaars.",
  },
};

const getLanguage = () => {
  if (typeof window === "undefined") return "nl";
  return window.localStorage.getItem("lootifer-language") === "en" ? "en" : "nl";
};

const updateFooterLanguage = (language = getLanguage()) => {
  if (typeof document === "undefined") return;
  const dictionary = footerCopy[language] || footerCopy.nl;
  document.querySelectorAll("[data-footer-copy]").forEach((element) => {
    const value = dictionary[element.dataset.footerCopy];
    if (value) element.textContent = value;
  });
};

if (typeof window !== "undefined") {
  window.addEventListener("lootifer:language-change", (event) => {
    updateFooterLanguage(event.detail?.language || "nl");
  });
}

export const createFooter = () => {
  const copy = footerCopy[getLanguage()] || footerCopy.nl;
  if (typeof queueMicrotask === "function") queueMicrotask(() => updateFooterLanguage());

  return `
    <footer id="footer" class="footer premium-footer reveal v45-footer">
      <div class="footer-brand-block">
        <a class="brand footer-brand v45-footer-brand" href="index.html" aria-label="2nd Life Toys home">
          <img class="footer-brand-logo" src="Assets/Images/Brand/2nd-life-toys-logo.png" alt="2nd Life Toys" />
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

        <a href="mailto:info@2ndlifetoys.nl">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="vertical-align:-3px;margin-right:8px;">
            <rect x="3" y="5" width="18" height="14" rx="2"></rect>
            <path d="m3 7 9 6 9-6"></path>
          </svg>
          info@2ndlifetoys.nl
        </a>

        <a href="https://www.instagram.com/2nd_life_toys.nl/" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="vertical-align:-3px;margin-right:8px;">
            <rect x="3" y="3" width="18" height="18" rx="5"></rect>
            <circle cx="12" cy="12" r="4"></circle>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"></circle>
          </svg>
          @2nd_life_toys.nl
        </a>
      </div>

      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} 2nd Life Toys</span>
        <span data-footer-copy="built">${copy.built}</span>
        <a class="footer-admin-link" href="admin/login.html" aria-label="Admin login">Admin</a>
      </div>
    </footer>
  `;
};
