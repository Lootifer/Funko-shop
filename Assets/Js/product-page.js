import { normalizeProductCatalog, createProductBadge } from "../../Products/product-schema.js";
import { createProductCardMarkup } from "../../Products/product-card.js";
import { attachPremiumFallback, createImageAttributes } from "../../Products/product-media.js";
import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createShoppingUi, bindShoppingActions, attachProductCardInteractions } from "../../Components/Experience/shopping-ui.js";
import { getCollectorScore, getProductBadges, getStockTone } from "../../Components/Collector/collector-experience.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";
import { syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";
import { formatCurrency } from "./formatting.js";
import { getProductPriceLabel } from "../../Products/product-pricing.js";
import { loadRuntimeCatalog } from "../../Products/runtime-catalog.js";

const params = new URLSearchParams(window.location.search);
const productSlug = params.get("slug") || params.get("id");

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");

if (headerRoot) headerRoot.innerHTML = createHeader("shop");
if (footerRoot) footerRoot.innerHTML = createFooter();

const shoppingRoot = document.createElement("div");
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });

const productGalleryMain = document.getElementById("productGalleryMain");
const productGalleryThumbs = document.getElementById("productGalleryThumbs");
const productBadge = document.getElementById("productBadge");
const productTitle = document.getElementById("productTitle");
const productMeta = document.getElementById("productMeta");
const productNumber = document.getElementById("productNumber");
const productUniverse = document.getElementById("productUniverse");
const productEdition = document.getElementById("productEdition");
const productCondition = document.getElementById("productCondition");
const productPrice = document.getElementById("productPrice");
const productStock = document.getElementById("productStock");
const productDescription = document.getElementById("productDescription");
const collectorScore = document.getElementById("collectorScore");
const collectorInfo = document.getElementById("collectorInfo");
const productSpecs = document.getElementById("productSpecs");
const relatedProducts = document.getElementById("relatedProducts");
const recommendedProducts = document.getElementById("recommendedProducts");
const recentProducts = document.getElementById("recentProducts");
const wishlistButton = document.getElementById("wishlistButton");
let currentProduct = null;

const isKnownBarcode = (value = "") => {
  const barcode = String(value || "").trim();
  return Boolean(barcode) && !/^unknown/i.test(barcode);
};

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text.length > 0;
};

const getProductById = async () => {
  const result = await loadRuntimeCatalog();
  const normalized = normalizeProductCatalog(result.products);
  const slugValue = String(productSlug || "").toLowerCase();
  return normalized.find((product) => product.slug === slugValue || product.id === Number(productSlug)) || normalized[0];
};

const renderGallery = (product) => {
  if (!productGalleryMain || !productGalleryThumbs) return;

  const galleryItems = [product.image, ...(product.gallery || [])].filter(Boolean);
  const mainImage = galleryItems[0];

  productGalleryMain.innerHTML = `<img ${createImageAttributes({ src: mainImage, alt: product.name, loading: "eager" })} />`;
  productGalleryThumbs.innerHTML = galleryItems
    .map((image, index) => `<button type="button" class="gallery-thumb${index === 0 ? " active" : ""}" data-image="${image}"><img ${createImageAttributes({ src: image, alt: `${product.name} ${index + 1}` })} /></button>`)
    .join("");

  attachPremiumFallback(productGalleryMain);
  attachPremiumFallback(productGalleryThumbs);

  productGalleryThumbs.querySelectorAll(".gallery-thumb").forEach((button) => {
    button.addEventListener("click", () => {
      productGalleryMain.innerHTML = `<img ${createImageAttributes({ src: button.dataset.image, alt: product.name, loading: "eager" })} />`;
      attachPremiumFallback(productGalleryMain);
      productGalleryThumbs.querySelectorAll(".gallery-thumb").forEach((thumb) => thumb.classList.toggle("active", thumb === button));
    });
  });
};

const renderCollectorInfo = (product) => {
  if (!collectorInfo) return;

  const chips = [
    product.exclusive ? "Exclusief" : null,
    product.vaulted ? "Gewaardeerd" : null,
    product.releaseYear ? `Uitgebracht ${product.releaseYear}` : null,
    product.franchise || null,
    product.universe || null,
  ].filter(Boolean);

  collectorInfo.innerHTML = chips
    .map((chip) => `<span class="collector-chip">${chip}</span>`)
    .join("");
};

const renderSpecs = (product) => {
  if (!productSpecs) return;

  const specs = [
    ["SKU", product.sku],
    ["Barcode", isKnownBarcode(product.barcode) ? product.barcode : null],
    ["Merk", product.brand],
    ["Editie", product.edition],
    ["Staat", product.condition],
    ["Uitgavejaar", product.releaseYear],
    ["Conventie", product.convention],
    ["Tags", (product.tags || []).join(", ")],
  ].filter(([, value]) => hasValue(value));

  productSpecs.innerHTML = specs.length
    ? specs.map(([label, value]) => `<li><strong>${label}:</strong> ${value}</li>`).join("")
    : "<li>Geen aanvullende specificaties beschikbaar.</li>";
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

const renderRelatedProducts = (products, currentProduct) => {
  if (!relatedProducts) return;

  const related = products
    .filter((product) => product.id !== currentProduct.id && product.category === currentProduct.category)
    .slice(0, 4);

  relatedProducts.innerHTML = related.length
    ? related.map((product) => createProductCardMarkup(product)).join("")
    : '<p class="card-empty">Geen gerelateerde producten beschikbaar.</p>';
  bindProductCardActions(relatedProducts);
};

const renderRecommendedProducts = (products, currentProduct) => {
  if (!recommendedProducts) return;

  const recommended = products
    .filter((product) => product.id !== currentProduct.id)
    .slice(0, 3);

  recommendedProducts.innerHTML = recommended.length
    ? recommended.map((product) => createProductCardMarkup(product)).join("")
    : '<p class="card-empty">Geen aanbevelingen beschikbaar.</p>';
  bindProductCardActions(recommendedProducts);
};

const renderRecentProducts = (products) => {
  if (!recentProducts) return;

  const recent = products.slice(0, 4);
  recentProducts.innerHTML = recent.length
    ? recent.map((product) => createProductCardMarkup(product)).join("")
    : '<p class="card-empty">Recent bekeken items verschijnen hier.</p>';
  bindProductCardActions(recentProducts);
};

const storeRecentlyViewed = (product) => {
  const viewed = JSON.parse(localStorage.getItem("lootifer-recent") || "[]");
  const next = [product.id, ...viewed.filter((id) => id !== product.id)].slice(0, 6);
  localStorage.setItem("lootifer-recent", JSON.stringify(next));
};

const renderProduct = async () => {
  const product = await getProductById();
  if (!product) return;

  shoppingState.addRecent(product);
  renderGallery(product);
  const badges = getProductBadges(product);
  const badgeMarkup = badges.length ? badges.map((badge) => `<span class="collector-badge ${badge.tone}">${badge.label}</span>`).join("") : `<span class="collector-badge accent">${createProductBadge(product)}</span>`;
  productBadge.innerHTML = `${badgeMarkup} <span class="eyebrow">${product.universe || product.category}</span>`;
  productTitle.textContent = product.name;
  productMeta.textContent = [product.category, product.franchise].filter(hasValue).join(" • ");

  const infoFields = [
    [productNumber, product.number],
    [productUniverse, product.universe],
    [productEdition, product.edition],
    [productCondition, product.condition],
  ];

  infoFields.forEach(([element, value]) => {
    if (!element) return;
    const wrapper = element.closest("div");
    const visible = hasValue(value);
    element.textContent = visible ? value : "";
    if (wrapper) {
      wrapper.style.display = visible ? "" : "none";
    }
  });

  productPrice.textContent = getProductPriceLabel(product, formatCurrency);
  const stockTone = getStockTone(product);
  const stockCount = Number(product.stock) || 0;
  const stockLabel = stockCount <= 0
    ? "Niet op voorraad"
    : stockCount === 1
      ? "Nog 1 beschikbaar"
      : `Nog ${stockCount} beschikbaar`;
  collectorScore.textContent = `Verzamelaarscore ${getCollectorScore(product)}`;
  productStock.textContent = stockLabel;
  productStock.className = `product-stock ${stockTone}`;
  productDescription.textContent = product.description;
  renderCollectorInfo(product);
  renderSpecs(product);
  currentProduct = product;

  if (wishlistButton) {
    const saved = shoppingState.isWishlisted(product.id);
    wishlistButton.textContent = saved ? "Uit verlanglijst verwijderen" : "Toevoegen aan verlanglijst";
    wishlistButton.dataset.state = saved ? "saved" : "unsaved";
  }

  const result = await loadRuntimeCatalog();
  const normalized = normalizeProductCatalog(result.products);
  const recentIds = JSON.parse(localStorage.getItem("lootifer-recent") || "[]");
  const recent = normalized.filter((item) => recentIds.includes(item.id));

  renderRelatedProducts(normalized, product);
  renderRecommendedProducts(normalized, product);
  renderRecentProducts(recent.length ? recent : normalized.slice(0, 4));
};

wishlistButton?.addEventListener("click", () => {
  if (!currentProduct) return;
  shoppingState.toggleWishlist(currentProduct);
  const saved = shoppingState.isWishlisted(currentProduct.id);
  wishlistButton.textContent = saved ? "Uit verlanglijst verwijderen" : "Toevoegen aan verlanglijst";
  syncHeaderCounters();
});

bindProductCardActions(document);

renderProduct();
window.addEventListener("lootifer:inventory-updated", () => {
  renderProduct().catch((error) => {
    console.error("Product kon niet worden vernieuwd:", error);
  });
});
