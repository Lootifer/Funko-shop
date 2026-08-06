import { normalizeProductCatalog } from "../../Products/product-schema.js";
import { createProductCard } from "../../Components/ProductCard.js";
import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createFilterSidebar } from "../../Components/FilterSidebar.js";
import { createShoppingUi, bindShoppingActions, attachProductCardInteractions, syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";
import { attachPremiumFallback } from "../../Products/product-media.js";
import { formatCurrency } from "./formatting.js";
import { getDisplayPrice, hasValidSellingPrice } from "../../Products/product-pricing.js";
import { loadRuntimeCatalog } from "../../Products/runtime-catalog.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");
const filtersRoot = document.getElementById("filtersRoot");
const shopGrid = document.getElementById("shopGrid");
const shopCount = document.getElementById("shopCount");
const shopActiveFilters = document.getElementById("shopActiveFilters");
const shopPagination = document.getElementById("shopPagination");
let shopSearch = null;
let shopCategory = null;
let shopUniverse = null;
let shopBrand = null;
let shopPrice = null;
let shopPriceValue = null;
let shopExclusive = null;
let shopChase = null;
let shopVaulted = null;
let shopInStock = null;
let shopSort = null;


const getShopLanguage = () => window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en";
const shopCopy = () => getShopLanguage() === "nl"
  ? { products: "producten gevonden", product: "product gevonden", active: "Actieve filters", none: "geen", search: "Zoekterm", category: "Categorie", universe: "Universum", brand: "Merk", price: "Prijs", exclusive: "Exclusief", chase: "Chase", vaulted: "Gewaardeerd", stock: "Op voorraad", until: "Tot", empty: "Er passen geen verzamelitems bij de huidige filters.", emptyCurated: "Er zijn nog geen verzamelitems aan deze collectie toegevoegd.", unavailable: "De productcatalogus is momenteel niet beschikbaar.", loading: "Producten worden geladen…" }
  : { products: "products found", product: "product found", active: "Active filters", none: "none", search: "Search", category: "Category", universe: "Universe", brand: "Brand", price: "Price", exclusive: "Exclusive", chase: "Chase", vaulted: "Vaulted", stock: "In stock", until: "Up to", empty: "No collectibles match the current filters.", emptyCurated: "No collectibles have been added to this collection yet.", unavailable: "The product catalogue is currently unavailable.", loading: "Products are loading…" };


const SHOP_PAGE_COPY = {
  en: {
    all: { eyebrow: "All products", title: "Search the complete vault.", text: "Use the filters to browse every available collectible." },
    funko: { eyebrow: "Funko", title: "All Funko lines together.", text: "From Movies and Television to Heroes, Games, Pins, Bitty Pop and Tee." },
    lego: { eyebrow: "LEGO", title: "Build, play and collect.", text: "Discover LEGO collectibles from the private collection." },
    pokemon: { eyebrow: "Pokémon", title: "For trainers and collectors.", text: "Discover Pokémon collectibles from the private collection." },
    "star-wars": { eyebrow: "Star Wars", title: "From a galaxy far, far away.", text: "Discover Star Wars collectibles from the private collection." },
    "harry-potter": { eyebrow: "Harry Potter", title: "A magical collection.", text: "Discover Harry Potter collectibles from the private collection." },
    sale: { eyebrow: "Sale", title: "Collectibles at a lower price.", text: "Browse products with a valid reduced price." },
    sort: ["Newest", "Price low to high", "Price high to low", "Alphabetical"],
    backFunko: "← Back to all Funko lines",
  },
  nl: {
    all: { eyebrow: "Alle producten", title: "Doorzoek de volledige kluis.", text: "Gebruik de filters om alle beschikbare verzamelitems te doorzoeken." },
    funko: { eyebrow: "Funko", title: "Alle Funko-lijnen bij elkaar.", text: "Van Movies en Television tot Heroes, Games, Pins, Bitty Pop en Tee." },
    lego: { eyebrow: "LEGO", title: "Bouwen, spelen en verzamelen.", text: "Ontdek LEGO-verzamelstukken uit de privécollectie." },
    pokemon: { eyebrow: "Pokémon", title: "Voor trainers en verzamelaars.", text: "Ontdek Pokémon-verzamelstukken uit de privécollectie." },
    "star-wars": { eyebrow: "Star Wars", title: "Uit een sterrenstelsel ver, ver weg.", text: "Ontdek Star Wars-verzamelstukken uit de privécollectie." },
    "harry-potter": { eyebrow: "Harry Potter", title: "Een magische verzameling.", text: "Ontdek Harry Potter-verzamelstukken uit de privécollectie." },
    sale: { eyebrow: "Sale", title: "Verzamelitems voor een lagere prijs.", text: "Bekijk producten met een geldige kortingsprijs." },
    sort: ["Nieuwste", "Prijs laag naar hoog", "Prijs hoog naar laag", "Alfabetisch"],
    backFunko: "← Terug naar alle Funko-lijnen",
  },
};

const CATEGORY_GRID_COPY = {
  en: {
    common: { spots: "16 display spots", admin: "Filled automatically from Admin", sort: "Arrange the shelf" },
    lego: { kicker: "THE BUILDER'S SHELF", title: "Ready to build your collection?", text: "A clear 4 × 4 display with every product added from Admin." },
    pokemon: { kicker: "CREATURE COLLECTION", title: "Choose your next discovery.", text: "Sixteen showcase positions for figures, cards and special finds from Admin." },
    "star-wars": { kicker: "THE GALACTIC ARCHIVE", title: "Signals from the collection.", text: "A cinematic 4 × 4 display for every item assigned to Star Wars in Admin." },
    "harry-potter": { kicker: "THE ENCHANTED CABINET", title: "Every shelf holds a new story.", text: "A magical 4 × 4 display for products assigned to Harry Potter in Admin." },
    sale: { kicker: "THE GOLDEN DROP", title: "Limited offers. Lasting stories.", text: "Sixteen clear positions for every product with a valid discount price." },
  },
  nl: {
    common: { spots: "16 presentatieplekken", admin: "Automatisch gevuld vanuit Admin", sort: "Rangschik de collectie" },
    lego: { kicker: "DE BOUWERSPLANK", title: "Klaar om je collectie te bouwen?", text: "Een helder 4 × 4-overzicht met elk product dat via Admin wordt toegevoegd." },
    pokemon: { kicker: "WEZENSCOLLECTIE", title: "Kies je volgende ontdekking.", text: "Zestien presentatieplekken voor figuren, kaarten en bijzondere vondsten uit Admin." },
    "star-wars": { kicker: "HET GALACTISCHE ARCHIEF", title: "Signalen uit de collectie.", text: "Een filmisch 4 × 4-overzicht voor elk item dat in Admin aan Star Wars is gekoppeld." },
    "harry-potter": { kicker: "DE BETOVERDE KAST", title: "Elke plank bewaart een nieuw verhaal.", text: "Een magisch 4 × 4-overzicht voor producten die in Admin aan Harry Potter zijn gekoppeld." },
    sale: { kicker: "DE GOUDEN DROP", title: "Tijdelijke deals. Blijvende verhalen.", text: "Zestien heldere plekken voor elk product met een geldige kortingsprijs." },
  },
};

const FIXED_PAGE_COPY = {
  "Funko Movies": { en: ["Funko • Movies", "Funko from movies.", "Browse Funko collectibles from movies."], nl: ["Funko • Movies", "Funko uit films.", "Bekijk Funko-verzamelstukken uit films."] },
  "Funko Television": { en: ["Funko • Television", "Funko from television.", "Browse Funko collectibles from television."], nl: ["Funko • Television", "Funko uit televisie.", "Bekijk Funko-verzamelstukken uit televisie."] },
  "Funko Animation": { en: ["Funko • Animation", "Animated worlds in Funko form.", "Browse Funko collectibles from animation."], nl: ["Funko • Animation", "Animatiewerelden als Funko.", "Bekijk Funko-verzamelstukken uit animatie."] },
  "Funko Games": { en: ["Funko • Games", "Gaming characters to collect.", "Browse Funko collectibles from games."], nl: ["Funko • Games", "Gamepersonages om te verzamelen.", "Bekijk Funko-verzamelstukken uit games."] },
  "Funko Heroes": { en: ["Funko • Heroes", "Heroes and villains together.", "Browse Funko Heroes collectibles."], nl: ["Funko • Heroes", "Helden en schurken bij elkaar.", "Bekijk Funko Heroes-verzamelstukken."] },
  "Funko Pin": { en: ["Funko • Pin", "Small collectibles with character.", "Browse Funko pins."], nl: ["Funko • Pin", "Kleine verzamelitems met karakter.", "Bekijk Funko-pins."] },
  "Funko Bitty Pop": { en: ["Funko • Bitty Pop", "Tiny figures, big collection.", "Browse Funko Bitty Pop collectibles."], nl: ["Funko • Bitty Pop", "Kleine figuren, grote collectie.", "Bekijk Funko Bitty Pop-verzamelstukken."] },
  "Funko Tee": { en: ["Funko • Tee", "Collectible shirts and sets.", "Browse Funko Tee products."], nl: ["Funko • Tee", "Verzamelshirts en sets.", "Bekijk Funko Tee-producten."] },
};

const applyShopPageLanguage = (language = getShopLanguage()) => {
  const locale = language === "nl" ? "nl" : "en";
  const dictionary = SHOP_PAGE_COPY[locale];
  document.documentElement.lang = locale;

  const heading = document.querySelector(".section-heading");
  if (heading) {
    let pageCopy;
    if (FIXED_CATEGORY && FIXED_PAGE_COPY[FIXED_CATEGORY]) {
      const [eyebrow, title, text] = FIXED_PAGE_COPY[FIXED_CATEGORY][locale];
      pageCopy = { eyebrow, title, text };
    } else {
      pageCopy = dictionary[COLLECTION_KEY || "all"] || dictionary.all;
    }

    const eyebrow = heading.querySelector(".eyebrow");
    const title = heading.querySelector("h1");
    const text = heading.querySelector(".hero-text");
    const backLink = heading.querySelector(".text-link");
    if (eyebrow) eyebrow.textContent = pageCopy.eyebrow;
    if (title) title.textContent = pageCopy.title;
    if (text) text.textContent = pageCopy.text;
    if (backLink) backLink.textContent = dictionary.backFunko;
  }

  const sort = document.getElementById("shopSort");
  if (sort) {
    [...sort.options].forEach((option, index) => {
      if (dictionary.sort[index]) option.textContent = dictionary.sort[index];
    });
  }

  if (IS_CURATED_COLLECTION) {
    const categoryCopy = CATEGORY_GRID_COPY[locale]?.[COLLECTION_KEY];
    const commonCopy = CATEGORY_GRID_COPY[locale]?.common;
    if (categoryCopy) {
      const kicker = document.getElementById("categoryShelfKicker");
      const shelfTitle = document.getElementById("categoryShelfTitle");
      const shelfText = document.getElementById("categoryShelfText");
      if (kicker) kicker.textContent = categoryCopy.kicker;
      if (shelfTitle) shelfTitle.textContent = categoryCopy.title;
      if (shelfText) shelfText.textContent = categoryCopy.text;
    }
    if (commonCopy) {
      const spots = document.getElementById("categorySpotLabel");
      const admin = document.getElementById("categoryAdminLabel");
      const sortLabel = document.getElementById("categorySortLabel");
      if (spots) spots.textContent = commonCopy.spots;
      if (admin) admin.textContent = commonCopy.admin;
      if (sortLabel) sortLabel.textContent = commonCopy.sort;
    }
  }
};

const COLLECTION_KEY = document.body.dataset.collectionKey || "";
const IS_CURATED_COLLECTION = document.body.dataset.curatedGrid === "true";
const PRODUCTS_PER_PAGE = IS_CURATED_COLLECTION ? 16 : 24;
const FIXED_CATEGORY = document.body.dataset.fixedCategory || "";
const normalizeCollectionValue = (value = "") => String(value).trim().toLowerCase();
const belongsToCollection = (product) => {
  const haystack = [product?.brand, product?.category, product?.universe, product?.franchise, ...(Array.isArray(product?.tags) ? product.tags : [])].map(normalizeCollectionValue).join(" ");
  if (!COLLECTION_KEY) return true;
  if (COLLECTION_KEY === "funko") return haystack.includes("funko");
  if (COLLECTION_KEY === "lego") return haystack.includes("lego");
  if (COLLECTION_KEY === "pokemon") return haystack.includes("pokemon") || haystack.includes("pokémon");
  if (COLLECTION_KEY === "star-wars") return haystack.includes("star wars");
  if (COLLECTION_KEY === "harry-potter") return haystack.includes("harry potter");
  if (COLLECTION_KEY === "sale") {
    const selling = Number(product?.sellingPrice || product?.price || 0);
    const discount = Number(product?.discountPrice || 0);
    return selling > 0 && discount > 0 && discount < selling;
  }
  return true;
};
let products = [];
let filteredProducts = [];
let currentPage = 1;

const populateSelect = (select, values, placeholder = "Alles") => {
  if (!select) return;
  select.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = placeholder;
  select.appendChild(option);

  values.forEach((value) => {
    const item = document.createElement("option");
    item.value = value;
    item.textContent = value;
    select.appendChild(item);
  });
};

const getProducts = async () => {
  const result = await loadRuntimeCatalog();
  products = normalizeProductCatalog(result.products);
  populateFilters();
  applyFilters();
};

const populateFilters = () => {
  const collectionProducts = products.filter(belongsToCollection);
  const categories = [...new Set(collectionProducts.map((product) => product.category).filter(Boolean))].sort();
  if (FIXED_CATEGORY && !categories.includes(FIXED_CATEGORY)) categories.unshift(FIXED_CATEGORY);
  const universes = [...new Set(collectionProducts.map((product) => product.universe).filter(Boolean))].sort();
  const brands = [...new Set(collectionProducts.map((product) => product.brand).filter(Boolean))].sort();

  if (filtersRoot) {
    filtersRoot.innerHTML = createFilterSidebar({ categories, universes, brands, priceValue: 300 });
  }

  shopSearch = document.getElementById("shopSearch");
  shopCategory = document.getElementById("shopCategory");
  shopUniverse = document.getElementById("shopUniverse");
  shopBrand = document.getElementById("shopBrand");
  shopPrice = document.getElementById("shopPrice");
  shopPriceValue = document.getElementById("shopPriceValue");
  shopExclusive = document.getElementById("shopExclusive");
  shopChase = document.getElementById("shopChase");
  shopVaulted = document.getElementById("shopVaulted");
  shopInStock = document.getElementById("shopInStock");
  shopSort = document.getElementById("shopSort");

  const urlFilters = new URLSearchParams(window.location.search);
  const requestedCategory = FIXED_CATEGORY || urlFilters.get("category") || "";
  const requestedUniverse = urlFilters.get("universe") || "";
  const requestedSearch = urlFilters.get("search") || "";
  const requestedBrand = urlFilters.get("brand") || "";
  const requestedInStock = urlFilters.get("inStock") === "1";

  if (shopCategory && requestedCategory && [...shopCategory.options].some((option) => option.value === requestedCategory)) {
    shopCategory.value = requestedCategory;
  }
  if (shopCategory && FIXED_CATEGORY) {
    shopCategory.value = FIXED_CATEGORY;
    shopCategory.disabled = true;
    shopCategory.title = `Deze pagina toont alleen ${FIXED_CATEGORY}`;
  }
  if (shopUniverse && requestedUniverse) {
    const normalizedRequestedUniverse = requestedUniverse.toLowerCase();
    const matchingOption = [...shopUniverse.options].find((option) => option.value.toLowerCase() === normalizedRequestedUniverse);
    if (matchingOption) shopUniverse.value = matchingOption.value;
  }
  if (shopSearch && requestedSearch) shopSearch.value = requestedSearch;
  if (shopBrand && requestedBrand) { const matchingBrand = [...shopBrand.options].find((option) => option.value.toLowerCase() === requestedBrand.toLowerCase()); if (matchingBrand) shopBrand.value = matchingBrand.value; }
  if (shopInStock && requestedInStock) shopInStock.checked = true;

  const elements = [shopSearch, shopCategory, shopUniverse, shopBrand, shopPrice, shopExclusive, shopChase, shopVaulted, shopInStock, shopSort].filter(Boolean);
  elements.forEach((element) => {
    element.addEventListener("input", applyFilters);
    element.addEventListener("change", applyFilters);
  });

  if (shopPrice && shopPriceValue) {
    shopPrice.addEventListener("input", () => {
      const copy = shopCopy();
      shopPriceValue.textContent = shopPrice.value === "300" ? `${copy.until} €300` : `${copy.until} ${formatCurrency(shopPrice.value)}`;
      applyFilters();
    });
  }

  const resetButton = document.getElementById("shopReset");
  resetButton?.addEventListener("click", () => {
    if (shopSearch) shopSearch.value = "";
    if (shopCategory) shopCategory.value = FIXED_CATEGORY || "";
    if (shopUniverse) shopUniverse.value = "";
    if (shopBrand) shopBrand.value = "";
    if (shopPrice) shopPrice.value = "300";
    if (shopPriceValue) shopPriceValue.textContent = `${shopCopy().until} €300`;
    if (shopExclusive) shopExclusive.checked = false;
    if (shopChase) shopChase.checked = false;
    if (shopVaulted) shopVaulted.checked = false;
    if (shopInStock) shopInStock.checked = false;
    if (shopSort) shopSort.value = "newest";
    applyFilters();
  });
};

const sortProducts = (items) => {
  const sortValue = shopSort?.value || "newest";
  const sorted = [...items];

  switch (sortValue) {
    case "price-asc":
      return sorted.sort((left, right) => {
        const leftHasPrice = hasValidSellingPrice(left);
        const rightHasPrice = hasValidSellingPrice(right);
        if (leftHasPrice && !rightHasPrice) return -1;
        if (!leftHasPrice && rightHasPrice) return 1;
        return getDisplayPrice(left) - getDisplayPrice(right);
      });
    case "price-desc":
      return sorted.sort((left, right) => {
        const leftHasPrice = hasValidSellingPrice(left);
        const rightHasPrice = hasValidSellingPrice(right);
        if (leftHasPrice && !rightHasPrice) return -1;
        if (!leftHasPrice && rightHasPrice) return 1;
        return getDisplayPrice(right) - getDisplayPrice(left);
      });
    case "alpha":
      return sorted.sort((left, right) => left.name.localeCompare(right.name));
    default:
      return sorted.sort((left, right) => right.releaseYear - left.releaseYear || right.id - left.id);
  }
};

const getFilteredProducts = () => {
  const query = shopSearch?.value.trim().toLowerCase() || "";
  const category = FIXED_CATEGORY || shopCategory?.value || "";
  const universe = shopUniverse?.value || "";
  const brand = shopBrand?.value || "";
  const maxPrice = shopPrice ? Number(shopPrice.value || 300) : Number.POSITIVE_INFINITY;
  const onlyExclusive = shopExclusive?.checked || false;
  const onlyChase = shopChase?.checked || false;
  const onlyVaulted = shopVaulted?.checked || false;
  const onlyInStock = shopInStock?.checked || false;

  return products.filter((product) => {
    if (!belongsToCollection(product)) return false;
    try {
      const productTags = Array.isArray(product?.tags) ? product.tags : [];
      const matchesQuery = `${product?.name || ""} ${product?.universe || ""} ${product?.franchise || ""} ${product?.description || ""} ${productTags.join(" ")} ${product?.number || ""} ${product?.id || ""} ${product?.sku || ""}`.toLowerCase().includes(query);
      const matchesCategory = !category || product.category === category;
      const matchesUniverse = !universe || product.universe === universe;
      const matchesBrand = !brand || product.brand === brand;
      const matchesPrice = !hasValidSellingPrice(product) || getDisplayPrice(product) <= maxPrice;
      const matchesExclusive = !onlyExclusive || product.exclusive;
      const matchesChase = !onlyChase || product.chase;
      const matchesVaulted = !onlyVaulted || product.vaulted;
      const matchesInStock = !onlyInStock || Number(product?.stock || 0) > 0;

      return matchesQuery && matchesCategory && matchesUniverse && matchesBrand && matchesPrice && matchesExclusive && matchesChase && matchesVaulted && matchesInStock;
    } catch (error) {
      const productId = product?.id ?? "unknown";
      console.error(`Failed to evaluate product filters (id=${productId})`, error);
      return false;
    }
  });
};

const bindProductCardActions = (root) => {
  root?.querySelectorAll("[data-action]").forEach((trigger) => {
    const product = {
      id: Number(trigger.dataset.productId || 0),
      name: trigger.dataset.productName || "Collectible",
      price: Number(trigger.dataset.productPrice || 0),
      image: trigger.dataset.productImage || "",
      universe: trigger.dataset.productUniverse || "",
      franchise: trigger.dataset.productFranchise || "",
      edition: trigger.dataset.productEdition || "",
      stock: Number(trigger.dataset.productStock || 0),
      slug: trigger.dataset.productSlug || "",
    };
    bindShoppingActions(product, trigger);
  });
  attachProductCardInteractions(root);
};

const renderProducts = (items) => {
  if (!shopGrid) return;

  const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const pageItems = items.slice(start, start + PRODUCTS_PER_PAGE);

  const renderedCards = [];
  pageItems.forEach((product) => {
    try {
      renderedCards.push(createProductCard(product));
    } catch (error) {
      const productId = product?.id ?? "unknown";
      const productName = product?.name ?? "unknown";
      console.error(`Failed to render product card (id=${productId}, name=${productName})`, error);
    }
  });

  shopGrid.innerHTML = renderedCards.length
    ? renderedCards.join("")
    : `<p class="card-empty">${IS_CURATED_COLLECTION ? shopCopy().emptyCurated : shopCopy().empty}</p>`;

  attachPremiumFallback(shopGrid);

  try {
    bindProductCardActions(shopGrid);
  } catch (error) {
    console.error("Failed to bind product card actions", error);
  }
};

const renderPagination = (items) => {
  if (!shopPagination) return;
  const totalPages = Math.max(1, Math.ceil(items.length / PRODUCTS_PER_PAGE));

  if (totalPages <= 1) {
    shopPagination.innerHTML = "";
    return;
  }

  const buttons = [];
  for (let page = 1; page <= totalPages; page += 1) {
    buttons.push(`<button class="pagination-btn${page === currentPage ? " active" : ""}" data-page="${page}">${page}</button>`);
  }

  shopPagination.innerHTML = buttons.join("");

  shopPagination.querySelectorAll("button[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPage = Number(button.dataset.page);
      renderProducts(filteredProducts);
      renderPagination(filteredProducts);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
};

const updateCount = (items) => {
  const copy = shopCopy();
  if (shopCount) {
    shopCount.textContent = `${items.length} ${items.length === 1 ? copy.product : copy.products}`;
  }
  if (!shopActiveFilters) return;

  const activeFilters = [];
  if (shopSearch?.value.trim()) activeFilters.push(`${copy.search}: ${shopSearch.value.trim()}`);
  if (FIXED_CATEGORY || shopCategory?.value) activeFilters.push(`${copy.category}: ${FIXED_CATEGORY || shopCategory.value}`);
  if (shopUniverse?.value) activeFilters.push(`${copy.universe}: ${shopUniverse.value}`);
  if (shopBrand?.value) activeFilters.push(`${copy.brand}: ${shopBrand.value}`);
  if (shopPrice?.value !== "300") activeFilters.push(`${copy.price}: ≤ ${formatCurrency(shopPrice.value)}`);
  if (shopExclusive?.checked) activeFilters.push(copy.exclusive);
  if (shopChase?.checked) activeFilters.push(copy.chase);
  if (shopVaulted?.checked) activeFilters.push(copy.vaulted);
  if (shopInStock?.checked) activeFilters.push(copy.stock);

  shopActiveFilters.textContent = activeFilters.length ? `${copy.active}: ${activeFilters.join(" • ")}` : `${copy.active}: ${copy.none}`;
};

const applyFilters = () => {
  currentPage = 1;
  filteredProducts = sortProducts(getFilteredProducts());
  updateCount(filteredProducts);
  renderProducts(filteredProducts);
  renderPagination(filteredProducts);
};

if (headerRoot) headerRoot.innerHTML = createHeader("shop");
if (footerRoot) footerRoot.innerHTML = createFooter();
applyShopPageLanguage();
syncHeaderCounters();
window.addEventListener("lootifer:state-updated", syncHeaderCounters);

const showLoadError = () => {
  if (shopGrid) {
    shopGrid.innerHTML = `<p class="card-empty">${shopCopy().unavailable}</p>`;
  }

  if (shopCount) {
    shopCount.textContent = `0 ${shopCopy().products}`;
  }

  if (shopActiveFilters) {
    const copy = shopCopy();
    shopActiveFilters.textContent = `${copy.active}: ${copy.none}`;
  }
};

const initializeShop = async () => {
  try {
    await getProducts();
  } catch (error) {
    console.error("Shop catalog failed to load:", error);
    showLoadError();
  }
};

initializeShop();
window.addEventListener("lootifer:inventory-updated", initializeShop);
window.addEventListener("lootifer:language-change", (event) => {
  applyShopPageLanguage(event.detail?.language || "en");
  populateFilters();
  applyFilters();
});
const revealItems = document.querySelectorAll(".reveal");

if (revealItems.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));
}