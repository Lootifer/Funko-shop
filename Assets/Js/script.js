import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createShoppingUi } from "../../Components/Experience/shopping-ui.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";
import { loadRuntimeCatalog } from "../../Products/runtime-catalog.js";
import { createImageAttributes, attachPremiumFallback } from "../../Products/product-media.js";
import { getSellingPrice, getValidDiscountPrice } from "../../Products/product-pricing.js";
import { formatCurrency } from "./formatting.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");

if (headerRoot) headerRoot.innerHTML = createHeader("home");
if (footerRoot) footerRoot.innerHTML = createFooter();

const shoppingRoot = document.createElement("div");
shoppingRoot.id = "shoppingRoot";
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });

const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -4%" }
    )
  : null;

const observeRevealItems = (root = document) => {
  root.querySelectorAll?.(".reveal:not(.visible)").forEach((item, index) => {
    item.style.setProperty("--reveal-delay", `${Math.min(index * 55, 250)}ms`);
    if (revealObserver) revealObserver.observe(item);
    else item.classList.add("visible");
  });
};

observeRevealItems();

const clubForm = document.getElementById("clubForm");
const clubEmail = document.getElementById("clubEmail");
const clubMessage = document.getElementById("clubMessage");

clubForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!clubEmail?.value) return;
  shoppingState.subscribeToClub(clubEmail.value);
  if (clubMessage) {
    const language = window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en";
    clubMessage.textContent = language === "nl"
      ? "Je staat op de meldlijst. Nieuwe toevoegingen kunnen hier later worden gedeeld."
      : "You are on the alert list. New additions can be shared here later.";
  }
  clubForm.reset();
});

const normalize = (value = "") => String(value).trim().toLowerCase();
const includesAny = (value, keys) => keys.some((key) => normalize(value).includes(normalize(key)));
const countProducts = (products, predicate) => products.filter(predicate).length;

const productHaystack = (product = {}) =>
  [product.brand, product.category, product.universe, product.franchise, ...(Array.isArray(product.tags) ? product.tags : [])]
    .map(normalize)
    .join(" ");

const matchesCollection = (product, key) => {
  const haystack = productHaystack(product);
  if (key === "all") return true;
  if (key === "funko") return haystack.includes("funko");
  if (key === "lego") return haystack.includes("lego");
  if (key === "pokemon") return haystack.includes("pokemon") || haystack.includes("pokémon");
  if (key === "star-wars") return haystack.includes("star wars");
  if (key === "harry-potter") return haystack.includes("harry potter");
  if (key === "sale") return getValidDiscountPrice(product) !== null;
  return true;
};

const updateCategoryCounts = (products = []) => {
  const counts = {
    funko: countProducts(products, (product) => matchesCollection(product, "funko")),
    lego: countProducts(products, (product) => matchesCollection(product, "lego")),
    pokemon: countProducts(products, (product) => matchesCollection(product, "pokemon")),
    "star-wars": countProducts(products, (product) => matchesCollection(product, "star-wars")),
    "harry-potter": countProducts(products, (product) => matchesCollection(product, "harry-potter")),
    sale: countProducts(products, (product) => matchesCollection(product, "sale")),
  };

  Object.entries(counts).forEach(([key, value]) => {
    document.querySelectorAll(`[data-category-count="${key}"]`).forEach((element) => {
      element.textContent = String(value);
    });
  });

  document.querySelectorAll("[data-funko-count]").forEach((element) => {
    const category = element.dataset.funkoCount || "";
    const value = countProducts(products, (product) => normalize(product.category) === normalize(category));
    element.textContent = String(value);
  });
};

const highlightGrid = document.getElementById("highlightGrid");

const normalizeHomepageCrop = (value = {}) => {
  const clamp = (number, min, max) => Math.min(max, Math.max(min, number));
  const x = Number(value?.x);
  const y = Number(value?.y);
  const zoom = Number(value?.zoom);

  return {
    x: Number.isFinite(x) ? clamp(x, 0, 100) : 50,
    y: Number.isFinite(y) ? clamp(y, 0, 100) : 50,
    zoom: Number.isFinite(zoom) ? clamp(zoom, 1, 3) : 1,
  };
};

let runtimeProducts = [];
let homepageSettings = {
  display: Array.from({ length: 3 }, () => ({ image: "" })),
  highlights: Array.from({ length: 6 }, () => ({
    productId: null,
    image: "",
    crop: normalizeHomepageCrop(),
  })),
};

const HOMEPAGE_SETTINGS_URL = "https://funko-shop-production-9308.up.railway.app/api/site/homepage";

const loadHomepageSettings = async () => {
  try {
    const response = await fetch(HOMEPAGE_SETTINGS_URL, { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error(`Homepage settings ${response.status}`);
    const data = await response.json();
    homepageSettings = {
      display: Array.from({ length: 3 }, (_, index) => ({ image: String(data?.display?.[index]?.image || "") })),
      highlights: Array.from({ length: 6 }, (_, index) => ({
        productId: Number(data?.highlights?.[index]?.productId) || null,
        image: String(data?.highlights?.[index]?.image || ""),
        crop: normalizeHomepageCrop(data?.highlights?.[index]?.crop),
      })),
    };
  } catch {
    // The homepage remains usable when the local API is offline.
  }
  return homepageSettings;
};

const applyHomepageDisplay = () => {
  document.querySelectorAll("[data-home-extra-slot]").forEach((image) => {
    const slotNumber = Number(image.dataset.homeExtraSlot || 0);
    const index = Math.max(0, slotNumber - 1);
    const entry = homepageSettings.highlights?.[index] || {};
    const product = runtimeProducts.find(
      (item) => Number(item.id) === Number(entry.productId)
    ) || null;
    const source = String(
      entry.image ||
      product?.image ||
      product?.thumbnail ||
      ""
    ).trim();
    const wrapper = image.closest(".display-placeholder");
    const fallback = wrapper?.querySelector("span");
    const crop = normalizeHomepageCrop(entry.crop);
    const productUrl = product?.slug
      ? `product.html?slug=${encodeURIComponent(product.slug)}`
      : "";

    if (wrapper) {
      wrapper.style.height = "82%";
      wrapper.style.width = "auto";
      wrapper.style.aspectRatio = "3 / 4";
      wrapper.style.margin = "0";
      wrapper.style.overflow = "hidden";
      wrapper.style.cursor = productUrl ? "pointer" : "default";

      if (productUrl) {
        wrapper.setAttribute("role", "link");
        wrapper.setAttribute("tabindex", "0");
        wrapper.setAttribute(
          "aria-label",
          `Bekijk ${product?.name || "dit product"}`
        );

        wrapper.onclick = () => {
          window.location.href = productUrl;
        };

        wrapper.onkeydown = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            window.location.href = productUrl;
          }
        };
      } else {
        wrapper.removeAttribute("role");
        wrapper.removeAttribute("tabindex");
        wrapper.removeAttribute("aria-label");
        wrapper.onclick = null;
        wrapper.onkeydown = null;
      }
    }

    if (source) {
      image.src = source;
      image.alt = product?.name || `Featured collectible ${slotNumber}`;
      image.hidden = false;

      image.style.objectFit = "cover";
      image.style.objectPosition = `${crop.x}% ${crop.y}%`;
      image.style.transformOrigin = "center center";
      image.style.transform = `scale(${crop.zoom})`;
      image.style.pointerEvents = "none";

      wrapper?.classList.add("has-image");
      if (fallback) fallback.hidden = true;
    } else {
      image.removeAttribute("src");
      image.hidden = true;
      image.style.removeProperty("object-fit");
      image.style.removeProperty("object-position");
      image.style.removeProperty("transform-origin");
      image.style.removeProperty("transform");
      image.style.removeProperty("pointer-events");

      wrapper?.classList.remove("has-image");

      if (wrapper) {
        wrapper.style.cursor = "default";
        wrapper.removeAttribute("role");
        wrapper.removeAttribute("tabindex");
        wrapper.removeAttribute("aria-label");
        wrapper.onclick = null;
        wrapper.onkeydown = null;
      }

      if (fallback) fallback.hidden = false;
    }
  });
};

const getHighlightAccent = (product = {}, index = 0) => {
  if (getValidDiscountPrice(product) !== null) return "#ff9456";
  if (matchesCollection(product, "pokemon")) return "#f2cd37";
  if (matchesCollection(product, "star-wars")) return "#71bfff";
  if (matchesCollection(product, "harry-potter")) return "#d9ad58";
  if (matchesCollection(product, "lego")) return "#e44d3e";
  return ["#e2b83f", "#8cc8ff", "#d8a5ff", "#72d6b2", "#ffad7d", "#e2b83f"][index % 6];
};

const getAutoHighlightProducts = () => {
  const activeProducts = runtimeProducts.filter((product) => {
    const status = normalize(product.status || "active");
    return !product.archived && status !== "archived";
  });

  return activeProducts
    .sort((left, right) => {
      const leftFeatured = left.homepageHighlight === true || left.featured === true ? 1 : 0;
      const rightFeatured = right.homepageHighlight === true || right.featured === true ? 1 : 0;
      const leftSale = getValidDiscountPrice(left) !== null ? 1 : 0;
      const rightSale = getValidDiscountPrice(right) !== null ? 1 : 0;
      return rightFeatured - leftFeatured || rightSale - leftSale || Number(right.id || 0) - Number(left.id || 0);
    })
    .slice(0, 6);
};

const getHighlightSlots = () => {
  const configured = Array.isArray(homepageSettings.highlights) ? homepageSettings.highlights : [];
  const hasManualConfiguration = configured.some((entry) => Number(entry?.productId) || entry?.image);
  if (!hasManualConfiguration) {
    return getAutoHighlightProducts().map((product) => ({ product, image: "" }));
  }

  return Array.from({ length: 6 }, (_, index) => {
    const entry = configured[index] || {};
    const product = runtimeProducts.find((item) => Number(item.id) === Number(entry.productId)) || null;
    return { product, image: String(entry.image || "") };
  });
};

const getPageLanguage = () =>
  window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en";

const highlightPlaceholderCopy = {
  en: {
    label: "Coming soon",
    title: "A new collectible will take its place here.",
    link: "Explore the collection",
    priceRequest: "Price on request",
    manualTitle: "Collection highlight",
  },
  nl: {
    label: "Binnenkort",
    title: "Een nieuwe vondst krijgt hier een plek.",
    link: "Ontdek de collectie",
    priceRequest: "Prijs op aanvraag",
    manualTitle: "Collectie-highlight",
  },
};

const renderHighlightPlaceholder = (index) => {
  const copy = highlightPlaceholderCopy[getPageLanguage()];
  return `
  <a class="highlight-card highlight-card-placeholder" href="shop.html" style="--highlight-accent:${getHighlightAccent({}, index)}">
    <div class="highlight-media highlight-placeholder-media">
      <span class="highlight-slot-number">0${index + 1}</span>
      <span class="highlight-placeholder-box"><i></i></span>
    </div>
    <div class="highlight-copy">
      <small>${copy.label}</small>
      <h3>${copy.title}</h3>
      <div class="highlight-card-footer"><span class="highlight-price">${copy.link}</span><span class="highlight-open" aria-hidden="true">→</span></div>
    </div>
  </a>`;
};

const renderHighlights = () => {
  if (!highlightGrid) return;

  const slots = getHighlightSlots();
  const cards = slots.map((entry, index) => {
    const product = entry?.product || null;
    const customImage = entry?.image || "";
    if (!product && !customImage) return renderHighlightPlaceholder(index);

    if (!product) {
      const copy = highlightPlaceholderCopy[getPageLanguage()];
      return `
        <a class="highlight-card" href="shop.html" style="--highlight-accent:${getHighlightAccent({}, index)}">
          <div class="highlight-media">
            <span class="highlight-slot-number">0${index + 1}</span>
            <img ${createImageAttributes({ src: customImage, alt: copy.manualTitle })} />
          </div>
          <div class="highlight-copy">
            <small>Lootifer</small>
            <h3>${copy.manualTitle}</h3>
            <div class="highlight-card-footer"><span class="highlight-price">${copy.link}</span><span class="highlight-open" aria-hidden="true">→</span></div>
          </div>
        </a>`;
    }

    const discount = getValidDiscountPrice(product);
    const selling = getSellingPrice(product);
    const displayPrice = discount ?? selling;
    const badge = discount !== null ? "Sale" : product.exclusive ? "Exclusive" : product.category || "Collectible";
    const badgeClass = discount !== null ? " sale" : "";
    const label = product.universe || product.brand || product.category || "Collectible";
    const slug = encodeURIComponent(product.slug || "");
    const accent = getHighlightAccent(product, index);
    const image = customImage || product.image;

    return `
      <a class="highlight-card" href="product.html?slug=${slug}" style="--highlight-accent:${accent}">
        <div class="highlight-media">
          <span class="highlight-slot-number">0${index + 1}</span>
          <span class="highlight-badge${badgeClass}">${badge}</span>
          <img ${createImageAttributes({ src: image, alt: product.name || "Collectible" })} />
        </div>
        <div class="highlight-copy">
          <small>${label}</small>
          <h3>${product.name || "Collectible"}</h3>
          <div class="highlight-card-footer">
            <span class="highlight-price">${discount !== null ? `<del>${formatCurrency(selling)}</del>` : ""}${selling > 0 ? formatCurrency(displayPrice) : highlightPlaceholderCopy[getPageLanguage()].priceRequest}</span>
            <span class="highlight-open" aria-hidden="true">→</span>
          </div>
        </div>
      </a>`;
  });

  while (cards.length < 6) cards.push(renderHighlightPlaceholder(cards.length));
  highlightGrid.innerHTML = cards.join("");
  attachPremiumFallback(highlightGrid);
  bindDepthTracking(highlightGrid);
};

const loadHomepageCatalog = async () => {
  try {
    const [result] = await Promise.all([loadRuntimeCatalog(), loadHomepageSettings()]);
    runtimeProducts = result.products || [];
    updateCategoryCounts(runtimeProducts);
    applyHomepageDisplay();
    renderHighlights();
  } catch (error) {
    console.error("Categorie-aantallen konden niet worden geladen", error);
    runtimeProducts = [];
    updateCategoryCounts([]);
    applyHomepageDisplay();
    renderHighlights();
  }
};

const funkoToggle = document.getElementById("funkoCategoryToggle");
const funkoPanel = document.getElementById("funkoCategoryPanel");
const funkoFocusOverlay = document.getElementById("funkoFocusOverlay");
const funkoPanelClose = document.getElementById("funkoPanelClose");

// Move the modal elements to <body>. This prevents transformed/reveal wrappers
// from changing the coordinate system of the fixed Funko submenu.
if (funkoFocusOverlay && funkoFocusOverlay.parentElement !== document.body) {
  document.body.appendChild(funkoFocusOverlay);
}
if (funkoPanel && funkoPanel.parentElement !== document.body) {
  document.body.appendChild(funkoPanel);
}

const positionFunkoPanel = () => {
  if (!funkoToggle || !funkoPanel) return;

  const rect = funkoToggle.getBoundingClientRect();
  const viewportMargin = 12;
  const headerSafeTop = 74;
  const preferredTop = rect.bottom + 8;
  const preferredHeight = Math.min(560, Math.max(360, window.innerHeight * 0.58));
  const availableBelow = window.innerHeight - preferredTop - viewportMargin;

  // Keep it directly below the Funko tile whenever there is enough room.
  // On a short screen it may overlap the tile slightly rather than dropping
  // to the bottom of the page.
  const panelTop = availableBelow >= 330
    ? preferredTop
    : Math.max(headerSafeTop, window.innerHeight - preferredHeight - viewportMargin);

  const panelMaxHeight = Math.max(300, window.innerHeight - panelTop - viewportMargin);
  const panelWidth = Math.min(1220, window.innerWidth - (viewportMargin * 2));
  const centeredLeft = window.innerWidth / 2;
  const panelLeftEdge = centeredLeft - (panelWidth / 2);
  const toggleCenter = rect.left + (rect.width / 2);
  const pointerPercent = Math.max(
    5,
    Math.min(95, ((toggleCenter - panelLeftEdge) / panelWidth) * 100)
  );

  funkoPanel.style.setProperty("--funko-panel-top", `${Math.round(panelTop)}px`);
  funkoPanel.style.setProperty("--funko-panel-left", `${Math.round(centeredLeft)}px`);
  funkoPanel.style.setProperty("--funko-panel-width", `${Math.round(panelWidth)}px`);
  funkoPanel.style.setProperty("--funko-panel-max-height", `${Math.round(panelMaxHeight)}px`);
  funkoPanel.style.setProperty("--funko-panel-pointer", `${pointerPercent.toFixed(2)}%`);
};

const setFunkoPanelOpen = (open) => {
  if (!funkoToggle || !funkoPanel) return;
  if (open) positionFunkoPanel();
  funkoToggle.classList.toggle("is-active", open);
  funkoPanel.classList.toggle("is-open", open);
  funkoToggle.setAttribute("aria-expanded", String(open));
  funkoPanel.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("funko-panel-open", open);

  if (open) {
    window.setTimeout(() => funkoPanelClose?.focus({ preventScroll: true }), 180);
  } else if (document.activeElement && funkoPanel.contains(document.activeElement)) {
    funkoToggle.focus({ preventScroll: true });
  }
};

funkoToggle?.addEventListener("click", () => {
  setFunkoPanelOpen(funkoToggle.getAttribute("aria-expanded") !== "true");
});
funkoFocusOverlay?.addEventListener("click", () => setFunkoPanelOpen(false));
funkoPanelClose?.addEventListener("click", () => setFunkoPanelOpen(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setFunkoPanelOpen(false);
});

window.addEventListener("resize", () => {
  if (funkoPanel?.classList.contains("is-open")) positionFunkoPanel();
});

const heroStage = document.getElementById("heroStage");

if (heroStage && !prefersReducedMotion) {
  heroStage.addEventListener("pointermove", (event) => {
    const rect = heroStage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    heroStage.style.setProperty("--stage-ry", `${((x - 0.5) * 6).toFixed(2)}deg`);
    heroStage.style.setProperty("--stage-rx", `${((0.5 - y) * 5).toFixed(2)}deg`);
    heroStage.style.setProperty("--glow-x", `${(x * 100).toFixed(1)}%`);
    heroStage.style.setProperty("--glow-y", `${(y * 100).toFixed(1)}%`);
  });

  heroStage.addEventListener("pointerleave", () => {
    heroStage.style.setProperty("--stage-ry", "0deg");
    heroStage.style.setProperty("--stage-rx", "0deg");
    heroStage.style.setProperty("--glow-x", "50%");
    heroStage.style.setProperty("--glow-y", "36%");
  });
}

function bindDepthTracking(root = document) {
  if (prefersReducedMotion) return;
  root.querySelectorAll?.(".depth-card, .category-hub-card, .funko-subcategory-card, .highlight-card").forEach((card) => {
    if (card.dataset.depthBound === "true") return;
    card.dataset.depthBound = "true";
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    });
  });
}

const translations = {
  nl: {
    "hero.eyebrow": "Particuliere collectie • nieuw en tweedehands",
    "hero.title": "Elke collectie vertelt een verhaal.",
    "hero.kicker": "Begin jouw volgende hoofdstuk.",
    "hero.text": "Nieuw en tweedehands verzamelobjecten uit mijn privécollectie. Elk item wordt zo duidelijk mogelijk gefotografeerd en beschreven.",
    "hero.shop": "Bekijk de collectie",
    "hero.categories": "Bekijk categorieën",
    "hero.note": "Van mijn verzameling naar die van jou",
    "categories.eyebrow": "Kies jouw wereld",
    "categories.title": "Zes collecties. Eén plek.",
    "categories.all": "Bekijk alles",
    "card.funko.kicker": "Hoofdcategorie",
    "card.lego.kicker": "Bouwen & verzamelen",
    "card.pokemon.kicker": "Creature collecting",
    "card.starwars.kicker": "Een ver sterrenstelsel",
    "card.harry.kicker": "Magische wereld",
    "card.sale.kicker": "Tijdelijk voordeliger",
    "card.explore": "Ontdek",
    "card.sale.explore": "Ontdek de sale",
    "funko.eyebrow": "Funko collectie",
    "funko.title": "Kies jouw Funko-lijn.",
    "funko.text": "Van films en televisie tot games, pins en Bitty Pop.",
    "highlights.eyebrow": "Uitgelicht",
    "highlights.title": "Highlights uit de collectie.",
    "highlights.all": "Alles bekijken",
    "highlights.intro": "Zes opvallende vondsten, compact gepresenteerd. Nieuwe producten kunnen hier automatisch verschijnen.",
    "benefit.private.title": "Privécollectie",
    "benefit.private.text": "Van mijn verzameling naar die van jou.",
    "benefit.checked.title": "Zorgvuldig bekeken",
    "benefit.checked.text": "Foto’s en staat worden zo duidelijk mogelijk getoond.",
    "benefit.packed.title": "Goed verpakt",
    "benefit.packed.text": "Beschermd verzonden met Track & Trace.",
    "benefit.collectors.title": "Voor verzamelaars",
    "benefit.collectors.text": "Gemaakt vanuit dezelfde passie voor verzamelen.",
    "club.eyebrow": "Lootifer meldlijst",
    "club.title": "Mis een nieuwe toevoeging niet.",
    "club.text": "Bewaar je e-mailadres lokaal in je browser voor toekomstige meldingen over nieuwe collectibles en beperkte beschikbaarheid.",
    "club.placeholder": "Jouw e-mailadres",
    "club.button": "Aanmelden",
    "club.note": "Geen spam — alleen updates voor verzamelaars.",
  },
  en: {
    "hero.eyebrow": "Private collection • new and pre-owned",
    "hero.title": "Every collection tells a story.",
    "hero.kicker": "Begin your next chapter.",
    "hero.text": "New and pre-owned collectibles from my private collection. Every item is photographed and described as clearly as possible.",
    "hero.shop": "Explore the collection",
    "hero.categories": "Browse categories",
    "hero.note": "From my collection to yours",
    "categories.eyebrow": "Choose your world",
    "categories.title": "Six collections. One place.",
    "categories.all": "View all",
    "card.funko.kicker": "Main category",
    "card.lego.kicker": "Build & collect",
    "card.pokemon.kicker": "Creature collecting",
    "card.starwars.kicker": "A galaxy far away",
    "card.harry.kicker": "Wizarding world",
    "card.sale.kicker": "Limited-time savings",
    "card.explore": "Explore",
    "card.sale.explore": "Explore sale",
    "funko.eyebrow": "Funko collection",
    "funko.title": "Choose your Funko line.",
    "funko.text": "From movies and television to games, pins and Bitty Pop.",
    "highlights.eyebrow": "Featured",
    "highlights.title": "Highlights from the collection.",
    "highlights.all": "View all",
    "highlights.intro": "Six standout finds, presented clearly. New products can appear here automatically.",
    "benefit.private.title": "Private collection",
    "benefit.private.text": "From my collection to yours.",
    "benefit.checked.title": "Carefully checked",
    "benefit.checked.text": "Photos and condition are shown as clearly as possible.",
    "benefit.packed.title": "Carefully packed",
    "benefit.packed.text": "Protected shipping with Track & Trace.",
    "benefit.collectors.title": "For collectors",
    "benefit.collectors.text": "Built from the same passion for collecting.",
    "club.eyebrow": "Lootifer alerts",
    "club.title": "Never miss a new addition.",
    "club.text": "Save your email address locally in your browser for future alerts about new collectibles and limited availability.",
    "club.placeholder": "Your email address",
    "club.button": "Sign up",
    "club.note": "No spam — only collector updates.",
  },
};

const applyPageLanguage = (language = "en") => {
  const dictionary = translations[language] || translations.en;
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = dictionary[element.dataset.i18n];
    if (value) element.textContent = value;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const value = dictionary[element.dataset.i18nPlaceholder];
    if (value) element.setAttribute("placeholder", value);
  });
};

applyPageLanguage(window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en");
window.addEventListener("lootifer:language-change", (event) => {
  applyPageLanguage(event.detail?.language || "en");
  renderHighlights();
});

if (!prefersReducedMotion) {
  let ticking = false;
  const updateParallax = () => {
    document.documentElement.style.setProperty("--page-scroll", String(window.scrollY));
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateParallax);
  }, { passive: true });
  updateParallax();
}

bindDepthTracking();
loadHomepageCatalog();
window.addEventListener("lootifer:inventory-updated", loadHomepageCatalog);
