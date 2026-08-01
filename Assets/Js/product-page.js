import { normalizeProductCatalog, createProductBadge } from "../../Products/product-schema.js";
import { createProductCardMarkup } from "../../Products/product-card.js";
import { attachPremiumFallback, createImageAttributes } from "../../Products/product-media.js";
import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createShoppingUi, bindShoppingActions, attachProductCardInteractions } from "../../Components/Experience/shopping-ui.js";
import { getCollectorScore, getProductBadges, getStockLabel, getStockTone } from "../../Components/Collector/collector-experience.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";

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

const getProductById = async () => {
  const response = await fetch("Data/products.json");
  if (!response.ok) throw new Error("Unable to load product");

  const rawProducts = await response.json();
  const normalized = normalizeProductCatalog(rawProducts);
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
    product.exclusive ? "Exclusive" : null,
    product.vaulted ? "Vaulted" : null,
    product.releaseYear ? `Released ${product.releaseYear}` : null,
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
    ["Barcode", product.barcode],
    ["Brand", product.brand],
    ["Edition", product.edition],
    ["Condition", product.condition],
    ["Release Year", product.releaseYear],
    ["Tags", (product.tags || []).join(", ")],
  ];

  productSpecs.innerHTML = specs.map(([label, value]) => `<li><strong>${label}:</strong> ${value}</li>`).join("");
};

const bindProductCardActions = (root) => {
  root?.querySelectorAll("[data-action]").forEach((trigger) => {
    const product = {
      id: Number(trigger.dataset.productId || 0),
      name: trigger.dataset.productName || "Collector item",
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
    : '<p class="card-empty">No related products available.</p>';
  bindProductCardActions(relatedProducts);
};

const renderRecommendedProducts = (products, currentProduct) => {
  if (!recommendedProducts) return;

  const recommended = products
    .filter((product) => product.id !== currentProduct.id)
    .slice(0, 3);

  recommendedProducts.innerHTML = recommended.length
    ? recommended.map((product) => createProductCardMarkup(product)).join("")
    : '<p class="card-empty">No recommendations available.</p>';
  bindProductCardActions(recommendedProducts);
};

const renderRecentProducts = (products) => {
  if (!recentProducts) return;

  const recent = products.slice(0, 4);
  recentProducts.innerHTML = recent.length
    ? recent.map((product) => createProductCardMarkup(product)).join("")
    : '<p class="card-empty">Recently viewed items will appear here.</p>';
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
  productMeta.textContent = `${product.category} • ${product.franchise}`;
  productNumber.textContent = product.number;
  productUniverse.textContent = product.universe;
  productEdition.textContent = product.edition;
  productCondition.textContent = product.condition;
  productPrice.textContent = `$${product.price}`;
  const stockTone = getStockTone(product);
  const stockLabel = getStockLabel(product);
  collectorScore.textContent = `Collector score ${getCollectorScore(product)}`;
  productStock.textContent = `${stockLabel} • ${product.stock > 0 ? `${product.stock} left` : "out now"}`;
  productStock.className = `product-stock ${stockTone}`;
  productDescription.textContent = product.description;
  renderCollectorInfo(product);
  renderSpecs(product);

  const response = await fetch("Data/products.json");
  const rawProducts = await response.json();
  const normalized = normalizeProductCatalog(rawProducts);
  const recentIds = JSON.parse(localStorage.getItem("lootifer-recent") || "[]");
  const recent = normalized.filter((item) => recentIds.includes(item.id));

  renderRelatedProducts(normalized, product);
  renderRecommendedProducts(normalized, product);
  renderRecentProducts(recent.length ? recent : normalized.slice(0, 4));
};

wishlistButton?.addEventListener("click", () => {
  const current = wishlistButton.textContent;
  wishlistButton.textContent = current === "Wishlist" ? "Saved" : "Wishlist";
});

bindProductCardActions(document);

renderProduct();
