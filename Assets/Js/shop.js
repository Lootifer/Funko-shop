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

const PRODUCTS_PER_PAGE = 24;
const COLLECTION_KEY = document.body.dataset.collectionKey || "";
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
  const requestedCategory = urlFilters.get("category") || "";
  const requestedUniverse = urlFilters.get("universe") || "";
  const requestedSearch = urlFilters.get("search") || "";
  const requestedBrand = urlFilters.get("brand") || "";

  if (shopCategory && requestedCategory && [...shopCategory.options].some((option) => option.value === requestedCategory)) {
    shopCategory.value = requestedCategory;
  }
  if (shopUniverse && requestedUniverse) {
    const normalizedRequestedUniverse = requestedUniverse.toLowerCase();
    const matchingOption = [...shopUniverse.options].find((option) => option.value.toLowerCase() === normalizedRequestedUniverse);
    if (matchingOption) shopUniverse.value = matchingOption.value;
  }
  if (shopSearch && requestedSearch) shopSearch.value = requestedSearch;
  if (shopBrand && requestedBrand) { const matchingBrand = [...shopBrand.options].find((option) => option.value.toLowerCase() === requestedBrand.toLowerCase()); if (matchingBrand) shopBrand.value = matchingBrand.value; }

  const elements = [shopSearch, shopCategory, shopUniverse, shopBrand, shopPrice, shopExclusive, shopChase, shopVaulted, shopInStock, shopSort].filter(Boolean);
  elements.forEach((element) => {
    element.addEventListener("input", applyFilters);
    element.addEventListener("change", applyFilters);
  });

  if (shopPrice && shopPriceValue) {
    shopPrice.addEventListener("input", () => {
      shopPriceValue.textContent = shopPrice.value === "300" ? "Tot €300" : `Tot ${formatCurrency(shopPrice.value)}`;
      applyFilters();
    });
  }

  const resetButton = document.getElementById("shopReset");
  resetButton?.addEventListener("click", () => {
    if (shopSearch) shopSearch.value = "";
    if (shopCategory) shopCategory.value = "";
    if (shopUniverse) shopUniverse.value = "";
    if (shopBrand) shopBrand.value = "";
    if (shopPrice) shopPrice.value = "300";
    if (shopPriceValue) shopPriceValue.textContent = "Tot €300";
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
  const category = shopCategory?.value || "";
  const universe = shopUniverse?.value || "";
  const brand = shopBrand?.value || "";
  const maxPrice = Number(shopPrice?.value || 300);
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
    : '<p class="card-empty">Er passen geen verzamelitems bij de huidige filters.</p>';

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
  if (!shopCount || !shopActiveFilters) return;
  shopCount.textContent = `${items.length} product${items.length === 1 ? "" : "en"} gevonden`;

  const activeFilters = [];
  if (shopSearch?.value.trim()) activeFilters.push(`Zoekterm: ${shopSearch.value.trim()}`);
  if (shopCategory?.value) activeFilters.push(`Categorie: ${shopCategory.value}`);
  if (shopUniverse?.value) activeFilters.push(`Universum: ${shopUniverse.value}`);
  if (shopBrand?.value) activeFilters.push(`Merk: ${shopBrand.value}`);
  if (shopPrice?.value !== "300") activeFilters.push(`Prijs: ≤ ${formatCurrency(shopPrice.value)}`);
  if (shopExclusive?.checked) activeFilters.push("Exclusief");
  if (shopChase?.checked) activeFilters.push("Chase");
  if (shopVaulted?.checked) activeFilters.push("Gewaardeerd");
  if (shopInStock?.checked) activeFilters.push("Op voorraad");

  shopActiveFilters.textContent = activeFilters.length ? `Actieve filters: ${activeFilters.join(" • ")}` : "Actieve filters: geen";
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
syncHeaderCounters();
window.addEventListener("lootifer:state-updated", syncHeaderCounters);

const showLoadError = () => {
  if (shopGrid) {
    shopGrid.innerHTML = '<p class="card-empty">De productcatalogus is momenteel niet beschikbaar.</p>';
  }

  if (shopCount) {
    shopCount.textContent = "0 producten gevonden";
  }

  if (shopActiveFilters) {
    shopActiveFilters.textContent = "Actieve filters: geen";
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