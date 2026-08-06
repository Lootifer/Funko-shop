import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createShoppingUi, syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";
import { loadRuntimeCatalog } from "../../Products/runtime-catalog.js";
import { getValidDiscountPrice } from "../../Products/product-pricing.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");

if (headerRoot) headerRoot.innerHTML = createHeader("shop");
if (footerRoot) footerRoot.innerHTML = createFooter();

const shoppingRoot = document.createElement("div");
shoppingRoot.id = "shoppingRoot";
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });
syncHeaderCounters();
window.addEventListener("lootifer:state-updated", syncHeaderCounters);

const normalize = (value = "") => String(value).trim().toLowerCase();
const productHaystack = (product = {}) =>
  [product.brand, product.category, product.universe, product.franchise, ...(Array.isArray(product.tags) ? product.tags : [])]
    .map(normalize)
    .join(" ");

const matchesCollection = (product, key) => {
  const haystack = productHaystack(product);
  if (key === "funko") return haystack.includes("funko");
  if (key === "lego") return haystack.includes("lego");
  if (key === "pokemon") return haystack.includes("pokemon") || haystack.includes("pokémon");
  if (key === "star-wars") return haystack.includes("star wars");
  if (key === "harry-potter") return haystack.includes("harry potter");
  if (key === "sale") return getValidDiscountPrice(product) !== null;
  return false;
};

const updateCounts = (products = []) => {
  ["funko", "lego", "pokemon", "star-wars", "harry-potter", "sale"].forEach((key) => {
    const count = products.filter((product) => matchesCollection(product, key)).length;
    document.querySelectorAll(`[data-category-count="${key}"]`).forEach((element) => {
      element.textContent = String(count);
    });
  });

  document.querySelectorAll("[data-funko-count]").forEach((element) => {
    const category = normalize(element.dataset.funkoCount || "");
    const count = products.filter((product) => normalize(product.category) === category).length;
    element.textContent = String(count);
  });
};

const bindDepthTracking = () => {
  document.querySelectorAll(".depth-card, .funko-subcategory-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
  });
};

const loadCounts = async () => {
  try {
    const result = await loadRuntimeCatalog();
    updateCounts(result.products || []);
  } catch (error) {
    console.error("Winkelcategorie-aantallen konden niet worden geladen", error);
    updateCounts([]);
  }
};

bindDepthTracking();
loadCounts();

const shopTranslations = {
  en: {
    "hero.eyebrow": "Collection shop",
    "hero.title": "Find your next collectible.",
    "hero.text": "Start with a category or universe. You can then filter the matching products in one clear overview.",
    "hero.all": "View all products",
    "hero.stock": "Only in stock",
    "search.label": "Search the full collection",
    "search.placeholder": "Name, character, number or universe",
    "search.button": "Search",
    "search.note": "You will continue to the complete product overview with your search already active.",
    "category.eyebrow": "Browse by category",
    "category.title": "Choose what you collect.",
    "category.all": "All products →",
    "category.funko.kicker": "Figures, pins and more",
    "category.lego.kicker": "Build and collect",
    "category.pokemon.kicker": "For trainers and collectors",
    "category.starwars.kicker": "A galaxy far away",
    "category.harry.kicker": "The wizarding world",
    "category.sale.kicker": "Limited-time savings",
    "items": "items",
    "offers": "offers",
    "universe.eyebrow": "Browse by universe",
    "universe.title": "Go directly to your favourite world.",
    "universe.open": "Open universe →",
    "funko.eyebrow": "Funko lines",
    "funko.title": "Which Funko line are you looking for?",
    "funko.text": "Choose a line to see only the products that belong there.",
    "funko.all": "View all Funko →",
  },
  nl: {
    "hero.eyebrow": "Collectiewinkel",
    "hero.title": "Vind jouw volgende verzamelitem.",
    "hero.text": "Begin met een categorie of universum. Daarna kun je de passende producten overzichtelijk filteren.",
    "hero.all": "Bekijk alle producten",
    "hero.stock": "Alleen op voorraad",
    "search.label": "Doorzoek de volledige collectie",
    "search.placeholder": "Naam, personage, nummer of universum",
    "search.button": "Zoeken",
    "search.note": "Je gaat verder naar het complete productoverzicht met je zoekopdracht al ingevuld.",
    "category.eyebrow": "Kies op categorie",
    "category.title": "Kies wat jij verzamelt.",
    "category.all": "Alle producten →",
    "category.funko.kicker": "Figuren, pins en meer",
    "category.lego.kicker": "Bouwen en verzamelen",
    "category.pokemon.kicker": "Voor trainers en verzamelaars",
    "category.starwars.kicker": "Een sterrenstelsel ver weg",
    "category.harry.kicker": "De magische wereld",
    "category.sale.kicker": "Tijdelijk voordeliger",
    "items": "items",
    "offers": "aanbiedingen",
    "universe.eyebrow": "Kies op universum",
    "universe.title": "Ga direct naar jouw favoriete wereld.",
    "universe.open": "Open universum →",
    "funko.eyebrow": "Funko-lijnen",
    "funko.title": "Welke Funko-lijn zoek je?",
    "funko.text": "Kies een lijn om alleen de bijbehorende producten te zien.",
    "funko.all": "Alle Funko bekijken →",
  },
};

const applyShopLanguage = (language = "en") => {
  const dictionary = shopTranslations[language] || shopTranslations.en;
  document.documentElement.lang = language;
  document.querySelectorAll("[data-shop-i18n]").forEach((element) => {
    const value = dictionary[element.dataset.shopI18n];
    if (value) element.textContent = value;
  });
  document.querySelectorAll("[data-shop-placeholder]").forEach((element) => {
    const value = dictionary[element.dataset.shopPlaceholder];
    if (value) element.setAttribute("placeholder", value);
  });
};

const landingSearchForm = document.getElementById("shopLandingSearchForm");
const landingSearchInput = document.getElementById("shopLandingSearch");
landingSearchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = String(landingSearchInput?.value || "").trim();
  window.location.href = query
    ? `all-products.html?search=${encodeURIComponent(query)}`
    : "all-products.html";
});

applyShopLanguage(window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en");
window.addEventListener("lootifer:language-change", (event) => {
  applyShopLanguage(event.detail?.language || "en");
});
