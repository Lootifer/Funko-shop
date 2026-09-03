import { normalizeProductCatalog } from "../../Products/product-schema.js";
import { createProductCard } from "../../Components/ProductCard.js";
import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createFilterSidebar } from "../../Components/FilterSidebar.js";
import {
  createShoppingUi,
  bindShoppingActions,
  attachProductCardInteractions,
  syncHeaderCounters,
} from "../../Components/Experience/shopping-ui.js";
import { attachPremiumFallback } from "../../Products/product-media.js";
import { formatCurrency } from "./formatting.js";
import {
  getDisplayPrice,
  hasValidSellingPrice,
} from "../../Products/product-pricing.js";
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

let pokemonQuickFilter = "all";

const getShopLanguage = () =>
  window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en";

const shopCopy = () =>
  getShopLanguage() === "nl"
    ? {
        products: "producten gevonden",
        product: "product gevonden",
        active: "Actieve filters",
        none: "geen",
        search: "Zoekterm",
        category: "Categorie",
        universe: "Universum",
        brand: "Merk",
        price: "Prijs",
        exclusive: "Exclusief",
        chase: "Chase",
        vaulted: "Gewaardeerd",
        stock: "Op voorraad",
        until: "Tot",
        empty: "Er passen geen verzamelitems bij de huidige filters.",
        emptyCurated:
          "Er zijn nog geen verzamelitems aan deze collectie toegevoegd.",
        unavailable: "De productcatalogus is momenteel niet beschikbaar.",
        loading: "Producten worden geladen…",
      }
    : {
        products: "products found",
        product: "product found",
        active: "Active filters",
        none: "none",
        search: "Search",
        category: "Category",
        universe: "Universe",
        brand: "Brand",
        price: "Price",
        exclusive: "Exclusive",
        chase: "Chase",
        vaulted: "Vaulted",
        stock: "In stock",
        until: "Up to",
        empty: "No collectibles match the current filters.",
        emptyCurated:
          "No collectibles have been added to this collection yet.",
        unavailable: "The product catalogue is currently unavailable.",
        loading: "Products are loading…",
      };

const SHOP_PAGE_COPY = {
  en: {
    all: {
      eyebrow: "All products",
      title: "Search the complete vault.",
      text: "Use the filters to browse every available collectible.",
    },
    funko: {
      eyebrow: "Funko",
      title: "All Funko lines together.",
      text: "From Movies and Television to Heroes, Games, Pins, Bitty Pop and Tee.",
    },
    lego: {
      eyebrow: "LEGO",
      title: "Build, play and collect.",
      text: "Discover LEGO collectibles from the private collection.",
    },
    pokemon: {
      eyebrow: "Pokémon",
      title: "For trainers and collectors.",
      text: "Discover Pokémon collectibles from the private collection.",
    },
    "star-wars": {
      eyebrow: "Star Wars",
      title: "From a galaxy far, far away.",
      text: "Discover Star Wars collectibles from the private collection.",
    },
    "harry-potter": {
      eyebrow: "Harry Potter",
      title: "A magical collection.",
      text: "Discover Harry Potter collectibles from the private collection.",
    },
    sale: {
      eyebrow: "Sale",
      title: "Collectibles at a lower price.",
      text: "Browse products with a valid reduced price.",
    },
    sort: [
      "Newest",
      "Price low to high",
      "Price high to low",
      "Alphabetical",
    ],
    backFunko: "← Back to all Funko lines",
  },

  nl: {
    all: {
      eyebrow: "Alle producten",
      title: "Doorzoek de volledige kluis.",
      text: "Gebruik de filters om alle beschikbare verzamelitems te doorzoeken.",
    },
    funko: {
      eyebrow: "Funko",
      title: "Alle Funko-lijnen bij elkaar.",
      text: "Van Movies en Television tot Heroes, Games, Pins, Bitty Pop en Tee.",
    },
    lego: {
      eyebrow: "LEGO",
      title: "Bouwen, spelen en verzamelen.",
      text: "Ontdek LEGO-verzamelstukken uit de privécollectie.",
    },
    pokemon: {
      eyebrow: "Pokémon",
      title: "Voor trainers en verzamelaars.",
      text: "Ontdek Pokémon-verzamelstukken uit de privécollectie.",
    },
    "star-wars": {
      eyebrow: "Star Wars",
      title: "Uit een sterrenstelsel ver, ver weg.",
      text: "Ontdek Star Wars-verzamelstukken uit de privécollectie.",
    },
    "harry-potter": {
      eyebrow: "Harry Potter",
      title: "Een magische verzameling.",
      text: "Ontdek Harry Potter-verzamelstukken uit de privécollectie.",
    },
    sale: {
      eyebrow: "Sale",
      title: "Verzamelitems voor een lagere prijs.",
      text: "Bekijk producten met een geldige kortingsprijs.",
    },
    sort: [
      "Nieuwste",
      "Prijs laag naar hoog",
      "Prijs hoog naar laag",
      "Alfabetisch",
    ],
    backFunko: "← Terug naar alle Funko-lijnen",
  },
};

const CATEGORY_GRID_COPY = {
  en: {
    common: {
      spots: "16 display spots",
      admin: "Filled automatically from Admin",
      sort: "Arrange the shelf",
    },
    lego: {
      kicker: "THE BUILDER'S SHELF",
      title: "Ready to build your collection?",
      text: "A clear 4 × 4 display with every product added from Admin.",
    },
    pokemon: {
      kicker: "CREATURE COLLECTION",
      title: "Choose your next discovery.",
      text: "Sixteen showcase positions for figures, cards and special finds from Admin.",
    },
    "star-wars": {
      kicker: "THE GALACTIC ARCHIVE",
      title: "Signals from the collection.",
      text: "A cinematic 4 × 4 display for every item assigned to Star Wars in Admin.",
    },
    "harry-potter": {
      kicker: "THE ENCHANTED CABINET",
      title: "Every shelf holds a new story.",
      text: "A magical 4 × 4 display for products assigned to Harry Potter in Admin.",
    },
    "Collectible Lamps": {
      kicker: "THE LIGHT ROOM",
      title: "A brighter kind of collectible.",
      text: "Collectible lamps and character lights from the private collection.",
    },
    "Figures & Toys": {
      kicker: "THE TOY SHELF",
      title: "Find something with character.",
      text: "Figures, toys and character collectibles from the private collection.",
    },
    "Vintage Figures": {
      kicker: "THE VINTAGE SHELF",
      title: "Old favourites. New homes.",
      text: "Original vintage figures and nostalgic finds from the private collection.",
    },
    "Hot Wheels": {
      kicker: "THE GARAGE",
      title: "Choose your next ride.",
      text: "Used Hot Wheels, special castings and collectible cars from the private collection.",
    },
    "FIFA 365 Cards": {
      kicker: "THE TRADING CARD SHELF",
      title: "Build your ultimate lineup.",
      text: "FIFA 365 Cards and Panini football trading cards from the private collection.",
    },
    "Donald Duck Strips": {
      kicker: "THE COMIC SHELF",
      title: "Turn the page on a new find.",
      text: "Donald Duck comics and collectible strip issues from the private collection.",
    },
    "Bordspellen & Games": {
      kicker: "THE GAME TABLE",
      title: "Pick your next game night.",
      text: "Board games and collectible games from the private collection.",
    },
    sale: {
      kicker: "THE GOLDEN DROP",
      title: "Limited offers. Lasting stories.",
      text: "Sixteen clear positions for every product with a valid discount price.",
    },
  },

  nl: {
    common: {
      spots: "16 presentatieplekken",
      admin: "Automatisch gevuld vanuit Admin",
      sort: "Rangschik de collectie",
    },
    lego: {
      kicker: "DE BOUWERSPLANK",
      title: "Klaar om je collectie te bouwen?",
      text: "Een helder 4 × 4-overzicht met elk product dat via Admin wordt toegevoegd.",
    },
    pokemon: {
      kicker: "WEZENSCOLLECTIE",
      title: "Kies je volgende ontdekking.",
      text: "Zestien presentatieplekken voor figuren, kaarten en bijzondere vondsten uit Admin.",
    },
    "star-wars": {
      kicker: "HET GALACTISCHE ARCHIEF",
      title: "Signalen uit de collectie.",
      text: "Een filmisch 4 × 4-overzicht voor elk item dat in Admin aan Star Wars is gekoppeld.",
    },
    "harry-potter": {
      kicker: "DE BETOVERDE KAST",
      title: "Elke plank bewaart een nieuw verhaal.",
      text: "Een magisch 4 × 4-overzicht voor producten die in Admin aan Harry Potter zijn gekoppeld.",
    },
    "Collectible Lamps": {
      kicker: "DE LICHTKAMER",
      title: "Een verzamelitem dat licht geeft.",
      text: "Verzamellampen en karakterlampen uit de privécollectie.",
    },
    "Figures & Toys": {
      kicker: "DE SPEELGOEDPLANK",
      title: "Vind iets met karakter.",
      text: "Figuren, speelgoed en karakterverzamelitems uit de privécollectie.",
    },
    "Vintage Figures": {
      kicker: "DE VINTAGEPLANK",
      title: "Oude favorieten. Nieuwe eigenaren.",
      text: "Originele vintage figuren en nostalgische vondsten uit de privécollectie.",
    },
    "Hot Wheels": {
      kicker: "DE GARAGE",
      title: "Kies je volgende model.",
      text: "Gebruikte Hot Wheels, bijzondere castings en verzamelauto's uit de privécollectie.",
    },
    "FIFA 365 Cards": {
      kicker: "DE KAARTENPLANK",
      title: "Bouw jouw ultieme opstelling.",
      text: "FIFA 365 Cards en Panini voetbalkaarten uit de privécollectie.",
    },
    "Donald Duck Strips": {
      kicker: "DE STRIPPLANK",
      title: "Sla een nieuw avontuur open.",
      text: "Donald Duck strips en verzamelwaardige stripuitgaven uit de privécollectie.",
    },
    "Bordspellen & Games": {
      kicker: "DE SPELLENTAFEL",
      title: "Kies je volgende speelavond.",
      text: "Bordspellen en verzamelwaardige games uit de privécollectie.",
    },
    sale: {
      kicker: "DE GOUDEN DROP",
      title: "Tijdelijke deals. Blijvende verhalen.",
      text: "Zestien heldere plekken voor elk product met een geldige kortingsprijs.",
    },
  },
};

const FIXED_PAGE_COPY = {
  "Funko Movies": {
    en: [
      "Funko • Movies",
      "Funko from movies.",
      "Browse Funko collectibles from movies.",
    ],
    nl: [
      "Funko • Movies",
      "Funko uit films.",
      "Bekijk Funko-verzamelstukken uit films.",
    ],
  },

  "Funko Television": {
    en: [
      "Funko • Television",
      "Funko from television.",
      "Browse Funko collectibles from television.",
    ],
    nl: [
      "Funko • Television",
      "Funko uit televisie.",
      "Bekijk Funko-verzamelstukken uit televisie.",
    ],
  },

  "Funko Animation": {
    en: [
      "Funko • Animation",
      "Animated worlds in Funko form.",
      "Browse Funko collectibles from animation.",
    ],
    nl: [
      "Funko • Animation",
      "Animatiewerelden als Funko.",
      "Bekijk Funko-verzamelstukken uit animatie.",
    ],
  },

  "Funko Games": {
    en: [
      "Funko • Games",
      "Gaming characters to collect.",
      "Browse Funko collectibles from games.",
    ],
    nl: [
      "Funko • Games",
      "Gamepersonages om te verzamelen.",
      "Bekijk Funko-verzamelstukken uit games.",
    ],
  },

  "Funko Heroes": {
    en: [
      "Funko • Heroes",
      "Heroes and villains together.",
      "Browse Funko Heroes collectibles.",
    ],
    nl: [
      "Funko • Heroes",
      "Helden en schurken bij elkaar.",
      "Bekijk Funko Heroes-verzamelstukken.",
    ],
  },

  "Funko Pin": {
    en: [
      "Funko • Pin",
      "Small collectibles with character.",
      "Browse Funko pins.",
    ],
    nl: [
      "Funko • Pin",
      "Kleine verzamelitems met karakter.",
      "Bekijk Funko-pins.",
    ],
  },

  "Funko Bitty Pop": {
    en: [
      "Funko • Bitty Pop",
      "Tiny figures, big collection.",
      "Browse Funko Bitty Pop collectibles.",
    ],
    nl: [
      "Funko • Bitty Pop",
      "Kleine figuren, grote collectie.",
      "Bekijk Funko Bitty Pop-verzamelstukken.",
    ],
  },

  "Funko Tee": {
    en: [
      "Funko • Tee",
      "Collectible shirts and sets.",
      "Browse Funko Tee products.",
    ],
    nl: [
      "Funko • Tee",
      "Verzamelshirts en sets.",
      "Bekijk Funko Tee-producten.",
    ],
  },

  "Collectible Lamps": {
    en: [
      "Collectible Lamps",
      "Light up the collection.",
      "Discover decorative collectible lamps and character lights from the private collection.",
    ],
    nl: [
      "Collectible Lamps",
      "Breng licht in de collectie.",
      "Ontdek decoratieve verzamellampen en karakterlampen uit de privécollectie.",
    ],
  },

  "Figures & Toys": {
    en: [
      "Figures & Toys",
      "Play. Display. Collect.",
      "Browse figures, toys and character collectibles from the private collection.",
    ],
    nl: [
      "Figures & Toys",
      "Spelen. Uitstallen. Verzamelen.",
      "Bekijk figuren, speelgoed en karakterverzamelitems uit de privécollectie.",
    ],
  },

  "Vintage Figures": {
    en: [
      "Vintage Figures",
      "Characters with a past.",
      "Discover original vintage figures and nostalgic finds from the private collection.",
    ],
    nl: [
      "Vintage Figures",
      "Personages met een verleden.",
      "Ontdek originele vintage figuren en nostalgische vondsten uit de privécollectie.",
    ],
  },

  "Hot Wheels": {
    en: [
      "Hot Wheels",
      "Small cars. Big stories.",
      "Browse used Hot Wheels, special castings and collectible cars from the private collection.",
    ],
    nl: [
      "Hot Wheels",
      "Kleine auto's. Grote verhalen.",
      "Bekijk gebruikte Hot Wheels, bijzondere castings en verzamelauto's uit de privécollectie.",
    ],
  },

  "FIFA 365 Cards": {
    en: [
      "FIFA 365 Cards",
      "Every card tells a match.",
      "Browse FIFA 365 Cards and Panini football trading cards from the private collection.",
    ],
    nl: [
      "FIFA 365 Cards",
      "Elke kaart vertelt een wedstrijd.",
      "Bekijk FIFA 365 Cards en Panini voetbalkaarten uit de privécollectie.",
    ],
  },

  "Donald Duck Strips": {
    en: [
      "Donald Duck Strips",
      "Adventures worth keeping.",
      "Discover Donald Duck comics and collectible strip issues from the private collection.",
    ],
    nl: [
      "Donald Duck Strips",
      "Avonturen om te bewaren.",
      "Ontdek Donald Duck strips en verzamelwaardige stripuitgaven uit de privécollectie.",
    ],
  },

  "Bordspellen & Games": {
    en: [
      "Bordspellen & Games",
      "Game night starts here.",
      "Browse board games and collectible games from the private collection.",
    ],
    nl: [
      "Bordspellen & Games",
      "De speelavond begint hier.",
      "Bekijk bordspellen en verzamelwaardige games uit de privécollectie.",
    ],
  },
};


const CATEGORY_NAV_COPY = {
  en: {
    label: "Browse categories",
    back: "← Back to categories",
    allProducts: "All products",
    funko: "Funko",
    funkoAll: "All Funko",
    lego: "LEGO",
    pokemon: "Pokémon",
    starWars: "Star Wars",
    harryPotter: "Harry Potter",
    lamps: "Collectible Lamps",
    figuresToys: "Figures & Toys",
    vintageFigures: "Vintage Figures",
    hotWheels: "Hot Wheels",
    fifaCards: "FIFA 365 Cards",
    donaldDuckStrips: "Donald Duck Strips",
    boardGames: "Bordspellen & Games",
    sale: "Sale",
  },
  nl: {
    label: "Wissel van categorie",
    back: "← Terug naar categorieën",
    allProducts: "Alle producten",
    funko: "Funko",
    funkoAll: "Alle Funko",
    lego: "LEGO",
    pokemon: "Pokémon",
    starWars: "Star Wars",
    harryPotter: "Harry Potter",
    lamps: "Collectible Lamps",
    figuresToys: "Figures & Toys",
    vintageFigures: "Vintage Figures",
    hotWheels: "Hot Wheels",
    fifaCards: "FIFA 365 Cards",
    donaldDuckStrips: "Donald Duck Strips",
    boardGames: "Bordspellen & Games",
    sale: "Sale",
  },
};

const FUNKO_NAV_ITEMS = [
  ["Funko Movies", "Movies", "funko-movies.html"],
  ["Funko Television", "Television", "funko-television.html"],
  ["Funko Animation", "Animation", "funko-animation.html"],
  ["Funko Games", "Games", "funko-games.html"],
  ["Funko Heroes", "Heroes", "funko-heroes.html"],
  ["Funko Pin", "Pin", "funko-pin.html"],
  ["Funko Bitty Pop", "Bitty Pop", "funko-bitty-pop.html"],
  ["Funko Tee", "Tee", "funko-tee.html"],
];

const CATEGORY_NAV_ITEMS = [
  ["lego", "lego", "lego.html"],
  ["pokemon", "pokemon", "pokemon.html"],
  ["star-wars", "starWars", "star-wars.html"],
  ["harry-potter", "harryPotter", "harry-potter.html"],
  ["Collectible Lamps", "lamps", "collectible-lamps.html"],
  ["Figures & Toys", "figuresToys", "figures-toys.html"],
  ["Vintage Figures", "vintageFigures", "vintage-figures.html"],
  ["Hot Wheels", "hotWheels", "hot-wheels.html"],
  ["FIFA 365 Cards", "fifaCards", "fifa-365-cards.html"],
  ["Donald Duck Strips", "donaldDuckStrips", "donald-duck-strips.html"],
  ["Bordspellen & Games", "boardGames", "bordspellen-games.html"],
  ["sale", "sale", "sale.html"],
];

const ensureCategoryNavigationStyles = () => {
  if (document.getElementById("lootiferCategoryNavigationStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "lootiferCategoryNavigationStyles";
  style.textContent = `
    #categorySwitchNav {
      position: relative;
      z-index: 30;
      width: min(1320px, calc(100% - 32px));
      margin: 18px auto 30px;
    }

    #categorySwitchNav .category-switch-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px;
      border: 1px solid rgba(214, 174, 54, 0.24);
      border-radius: 18px;
      background: rgba(127, 127, 127, 0.06);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    #categorySwitchNav .category-switch-back,
    #categorySwitchNav .category-switch-link,
    #categorySwitchNav .category-switch-summary {
      min-height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 14px;
      border: 1px solid rgba(214, 174, 54, 0.28);
      border-radius: 999px;
      background: rgba(127, 127, 127, 0.08);
      color: inherit;
      font: inherit;
      font-size: 0.9rem;
      font-weight: 700;
      line-height: 1;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition:
        transform 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease,
        background 160ms ease;
    }

    #categorySwitchNav .category-switch-back {
      border-color: rgba(214, 174, 54, 0.48);
    }

    #categorySwitchNav .category-switch-back:hover,
    #categorySwitchNav .category-switch-link:hover,
    #categorySwitchNav .category-switch-summary:hover {
      transform: translateY(-2px);
      border-color: #e6bb36;
      box-shadow: 0 8px 24px rgba(214, 174, 54, 0.15);
    }

    #categorySwitchNav .category-switch-link.is-active,
    #categorySwitchNav .category-switch-funko.is-active > .category-switch-summary {
      border-color: #e6bb36;
      background: linear-gradient(135deg, #f2ca4b, #d4a51c);
      color: #111;
      box-shadow: 0 8px 24px rgba(214, 174, 54, 0.2);
    }

    #categorySwitchNav .category-switch-links {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 640px;
      flex-wrap: wrap;
    }

    #categorySwitchNav .category-switch-funko {
      position: relative;
    }

    #categorySwitchNav .category-switch-summary {
      list-style: none;
    }

    #categorySwitchNav .category-switch-summary::-webkit-details-marker {
      display: none;
    }

    #categorySwitchNav .category-switch-chevron {
      font-size: 0.78em;
      transition: transform 160ms ease;
    }

    #categorySwitchNav .category-switch-funko[open] .category-switch-chevron {
      transform: rotate(180deg);
    }

    #categorySwitchNav .category-switch-menu {
      position: absolute;
      top: calc(100% + 9px);
      left: 0;
      z-index: 100;
      min-width: 230px;
      display: grid;
      gap: 4px;
      padding: 8px;
      border: 1px solid rgba(230, 187, 54, 0.36);
      border-radius: 16px;
      background: #111315;
      box-shadow: 0 22px 55px rgba(0, 0, 0, 0.42);
    }

    #categorySwitchNav .category-switch-menu a {
      display: block;
      padding: 10px 12px;
      border-radius: 10px;
      color: #f5f1e8;
      font-weight: 650;
      text-decoration: none;
      transition: background 140ms ease, color 140ms ease;
    }

    #categorySwitchNav .category-switch-menu a:hover,
    #categorySwitchNav .category-switch-menu a.is-active {
      background: rgba(230, 187, 54, 0.16);
      color: #f2ca4b;
    }

    @media (max-width: 760px) {
      #categorySwitchNav {
        width: min(100% - 20px, 1320px);
        margin-top: 12px;
      }

      #categorySwitchNav .category-switch-inner {
        align-items: stretch;
      }

      #categorySwitchNav .category-switch-back {
        width: 100%;
      }

      #categorySwitchNav .category-switch-links {
        flex-basis: 100%;
      }

      #categorySwitchNav .category-switch-funko {
        position: static;
      }

      #categorySwitchNav .category-switch-menu {
        left: 12px;
        right: 12px;
        min-width: 0;
      }
    }
  `;

  document.head.appendChild(style);
};

const getRequestedCategory = () =>
  new URLSearchParams(window.location.search).get("category") || "";

const getCategoryNavigationState = () => {
  const requestedCategory = getRequestedCategory();
  const isFunko =
    COLLECTION_KEY === "funko" ||
    FIXED_CATEGORY.startsWith("Funko");

  const activeKey =
    FIXED_CATEGORY ||
    requestedCategory ||
    COLLECTION_KEY ||
    "";

  return {
    activeKey,
    isFunko,
  };
};

const renderCategoryNavigation = (language = getShopLanguage()) => {
  const locale = language === "nl" ? "nl" : "en";
  const copy = CATEGORY_NAV_COPY[locale];
  const heading = document.querySelector(".section-heading");

  const shouldShow =
    Boolean(COLLECTION_KEY) ||
    Boolean(FIXED_CATEGORY) ||
    Boolean(getRequestedCategory());

  if (!heading || !shouldShow) {
    document.getElementById("categorySwitchNav")?.remove();
    return;
  }

  ensureCategoryNavigationStyles();

  let nav = document.getElementById("categorySwitchNav");

  if (!nav) {
    nav = document.createElement("nav");
    nav.id = "categorySwitchNav";
    heading.insertAdjacentElement("afterend", nav);
  }

  nav.setAttribute("aria-label", copy.label);

  const { activeKey, isFunko } =
    getCategoryNavigationState();

  const allProductsActive =
    !FIXED_CATEGORY &&
    !COLLECTION_KEY &&
    !getRequestedCategory();

  const funkoLinks = [
    `
      <a
        class="${COLLECTION_KEY === "funko" && !FIXED_CATEGORY ? "is-active" : ""}"
        href="funko.html"
        ${COLLECTION_KEY === "funko" && !FIXED_CATEGORY ? 'aria-current="page"' : ""}
      >${copy.funkoAll}</a>
    `,
    ...FUNKO_NAV_ITEMS.map(([category, label, href]) => `
      <a
        class="${FIXED_CATEGORY === category ? "is-active" : ""}"
        href="${href}"
        ${FIXED_CATEGORY === category ? 'aria-current="page"' : ""}
      >${label}</a>
    `),
  ].join("");

  const categoryLinks = CATEGORY_NAV_ITEMS.map(
    ([key, labelKey, href]) => {
      const active =
        activeKey === key ||
        (key === "lego" && COLLECTION_KEY === "lego") ||
        (key === "pokemon" && COLLECTION_KEY === "pokemon") ||
        (key === "star-wars" && COLLECTION_KEY === "star-wars") ||
        (key === "harry-potter" && COLLECTION_KEY === "harry-potter") ||
        (key === "sale" && COLLECTION_KEY === "sale");

      return `
        <a
          class="category-switch-link${active ? " is-active" : ""}"
          href="${href}"
          ${active ? 'aria-current="page"' : ""}
        >${copy[labelKey]}</a>
      `;
    }
  ).join("");

  nav.innerHTML = `
    <div class="category-switch-inner">
      <a class="category-switch-back" href="shop.html">${copy.back}</a>

      <div class="category-switch-links">
        <a
          class="category-switch-link${allProductsActive ? " is-active" : ""}"
          href="all-products.html"
          ${allProductsActive ? 'aria-current="page"' : ""}
        >${copy.allProducts}</a>

        <details class="category-switch-funko${isFunko ? " is-active" : ""}">
          <summary class="category-switch-summary">
            ${copy.funko}
            <span class="category-switch-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div class="category-switch-menu">
            ${funkoLinks}
          </div>
        </details>

        ${categoryLinks}
      </div>
    </div>
  `;
};


const applyShopPageLanguage = (language = getShopLanguage()) => {
  const locale = language === "nl" ? "nl" : "en";
  const dictionary = SHOP_PAGE_COPY[locale];

  document.documentElement.lang = locale;

  const heading = document.querySelector(".section-heading");

  if (heading) {
    let pageCopy;

    if (FIXED_CATEGORY && FIXED_PAGE_COPY[FIXED_CATEGORY]) {
      const [eyebrow, title, text] =
        FIXED_PAGE_COPY[FIXED_CATEGORY][locale];

      pageCopy = {
        eyebrow,
        title,
        text,
      };
    } else {
      pageCopy =
        dictionary[COLLECTION_KEY || "all"] ||
        dictionary.all;
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
      if (dictionary.sort[index]) {
        option.textContent = dictionary.sort[index];
      }
    });
  }

  if (IS_CURATED_COLLECTION) {
    const categoryCopy =
      CATEGORY_GRID_COPY[locale]?.[COLLECTION_KEY || FIXED_CATEGORY];

    const commonCopy =
      CATEGORY_GRID_COPY[locale]?.common;

    if (categoryCopy) {
      const kicker =
        document.getElementById("categoryShelfKicker");

      const shelfTitle =
        document.getElementById("categoryShelfTitle");

      const shelfText =
        document.getElementById("categoryShelfText");

      if (kicker) {
        kicker.textContent = categoryCopy.kicker;
      }

      if (shelfTitle) {
        shelfTitle.textContent = categoryCopy.title;
      }

      if (shelfText) {
        shelfText.textContent = categoryCopy.text;
      }
    }

    if (commonCopy) {
      const spots =
        document.getElementById("categorySpotLabel");

      const admin =
        document.getElementById("categoryAdminLabel");

      const sortLabel =
        document.getElementById("categorySortLabel");

      if (spots) {
        spots.textContent = commonCopy.spots;
      }

      if (admin) {
        admin.textContent = commonCopy.admin;
      }

      if (sortLabel) {
        sortLabel.textContent = commonCopy.sort;
      }
    }
  }

  renderCategoryNavigation(locale);
};

const COLLECTION_KEY =
  document.body.dataset.collectionKey || "";

const IS_CURATED_COLLECTION =
  document.body.dataset.curatedGrid === "true";

const PRODUCTS_PER_PAGE =
  IS_CURATED_COLLECTION ? 16 : 24;

const FIXED_CATEGORY =
  document.body.dataset.fixedCategory || "";

const normalizeCollectionValue = (value = "") =>
  String(value).trim().toLowerCase();

const belongsToCollection = (product) => {
  const haystack = [
    product?.brand,
    product?.category,
    product?.universe,
    product?.franchise,
    ...(Array.isArray(product?.tags) ? product.tags : []),
  ]
    .map(normalizeCollectionValue)
    .join(" ");

  if (!COLLECTION_KEY) {
    return true;
  }

  if (COLLECTION_KEY === "funko") {
    return haystack.includes("funko");
  }

  if (COLLECTION_KEY === "lego") {
    return haystack.includes("lego");
  }

  if (COLLECTION_KEY === "pokemon") {
    return (
      haystack.includes("pokemon") ||
      haystack.includes("pokémon")
    );
  }

  if (COLLECTION_KEY === "star-wars") {
    return haystack.includes("star wars");
  }

  if (COLLECTION_KEY === "harry-potter") {
    return haystack.includes("harry potter");
  }

  if (COLLECTION_KEY === "sale") {
    const selling = Number(
      product?.sellingPrice ||
        product?.price ||
        0
    );

    const discount = Number(
      product?.discountPrice ||
        0
    );

    return (
      selling > 0 &&
      discount > 0 &&
      discount < selling
    );
  }

  return true;
};

const pokemonQuickHaystack = (product = {}) =>
  [
    product?.name,
    product?.category,
    product?.brand,
    product?.universe,
    product?.franchise,
    product?.edition,
    product?.variant,
    product?.description,
    ...(Array.isArray(product?.tags)
      ? product.tags
      : []),
  ]
    .map((value) =>
      String(value || "").toLowerCase()
    )
    .join(" ");

const matchesPokemonQuickFilter = (product) => {
  if (
    COLLECTION_KEY !== "pokemon" ||
    pokemonQuickFilter === "all"
  ) {
    return true;
  }

  const text = pokemonQuickHaystack(product);

  const hasAny = (...terms) =>
    terms.some((term) => text.includes(term));

  switch (pokemonQuickFilter) {
    case "energy":
      return hasAny(
        "energy",
        "energie"
      );

    case "trainer":
      return hasAny(
        "trainer",
        "supporter",
        "stadium",
        "item card",
        "trainer card"
      );

    case "holo-reverse":
      return hasAny(
        "holo",
        "reverse holo",
        "reverse-holo",
        "reverse",
        "foil"
      );

    case "v-ex":
      return (
        /(^|[^a-z0-9])(v|ex|gx)([^a-z0-9]|$)/i.test(text) ||
        hasAny(
          "pokemon v",
          "pokémon v"
        )
      );

    case "vmax-vstar":
      return hasAny(
        "vmax",
        "vstar",
        "v-star",
        "v star"
      );

    case "promo":
      return hasAny(
        "promo",
        "promotional",
        "black star"
      );

    case "pokemon":
      return !hasAny(
        "energy",
        "energie",
        "trainer",
        "supporter",
        "stadium",
        "item card",
        "trainer card"
      );

    default:
      return true;
  }
};

const bindPokemonQuickFilters = () => {
  if (COLLECTION_KEY !== "pokemon") {
    return;
  }

  const bar =
    document.getElementById("pokemonQuickFilters");

  if (
    !bar ||
    bar.dataset.bound === "true"
  ) {
    return;
  }

  bar.dataset.bound = "true";

  bar
    .querySelectorAll("[data-pokemon-filter]")
    .forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        button.classList.contains("is-active")
          ? "true"
          : "false"
      );

      button.addEventListener(
        "click",
        () => {
          pokemonQuickFilter =
            button.dataset.pokemonFilter ||
            "all";

          bar
            .querySelectorAll(
              "[data-pokemon-filter]"
            )
            .forEach((item) => {
              const active =
                item === button;

              item.classList.toggle(
                "is-active",
                active
              );

              item.setAttribute(
                "aria-pressed",
                active
                  ? "true"
                  : "false"
              );
            });

          applyFilters();
        }
      );
    });
};

let products = [];
let filteredProducts = [];
let currentPage = 1;

const populateSelect = (
  select,
  values,
  placeholder = "Alles"
) => {
  if (!select) return;

  select.innerHTML = "";

  const option =
    document.createElement("option");

  option.value = "";
  option.textContent = placeholder;

  select.appendChild(option);

  values.forEach((value) => {
    const item =
      document.createElement("option");

    item.value = value;
    item.textContent = value;

    select.appendChild(item);
  });
};

const getProducts = async () => {
  const result =
    await loadRuntimeCatalog();

  products =
    normalizeProductCatalog(
      result.products
    );

  populateFilters();
  applyFilters();
};

const populateFilters = () => {
  const collectionProducts =
    products.filter(
      belongsToCollection
    );

  const categories = [
    ...new Set(
      collectionProducts
        .map(
          (product) =>
            product.category
        )
        .filter(Boolean)
    ),
  ].sort();

  if (
    FIXED_CATEGORY &&
    !categories.includes(FIXED_CATEGORY)
  ) {
    categories.unshift(
      FIXED_CATEGORY
    );
  }

  const universes = [
    ...new Set(
      collectionProducts
        .map(
          (product) =>
            product.universe
        )
        .filter(Boolean)
    ),
  ].sort();

  const brands = [
    ...new Set(
      collectionProducts
        .map(
          (product) =>
            product.brand
        )
        .filter(Boolean)
    ),
  ].sort();

  if (filtersRoot) {
    filtersRoot.innerHTML =
      createFilterSidebar({
        categories,
        universes,
        brands,
        priceValue: 300,
      });
  }

  shopSearch =
    document.getElementById(
      "shopSearch"
    );

  shopCategory =
    document.getElementById(
      "shopCategory"
    );

  shopUniverse =
    document.getElementById(
      "shopUniverse"
    );

  shopBrand =
    document.getElementById(
      "shopBrand"
    );

  shopPrice =
    document.getElementById(
      "shopPrice"
    );

  shopPriceValue =
    document.getElementById(
      "shopPriceValue"
    );

  shopExclusive =
    document.getElementById(
      "shopExclusive"
    );

  shopChase =
    document.getElementById(
      "shopChase"
    );

  shopVaulted =
    document.getElementById(
      "shopVaulted"
    );

  shopInStock =
    document.getElementById(
      "shopInStock"
    );

  shopSort =
    document.getElementById(
      "shopSort"
    );

  const urlFilters =
    new URLSearchParams(
      window.location.search
    );

  const requestedCategory =
    FIXED_CATEGORY ||
    urlFilters.get("category") ||
    "";

  const requestedUniverse =
    urlFilters.get("universe") ||
    "";

  const requestedSearch =
    urlFilters.get("search") ||
    "";

  const requestedBrand =
    urlFilters.get("brand") ||
    "";

  const requestedInStock =
    urlFilters.get("inStock") === "1";

  if (
    shopCategory &&
    requestedCategory &&
    [...shopCategory.options].some(
      (option) =>
        option.value ===
        requestedCategory
    )
  ) {
    shopCategory.value =
      requestedCategory;
  }

  if (
    shopCategory &&
    FIXED_CATEGORY
  ) {
    shopCategory.value =
      FIXED_CATEGORY;

    shopCategory.disabled = true;

    shopCategory.title =
      `Deze pagina toont alleen ${FIXED_CATEGORY}`;
  }

  if (
    shopUniverse &&
    requestedUniverse
  ) {
    const normalizedRequestedUniverse =
      requestedUniverse.toLowerCase();

    const matchingOption = [
      ...shopUniverse.options,
    ].find(
      (option) =>
        option.value.toLowerCase() ===
        normalizedRequestedUniverse
    );

    if (matchingOption) {
      shopUniverse.value =
        matchingOption.value;
    }
  }

  if (
    shopSearch &&
    requestedSearch
  ) {
    shopSearch.value =
      requestedSearch;
  }

  if (
    shopBrand &&
    requestedBrand
  ) {
    const matchingBrand = [
      ...shopBrand.options,
    ].find(
      (option) =>
        option.value.toLowerCase() ===
        requestedBrand.toLowerCase()
    );

    if (matchingBrand) {
      shopBrand.value =
        matchingBrand.value;
    }
  }

  if (
    shopInStock &&
    requestedInStock
  ) {
    shopInStock.checked = true;
  }

  const elements = [
    shopSearch,
    shopCategory,
    shopUniverse,
    shopBrand,
    shopPrice,
    shopExclusive,
    shopChase,
    shopVaulted,
    shopInStock,
    shopSort,
  ].filter(Boolean);

  elements.forEach((element) => {
    element.addEventListener(
      "input",
      applyFilters
    );

    element.addEventListener(
      "change",
      applyFilters
    );
  });

  if (
    shopPrice &&
    shopPriceValue
  ) {
    shopPrice.addEventListener(
      "input",
      () => {
        const copy = shopCopy();

        shopPriceValue.textContent =
          shopPrice.value === "300"
            ? `${copy.until} €300`
            : `${copy.until} ${formatCurrency(
                shopPrice.value
              )}`;

        applyFilters();
      }
    );
  }

  const resetButton =
    document.getElementById(
      "shopReset"
    );

  resetButton?.addEventListener(
    "click",
    () => {
      if (shopSearch) {
        shopSearch.value = "";
      }

      if (shopCategory) {
        shopCategory.value =
          FIXED_CATEGORY || "";
      }

      if (shopUniverse) {
        shopUniverse.value = "";
      }

      if (shopBrand) {
        shopBrand.value = "";
      }

      if (shopPrice) {
        shopPrice.value = "300";
      }

      if (shopPriceValue) {
        shopPriceValue.textContent =
          `${shopCopy().until} €300`;
      }

      if (shopExclusive) {
        shopExclusive.checked = false;
      }

      if (shopChase) {
        shopChase.checked = false;
      }

      if (shopVaulted) {
        shopVaulted.checked = false;
      }

      if (shopInStock) {
        shopInStock.checked = false;
      }

      if (shopSort) {
        shopSort.value = "newest";
      }

      pokemonQuickFilter = "all";

      const bar =
        document.getElementById(
          "pokemonQuickFilters"
        );

      if (bar) {
        bar
          .querySelectorAll(
            "[data-pokemon-filter]"
          )
          .forEach((item) => {
            const active =
              item.dataset.pokemonFilter ===
              "all";

            item.classList.toggle(
              "is-active",
              active
            );

            item.setAttribute(
              "aria-pressed",
              active
                ? "true"
                : "false"
            );
          });
      }

      applyFilters();
    }
  );
};

const sortProducts = (items) => {
  const sortValue =
    shopSort?.value || "newest";

  const sorted = [...items];

  switch (sortValue) {
    case "price-asc":
      return sorted.sort(
        (left, right) => {
          const leftHasPrice =
            hasValidSellingPrice(left);

          const rightHasPrice =
            hasValidSellingPrice(right);

          if (
            leftHasPrice &&
            !rightHasPrice
          ) {
            return -1;
          }

          if (
            !leftHasPrice &&
            rightHasPrice
          ) {
            return 1;
          }

          return (
            getDisplayPrice(left) -
            getDisplayPrice(right)
          );
        }
      );

    case "price-desc":
      return sorted.sort(
        (left, right) => {
          const leftHasPrice =
            hasValidSellingPrice(left);

          const rightHasPrice =
            hasValidSellingPrice(right);

          if (
            leftHasPrice &&
            !rightHasPrice
          ) {
            return -1;
          }

          if (
            !leftHasPrice &&
            rightHasPrice
          ) {
            return 1;
          }

          return (
            getDisplayPrice(right) -
            getDisplayPrice(left)
          );
        }
      );

    case "alpha":
      return sorted.sort(
        (left, right) =>
          left.name.localeCompare(
            right.name
          )
      );

    default:
      return sorted.sort(
        (left, right) =>
          right.releaseYear -
            left.releaseYear ||
          right.id - left.id
      );
  }
};

const normalizeSearchText = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getFilteredProducts = () => {
  const query =
    normalizeSearchText(
      shopSearch?.value || ""
    );

  const queryTerms =
    query.split(/\s+/).filter(Boolean);

  const category =
    FIXED_CATEGORY ||
    shopCategory?.value ||
    "";

  const universe =
    shopUniverse?.value || "";

  const brand =
    shopBrand?.value || "";

  const maxPrice = shopPrice
    ? Number(
        shopPrice.value || 300
      )
    : Number.POSITIVE_INFINITY;

  const onlyExclusive =
    shopExclusive?.checked || false;

  const onlyChase =
    shopChase?.checked || false;

  const onlyVaulted =
    shopVaulted?.checked || false;

  const onlyInStock =
    shopInStock?.checked || false;

  return products.filter(
    (product) => {
      if (
        !belongsToCollection(product)
      ) {
        return false;
      }

      if (
        !matchesPokemonQuickFilter(
          product
        )
      ) {
        return false;
      }

      try {
        const productTags =
          Array.isArray(
            product?.tags
          )
            ? product.tags
            : [];

        const searchHaystack =
          normalizeSearchText(
            [
              product?.name,
              product?.title,
              product?.brand,
              product?.category,
              product?.universe,
              product?.franchise,
              product?.series,
              product?.character,
              product?.edition,
              product?.variant,
              product?.model,
              product?.description,
              ...productTags,
              product?.number,
              product?.id,
              product?.sku,
              product?.slug,
            ]
              .filter(
                (value) =>
                  value !== null &&
                  value !== undefined &&
                  value !== ""
              )
              .join(" ")
          );

        const matchesQuery =
          !queryTerms.length ||
          queryTerms.every(
            (term) =>
              searchHaystack.includes(term)
          );

        const matchesCategory =
          !category ||
          product.category ===
            category;

        const matchesUniverse =
          !universe ||
          product.universe ===
            universe;

        const matchesBrand =
          !brand ||
          product.brand === brand;

        const matchesPrice =
          !hasValidSellingPrice(
            product
          ) ||
          getDisplayPrice(product) <=
            maxPrice;

        const matchesExclusive =
          !onlyExclusive ||
          product.exclusive;

        const matchesChase =
          !onlyChase ||
          product.chase;

        const matchesVaulted =
          !onlyVaulted ||
          product.vaulted;

        const matchesInStock =
          !onlyInStock ||
          Number(
            product?.stock || 0
          ) > 0;

        return (
          matchesQuery &&
          matchesCategory &&
          matchesUniverse &&
          matchesBrand &&
          matchesPrice &&
          matchesExclusive &&
          matchesChase &&
          matchesVaulted &&
          matchesInStock
        );
      } catch (error) {
        const productId =
          product?.id ?? "unknown";

        console.error(
          `Failed to evaluate product filters (id=${productId})`,
          error
        );

        return false;
      }
    }
  );
};

const bindProductCardActions = (
  root
) => {
  root
    ?.querySelectorAll(
      "[data-action]"
    )
    .forEach((trigger) => {
      const product = {
        id: Number(
          trigger.dataset
            .productId || 0
        ),

        name:
          trigger.dataset
            .productName ||
          "Collectible",

        price: Number(
          trigger.dataset
            .productPrice || 0
        ),

        image:
          trigger.dataset
            .productImage || "",

        universe:
          trigger.dataset
            .productUniverse || "",

        franchise:
          trigger.dataset
            .productFranchise || "",

        edition:
          trigger.dataset
            .productEdition || "",

        stock: Number(
          trigger.dataset
            .productStock || 0
        ),

        slug:
          trigger.dataset
            .productSlug || "",
      };

      bindShoppingActions(
        product,
        trigger
      );
    });

  attachProductCardInteractions(
    root
  );
};

const renderProducts = (items) => {
  if (!shopGrid) return;

  const start =
    (currentPage - 1) *
    PRODUCTS_PER_PAGE;

  const pageItems =
    items.slice(
      start,
      start + PRODUCTS_PER_PAGE
    );

  const renderedCards = [];

  pageItems.forEach(
    (product) => {
      try {
        renderedCards.push(
          createProductCard(product)
        );
      } catch (error) {
        const productId =
          product?.id ??
          "unknown";

        const productName =
          product?.name ??
          "unknown";

        console.error(
          `Failed to render product card (id=${productId}, name=${productName})`,
          error
        );
      }
    }
  );

  shopGrid.innerHTML =
    renderedCards.length
      ? renderedCards.join("")
      : `<p class="card-empty">${
          IS_CURATED_COLLECTION
            ? shopCopy()
                .emptyCurated
            : shopCopy().empty
        }</p>`;

  attachPremiumFallback(shopGrid);

  try {
    bindProductCardActions(
      shopGrid
    );
  } catch (error) {
    console.error(
      "Failed to bind product card actions",
      error
    );
  }
};

const renderPagination = (
  items
) => {
  if (!shopPagination) return;

  const totalPages = Math.max(
    1,
    Math.ceil(
      items.length /
        PRODUCTS_PER_PAGE
    )
  );

  if (totalPages <= 1) {
    shopPagination.innerHTML = "";
    return;
  }

  const buttons = [];

  for (
    let page = 1;
    page <= totalPages;
    page += 1
  ) {
    buttons.push(
      `<button class="pagination-btn${
        page === currentPage
          ? " active"
          : ""
      }" data-page="${page}">${page}</button>`
    );
  }

  shopPagination.innerHTML =
    buttons.join("");

  shopPagination
    .querySelectorAll(
      "button[data-page]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          currentPage =
            Number(
              button.dataset.page
            );

          renderProducts(
            filteredProducts
          );

          renderPagination(
            filteredProducts
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }
      );
    });
};

const updateCount = (items) => {
  const copy = shopCopy();

  if (shopCount) {
    shopCount.textContent =
      `${items.length} ${
        items.length === 1
          ? copy.product
          : copy.products
      }`;
  }

  if (!shopActiveFilters) {
    return;
  }

  const activeFilters = [];

  if (
    shopSearch?.value.trim()
  ) {
    activeFilters.push(
      `${copy.search}: ${shopSearch.value.trim()}`
    );
  }

  if (
    FIXED_CATEGORY ||
    shopCategory?.value
  ) {
    activeFilters.push(
      `${copy.category}: ${
        FIXED_CATEGORY ||
        shopCategory.value
      }`
    );
  }

  if (
    shopUniverse?.value
  ) {
    activeFilters.push(
      `${copy.universe}: ${shopUniverse.value}`
    );
  }

  if (shopBrand?.value) {
    activeFilters.push(
      `${copy.brand}: ${shopBrand.value}`
    );
  }

  if (
    shopPrice?.value !== "300"
  ) {
    activeFilters.push(
      `${copy.price}: ≤ ${formatCurrency(
        shopPrice.value
      )}`
    );
  }

  if (
    shopExclusive?.checked
  ) {
    activeFilters.push(
      copy.exclusive
    );
  }

  if (shopChase?.checked) {
    activeFilters.push(
      copy.chase
    );
  }

  if (
    shopVaulted?.checked
  ) {
    activeFilters.push(
      copy.vaulted
    );
  }

  if (
    shopInStock?.checked
  ) {
    activeFilters.push(
      copy.stock
    );
  }

  shopActiveFilters.textContent =
    activeFilters.length
      ? `${copy.active}: ${activeFilters.join(
          " • "
        )}`
      : `${copy.active}: ${copy.none}`;
};

const applyFilters = () => {
  currentPage = 1;

  filteredProducts =
    sortProducts(
      getFilteredProducts()
    );

  updateCount(
    filteredProducts
  );

  renderProducts(
    filteredProducts
  );

  renderPagination(
    filteredProducts
  );
};

if (headerRoot) {
  headerRoot.innerHTML =
    createHeader("shop");
}

if (footerRoot) {
  footerRoot.innerHTML =
    createFooter();
}

bindPokemonQuickFilters();

applyShopPageLanguage();

syncHeaderCounters();

window.addEventListener(
  "lootifer:state-updated",
  syncHeaderCounters
);

const showLoadError = () => {
  if (shopGrid) {
    shopGrid.innerHTML =
      `<p class="card-empty">${shopCopy().unavailable}</p>`;
  }

  if (shopCount) {
    shopCount.textContent =
      `0 ${shopCopy().products}`;
  }

  if (shopActiveFilters) {
    const copy = shopCopy();

    shopActiveFilters.textContent =
      `${copy.active}: ${copy.none}`;
  }
};

const initializeShop =
  async () => {
    try {
      await getProducts();
    } catch (error) {
      console.error(
        "Shop catalog failed to load:",
        error
      );

      showLoadError();
    }
  };

initializeShop();

window.addEventListener(
  "lootifer:inventory-updated",
  initializeShop
);

window.addEventListener(
  "lootifer:language-change",
  (event) => {
    applyShopPageLanguage(
      event.detail?.language ||
        "en"
    );

    populateFilters();

    applyFilters();
  }
);

const revealItems =
  document.querySelectorAll(
    ".reveal"
  );

if (revealItems.length) {
  const observer =
    new IntersectionObserver(
      (entries) => {
        entries.forEach(
          (entry) => {
            if (
              entry.isIntersecting
            ) {
              entry.target.classList.add(
                "visible"
              );

              observer.unobserve(
                entry.target
              );
            }
          }
        );
      },
      {
        threshold: 0.15,
      }
    );

  revealItems.forEach(
    (item) =>
      observer.observe(item)
  );
}