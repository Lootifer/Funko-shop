import { normalizeProductCatalog, createProductBadge } from "../../Products/product-schema.js";
import { createProductCardMarkup } from "../../Products/product-card.js";
import { attachPremiumFallback, createImageAttributes } from "../../Products/product-media.js";
import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import {
  createShoppingUi,
  bindShoppingActions,
  attachProductCardInteractions,
} from "../../Components/Experience/shopping-ui.js";
import {
  getProductBadges,
  getStockTone,
} from "../../Components/Collector/collector-experience.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";
import { syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";
import { formatCurrency } from "./formatting.js";
import {
  getDisplayPrice,
  getProductPriceLabel,
  hasValidSellingPrice,
} from "../../Products/product-pricing.js";
import { loadRuntimeCatalog } from "../../Products/runtime-catalog.js";

const SITE_ORIGIN = "https://www.2ndlifetoys.nl";
const PRODUCT_SCHEMA_ID = "productStructuredData";
const BREADCRUMB_SCHEMA_ID = "breadcrumbStructuredData";

const CATEGORY_PAGE_MAP = {
  "collectible lamps": "collectible-lamps.html",
  "figures & toys": "figures-toys.html",
  "funko animation": "funko-animation.html",
  "funko bitty pop": "funko-bitty-pop.html",
  "funko games": "funko-games.html",
  "funko heroes": "funko-heroes.html",
  "funko movies": "funko-movies.html",
  "funko pin": "funko-pin.html",
  "funko pop": "funko.html",
  "funko tee": "funko-tee.html",
  "funko television": "funko-television.html",
  "harry potter": "harry-potter.html",
  "hot wheels": "hot-wheels.html",
  "fifa 365 cards": "fifa-365-cards.html",
  "donald duck strips": "donald-duck-strips.html",
  "bordspellen & games": "bordspellen-games.html",
  "lego": "lego.html",
  "pokémon": "pokemon.html",
  "star wars": "star-wars.html",
  "vintage figures": "vintage-figures.html",
};

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
const collectorDetailsList = document.getElementById("collectorDetailsList");
const collectorInfo = document.getElementById("collectorInfo");
const productSpecs = document.getElementById("productSpecs");
const relatedProducts = document.getElementById("relatedProducts");
const recommendedProducts = document.getElementById("recommendedProducts");
const recentProducts = document.getElementById("recentProducts");
const wishlistButton = document.getElementById("wishlistButton");
const addToCartButton = document.getElementById("addToCartButton");

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

const cleanSeoText = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const truncateSeoText = (value = "", maxLength = 160) => {
  const text = cleanSeoText(value);

  if (text.length <= maxLength) {
    return text;
  }

  const shortened = text.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(" ");

  const safeText =
    lastSpace > 100
      ? shortened.slice(0, lastSpace)
      : shortened;

  return `${safeText.trim()}…`;
};

const toAbsoluteUrl = (value = "") => {
  const source = String(value || "").trim();

  if (!source) {
    return "";
  }

  try {
    const url = new URL(source, `${SITE_ORIGIN}/`);

    const internalHosts = new Set([
      "test.2ndlifetoys.nl",
      "2ndlifetoys.nl",
      "www.2ndlifetoys.nl",
    ]);

    if (internalHosts.has(url.hostname.toLowerCase())) {
      return `${SITE_ORIGIN}${url.pathname}${url.search}${url.hash}`;
    }

    return url.href;
  } catch {
    return "";
  }
};

const ensureMetaDescription = () => {
  let meta = document.querySelector('meta[name="description"]');

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }

  return meta;
};

const ensureCanonical = () => {
  let canonical = document.querySelector('link[rel="canonical"]');

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  return canonical;
};

const buildSeoTitle = (product) => {
  const name = cleanSeoText(product.name) || "Collectible";

  const possibleContext = [
    product.franchise,
    product.universe,
    product.brand,
    product.category,
  ]
    .map(cleanSeoText)
    .filter(Boolean)
    .find(
      (value) =>
        !name.toLowerCase().includes(value.toLowerCase())
    );

  if (possibleContext) {
    const contextualTitle =
      `${name} | ${possibleContext} | 2nd Life Toys`;

    if (contextualTitle.length <= 70) {
      return contextualTitle;
    }
  }

  return `${name} | 2nd Life Toys`;
};

const buildSeoDescription = (product) => {
  const name =
    cleanSeoText(product.name) || "dit verzamelitem";

  const context = [
    product.brand,
    product.category,
    product.franchise,
    product.universe,
  ]
    .map(cleanSeoText)
    .filter(Boolean)
    .filter((value, index, values) => {
      const normalized = value.toLowerCase();

      return (
        values.findIndex(
          (item) =>
            item.toLowerCase() === normalized
        ) === index
      );
    })
    .slice(0, 2);

  const contextText = context.length
    ? ` ${context.join(" • ")}.`
    : "";

  const description =
    cleanSeoText(product.description);

  const condition = hasValue(product.condition)
    ? ` Staat: ${cleanSeoText(product.condition)}.`
    : "";

  const text = [
    `Bekijk ${name} bij 2nd Life Toys.${contextText}`,
    description,
    condition,
  ]
    .filter(Boolean)
    .join(" ");

  return truncateSeoText(text, 160);
};

const getCanonicalProductUrl = (product) => {
  const slug = cleanSeoText(product.slug);

  if (slug) {
    return `${SITE_ORIGIN}/product.html?slug=${encodeURIComponent(
      slug
    )}`;
  }

  return `${SITE_ORIGIN}/product.html?id=${encodeURIComponent(
    String(product.id || "")
  )}`;
};

const getSchemaCondition = (condition = "") => {
  const normalized =
    cleanSeoText(condition).toLowerCase();

  if (normalized.includes("refurb")) {
    return "https://schema.org/RefurbishedCondition";
  }

  if (
    normalized === "new - boxed" ||
    normalized === "new - sealed"
  ) {
    return "https://schema.org/NewCondition";
  }

  return "https://schema.org/UsedCondition";
};

const getBarcodeSchema = (barcode = "") => {
  if (!isKnownBarcode(barcode)) {
    return {};
  }

  const digits = String(barcode).replace(/\D/g, "");

  if (digits.length === 8) {
    return { gtin8: digits };
  }

  if (digits.length === 12) {
    return { gtin12: digits };
  }

  if (digits.length === 13) {
    return { gtin13: digits };
  }

  if (digits.length === 14) {
    return { gtin14: digits };
  }

  return {};
};

const updateProductStructuredData = ({
  product,
  canonicalUrl,
  seoDescription,
}) => {
  let script =
    document.getElementById(PRODUCT_SCHEMA_ID);

  if (!script) {
    script = document.createElement("script");
    script.id = PRODUCT_SCHEMA_ID;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  const images = [
    product.image,
    ...(Array.isArray(product.gallery)
      ? product.gallery
      : []),
  ]
    .map(toAbsoluteUrl)
    .filter(Boolean)
    .filter(
      (value, index, values) =>
        values.indexOf(value) === index
    );

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cleanSeoText(product.name),
    url: canonicalUrl,
    description: seoDescription,
  };

  if (images.length) {
    schema.image = images;
  }

  if (hasValue(product.sku)) {
    schema.sku = cleanSeoText(product.sku);
  }

  if (hasValue(product.brand)) {
    schema.brand = {
      "@type": "Brand",
      name: cleanSeoText(product.brand),
    };
  }

  if (hasValue(product.category)) {
    schema.category =
      cleanSeoText(product.category);
  }

  Object.assign(
    schema,
    getBarcodeSchema(product.barcode)
  );

  if (hasValidSellingPrice(product)) {
    schema.offers = {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "EUR",
      price: getDisplayPrice(product).toFixed(2),
      availability:
        Number(product.stock) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition:
        getSchemaCondition(product.condition),
    };
  }

  script.textContent = JSON.stringify(schema);
};

const getCategoryPageUrl = (category = "") => {
  const key = cleanSeoText(category).toLowerCase();
  const page = CATEGORY_PAGE_MAP[key];

  return page ? `${SITE_ORIGIN}/${page}` : "";
};

const updateBreadcrumbStructuredData = ({
  product,
  canonicalUrl,
}) => {
  let script =
    document.getElementById(BREADCRUMB_SCHEMA_ID);

  if (!script) {
    script = document.createElement("script");
    script.id = BREADCRUMB_SCHEMA_ID;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  const itemListElement = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${SITE_ORIGIN}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Shop",
      item: `${SITE_ORIGIN}/shop.html`,
    },
  ];

  const categoryName = cleanSeoText(product.category);
  const categoryUrl = getCategoryPageUrl(categoryName);

  if (categoryName && categoryUrl) {
    itemListElement.push({
      "@type": "ListItem",
      position: itemListElement.length + 1,
      name: categoryName,
      item: categoryUrl,
    });
  }

  itemListElement.push({
    "@type": "ListItem",
    position: itemListElement.length + 1,
    name: cleanSeoText(product.name) || "Product",
    item: canonicalUrl,
  });

  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  });
};

const updateProductSeo = (product) => {
  const seoTitle = buildSeoTitle(product);
  const seoDescription = buildSeoDescription(product);
  const canonicalUrl = getCanonicalProductUrl(product);

  document.title = seoTitle;

  const metaDescription = ensureMetaDescription();
  metaDescription.setAttribute(
    "content",
    seoDescription
  );

  const canonical = ensureCanonical();
  canonical.setAttribute(
    "href",
    canonicalUrl
  );

  updateProductStructuredData({
    product,
    canonicalUrl,
    seoDescription,
  });

  updateBreadcrumbStructuredData({
    product,
    canonicalUrl,
  });
};

const getProductById = async () => {
  const result = await loadRuntimeCatalog();
  const normalized =
    normalizeProductCatalog(result.products);

  const slugValue =
    String(productSlug || "").toLowerCase();

  return (
    normalized.find(
      (product) =>
        product.slug === slugValue ||
        product.id === Number(productSlug)
    ) ||
    normalized[0]
  );
};

const renderGallery = (product) => {
  if (
    !productGalleryMain ||
    !productGalleryThumbs
  ) {
    return;
  }

  const isFunko =
    String(product.category || "")
      .toLowerCase()
      .startsWith("funko") ||
    String(product.brand || "")
      .toLowerCase()
      .includes("funko");

  const uniqueGalleryItems = [
    ...new Set(
      [
        product.image,
        ...(product.gallery || []),
      ].filter(Boolean)
    ),
  ];

  const galleryItems =
    isFunko
      ? uniqueGalleryItems.slice(0, 4)
      : uniqueGalleryItems;

  const mainImage = galleryItems[0];

  productGalleryMain.innerHTML =
    `<img ${createImageAttributes({
      src: mainImage,
      alt: product.name,
      loading: "eager",
    })} />`;

  productGalleryThumbs.innerHTML =
    galleryItems
      .map(
        (image, index) =>
          `<button
            type="button"
            class="gallery-thumb${
              index === 0 ? " active" : ""
            }"
            data-image="${image}"
          >
            <img ${createImageAttributes({
              src: image,
              alt: `${product.name} ${index + 1}`,
            })} />
          </button>`
      )
      .join("");

  attachPremiumFallback(
    productGalleryMain
  );

  attachPremiumFallback(
    productGalleryThumbs
  );

  productGalleryThumbs
    .querySelectorAll(".gallery-thumb")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          productGalleryMain.innerHTML =
            `<img ${createImageAttributes({
              src: button.dataset.image,
              alt: product.name,
              loading: "eager",
            })} />`;

          attachPremiumFallback(
            productGalleryMain
          );

          productGalleryThumbs
            .querySelectorAll(".gallery-thumb")
            .forEach((thumb) => {
              thumb.classList.toggle(
                "active",
                thumb === button
              );
            });
        }
      );
    });
};

const renderCollectorInfo = (product) => {
  if (!collectorInfo) {
    return;
  }

  const chips = [
    product.exclusive
      ? "Exclusief"
      : null,
    product.vaulted
      ? "Gewaardeerd"
      : null,
    product.releaseYear
      ? `Uitgebracht ${product.releaseYear}`
      : null,
    product.franchise || null,
    product.universe || null,
  ].filter(Boolean);

  collectorInfo.innerHTML =
    chips
      .map(
        (chip) =>
          `<span class="collector-chip">${chip}</span>`
      )
      .join("");
};

const renderCollectorDetails = (product) => {
  if (!collectorDetailsList) {
    return;
  }

  collectorDetailsList.innerHTML = "";

  const addDetail = (
    text,
    emphasized = false
  ) => {
    const item =
      document.createElement("li");

    if (emphasized) {
      const strong =
        document.createElement("strong");

      strong.textContent = text;
      item.appendChild(strong);
    } else {
      item.textContent = text;
    }

    collectorDetailsList.appendChild(item);
  };

  if (hasValue(product.boxCondition)) {
    addDetail(
      `Doosconditie: ${product.boxCondition}`,
      true
    );
  }

  if (product.neverOutOfBox) {
    addDetail(
      "✓ Nooit uit de doos geweest"
    );
  }

  if (product.figureLikeNew) {
    addDetail(
      "✓ Figuur in nieuwstaat"
    );
  }

  if (
    !collectorDetailsList.children.length
  ) {
    addDetail(
      "Geen aanvullende conditie-informatie opgegeven."
    );
  }
};

const renderSpecs = (product) => {
  if (!productSpecs) {
    return;
  }

  const specs = [
    ["SKU", product.sku],
    [
      "Barcode",
      isKnownBarcode(product.barcode)
        ? product.barcode
        : null,
    ],
    ["Merk", product.brand],
    ["Editie", product.edition],
    ["Staat", product.condition],
    ["Uitgavejaar", product.releaseYear],
    ["Conventie", product.convention],
    [
      "Tags",
      (product.tags || []).join(", "),
    ],
  ].filter(([, value]) =>
    hasValue(value)
  );

  productSpecs.innerHTML =
    specs.length
      ? specs
          .map(
            ([label, value]) =>
              `<li><strong>${label}:</strong> ${value}</li>`
          )
          .join("")
      : "<li>Geen aanvullende specificaties beschikbaar.</li>";
};

const bindProductCardActions = (root) => {
  root
    ?.querySelectorAll("[data-action]")
    .forEach((trigger) => {
      const product = {
        id: Number(
          trigger.dataset.productId || 0
        ),
        name:
          trigger.dataset.productName ||
          "Collectible",
        price: Number(
          trigger.dataset.productPrice || 0
        ),
        image:
          trigger.dataset.productImage ||
          "",
        universe:
          trigger.dataset.productUniverse ||
          "",
        franchise:
          trigger.dataset.productFranchise ||
          "",
        edition:
          trigger.dataset.productEdition ||
          "",
        stock: Number(
          trigger.dataset.productStock || 0
        ),
        slug:
          trigger.dataset.productSlug ||
          "",
      };

      bindShoppingActions(
        product,
        trigger
      );
    });

  attachProductCardInteractions(root);
};

const renderRelatedProducts = (
  products,
  currentProduct
) => {
  if (!relatedProducts) {
    return;
  }

  const related = products
    .filter(
      (product) =>
        product.id !== currentProduct.id &&
        product.category ===
          currentProduct.category
    )
    .slice(0, 4);

  relatedProducts.innerHTML =
    related.length
      ? related
          .map((product) =>
            createProductCardMarkup(product)
          )
          .join("")
      : '<p class="card-empty">Geen gerelateerde producten beschikbaar.</p>';

  bindProductCardActions(
    relatedProducts
  );
};

const renderRecommendedProducts = (
  products,
  currentProduct
) => {
  if (!recommendedProducts) {
    return;
  }

  const recommended = products
    .filter(
      (product) =>
        product.id !== currentProduct.id
    )
    .slice(0, 3);

  recommendedProducts.innerHTML =
    recommended.length
      ? recommended
          .map((product) =>
            createProductCardMarkup(product)
          )
          .join("")
      : '<p class="card-empty">Geen aanbevelingen beschikbaar.</p>';

  bindProductCardActions(
    recommendedProducts
  );
};

const renderRecentProducts = (
  products
) => {
  if (!recentProducts) {
    return;
  }

  const recent =
    products.slice(0, 4);

  recentProducts.innerHTML =
    recent.length
      ? recent
          .map((product) =>
            createProductCardMarkup(product)
          )
          .join("")
      : '<p class="card-empty">Recent bekeken items verschijnen hier.</p>';

  bindProductCardActions(
    recentProducts
  );
};

const storeRecentlyViewed = (product) => {
  const viewed =
    JSON.parse(
      localStorage.getItem(
        "lootifer-recent"
      ) || "[]"
    );

  const next = [
    product.id,
    ...viewed.filter(
      (id) =>
        id !== product.id
    ),
  ].slice(0, 6);

  localStorage.setItem(
    "lootifer-recent",
    JSON.stringify(next)
  );
};

const renderProduct = async () => {
  const product =
    await getProductById();

  if (!product) {
    return;
  }

  updateProductSeo(product);

  shoppingState.addRecent(product);

  renderGallery(product);

  const badges =
    getProductBadges(product);

  const badgeMarkup =
    badges.length
      ? badges
          .map(
            (badge) =>
              `<span class="collector-badge ${badge.tone}">${badge.label}</span>`
          )
          .join("")
      : `<span class="collector-badge accent">${createProductBadge(
          product
        )}</span>`;

  productBadge.innerHTML =
    `${badgeMarkup} <span class="eyebrow">${
      product.universe ||
      product.category
    }</span>`;

  productTitle.textContent =
    product.name;

  productMeta.textContent = [
    product.category,
    product.franchise,
  ]
    .filter(hasValue)
    .join(" • ");

  const infoFields = [
    [
      productNumber,
      product.number,
    ],
    [
      productUniverse,
      product.universe,
    ],
    [
      productEdition,
      product.edition,
    ],
    [
      productCondition,
      product.condition,
    ],
  ];

  infoFields.forEach(
    ([element, value]) => {
      if (!element) {
        return;
      }

      const wrapper =
        element.closest("div");

      const visible =
        hasValue(value);

      element.textContent =
        visible ? value : "";

      if (wrapper) {
        wrapper.style.display =
          visible ? "" : "none";
      }
    }
  );

  productPrice.textContent =
    getProductPriceLabel(
      product,
      formatCurrency
    );

  const stockTone =
    getStockTone(product);

  const stockCount =
    Number(product.stock) || 0;

  const stockLabel =
    stockCount <= 0
      ? "Niet op voorraad"
      : stockCount === 1
        ? "Nog 1 beschikbaar"
        : `Nog ${stockCount} beschikbaar`;

  productStock.textContent =
    stockLabel;

  productStock.className =
    `product-stock ${stockTone}`;

  productDescription.textContent =
    product.description;

  renderCollectorDetails(product);
  renderCollectorInfo(product);
  renderSpecs(product);

  currentProduct = product;

  if (addToCartButton) {
    const outOfStock = stockCount <= 0;
    addToCartButton.disabled = outOfStock;
    addToCartButton.classList.toggle("is-disabled", outOfStock);
  }

  if (wishlistButton) {
    const saved =
      shoppingState.isWishlisted(
        product.id
      );

    wishlistButton.textContent =
      saved
        ? "Uit verlanglijst verwijderen"
        : "Toevoegen aan verlanglijst";

    wishlistButton.dataset.state =
      saved
        ? "saved"
        : "unsaved";
  }

  const result =
    await loadRuntimeCatalog();

  const normalized =
    normalizeProductCatalog(
      result.products
    );

  const recentIds =
    JSON.parse(
      localStorage.getItem(
        "lootifer-recent"
      ) || "[]"
    );

  const recent =
    normalized.filter((item) =>
      recentIds.includes(item.id)
    );

  renderRelatedProducts(
    normalized,
    product
  );

  renderRecommendedProducts(
    normalized,
    product
  );

  renderRecentProducts(
    recent.length
      ? recent
      : normalized.slice(0, 4)
  );
};

wishlistButton?.addEventListener(
  "click",
  () => {
    if (!currentProduct) {
      return;
    }

    shoppingState.toggleWishlist(
      currentProduct
    );

    const saved =
      shoppingState.isWishlisted(
        currentProduct.id
      );

    wishlistButton.textContent =
      saved
        ? "Uit verlanglijst verwijderen"
        : "Toevoegen aan verlanglijst";

    syncHeaderCounters();
  }
);

addToCartButton?.addEventListener(
  "click",
  () => {
    if (!currentProduct) {
      return;
    }

    const result = shoppingState.addToCart(
      currentProduct
    );

    const label =
      addToCartButton.querySelector(
        ".cart-button-label"
      ) || addToCartButton;

    if (result.added) {
      label.textContent = "Toegevoegd ✓";

      syncHeaderCounters();

      setTimeout(() => {
        label.textContent =
          addToCartButton.dataset
            .defaultLabel ||
          "In winkelwagen";
      }, 1200);
    } else if (
      result.reason === "out-of-stock"
    ) {
      addToCartButton.disabled = true;
      addToCartButton.classList.add(
        "is-disabled"
      );
    }
  }
);

bindProductCardActions(document);

renderProduct();

window.addEventListener(
  "lootifer:inventory-updated",
  () => {
    renderProduct().catch(
      (error) => {
        console.error(
          "Product kon niet worden vernieuwd:",
          error
        );
      }
    );
  }
);