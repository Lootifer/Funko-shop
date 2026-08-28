import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import {
  createShoppingUi,
  syncHeaderCounters,
} from "../../Components/Experience/shopping-ui.js";
import { loadRuntimeCatalog } from "../../Products/runtime-catalog.js";
import { getValidDiscountPrice } from "../../Products/product-pricing.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");

if (headerRoot) {
  headerRoot.innerHTML = createHeader("shop");
}

if (footerRoot) {
  footerRoot.innerHTML = createFooter();
}

const shoppingRoot = document.createElement("div");
shoppingRoot.id = "shoppingRoot";
document.body.appendChild(shoppingRoot);

createShoppingUi({
  root: shoppingRoot,
});

syncHeaderCounters();

window.addEventListener(
  "lootifer:state-updated",
  syncHeaderCounters
);

const normalize = (value = "") =>
  String(value)
    .trim()
    .toLowerCase();

const haystack = (product = {}) =>
  [
    product.brand,
    product.category,
    product.universe,
    product.franchise,
    ...(Array.isArray(product.tags)
      ? product.tags
      : []),
  ]
    .map(normalize)
    .join(" ");

const matches = (product, key) => {
  const text = haystack(product);

  /*
   * BELANGRIJK:
   * Sommige oudere geïmporteerde producten hebben nog "Funko"
   * in brand/tags staan, terwijl ze inmiddels onder een eigen
   * 2nd Life Toys-categorie vallen.
   *
   * Daarom krijgen de specifieke categorieën voorrang op Funko.
   */

  const isLego =
    text.includes("lego");

  const isPokemon =
    text.includes("pokemon") ||
    text.includes("pokémon");

  const isStarWars =
    text.includes("star wars");

  const isCollectibleLamps =
    text.includes("collectible lamps") ||
    text.includes("collectible lamp");

  const isFiguresToys =
    text.includes("figures & toys") ||
    text.includes("figures and toys");

  const isVintageFigures =
    text.includes("vintage figures") ||
    text.includes("vintage figure");

  const isHotWheels =
    text.includes("hot wheels") ||
    text.includes("hotwheels");

  const isSpecialCategory =
    isLego ||
    isPokemon ||
    isStarWars ||
    isCollectibleLamps ||
    isFiguresToys ||
    isVintageFigures ||
    isHotWheels;

  const isFunko =
    text.includes("funko") &&
    !isSpecialCategory;

  if (key === "funko") {
    return isFunko;
  }

  if (key === "lego") {
    return isLego;
  }

  if (key === "pokemon") {
    return isPokemon &&
      !isCollectibleLamps;
  }

  if (key === "star-wars") {
    return isStarWars;
  }

  if (key === "collectible-lamps") {
    return isCollectibleLamps;
  }

  if (key === "figures-toys") {
    return isFiguresToys;
  }

  if (key === "vintage-figures") {
    return isVintageFigures;
  }

  if (key === "hot-wheels") {
    return isHotWheels;
  }

  if (key === "sale") {
    return getValidDiscountPrice(product) !== null;
  }

  return false;
};

const setCounts = (products = []) => {
  const categories = [
    "funko",
    "lego",
    "pokemon",
    "star-wars",
    "collectible-lamps",
    "figures-toys",
    "vintage-figures",
    "hot-wheels",
    "sale",
  ];

  categories.forEach((key) => {
    const count = products.filter((product) =>
      matches(product, key)
    ).length;

    document
      .querySelectorAll(
        `[data-category-count="${key}"]`
      )
      .forEach((element) => {
        element.textContent = String(count);
      });
  });

  document
    .querySelectorAll("[data-funko-count]")
    .forEach((element) => {
      const category = normalize(
        element.dataset.funkoCount || ""
      );

      const count = products.filter(
        (product) =>
          normalize(product.category) === category
      ).length;

      element.textContent = String(count);
    });
};

loadRuntimeCatalog()
  .then((result) => {
    setCounts(result.products || []);
  })
  .catch((error) => {
    console.error(
      "Categorie-aantallen konden niet worden geladen",
      error
    );

    setCounts([]);
  });

const modal =
  document.getElementById("shopFunkoModal");

const trigger =
  document.querySelector(
    '[data-category-card="funko"]'
  );

const close =
  modal?.querySelector(
    ".shop-v44-modal-close"
  );

const setModal = (open) => {
  if (!modal) {
    return;
  }

  modal.classList.toggle(
    "is-open",
    Boolean(open)
  );

  modal.setAttribute(
    "aria-hidden",
    open ? "false" : "true"
  );

  document.body.style.overflow =
    open ? "hidden" : "";
};

trigger?.addEventListener(
  "click",
  () => setModal(true)
);

close?.addEventListener(
  "click",
  () => setModal(false)
);

modal?.addEventListener(
  "click",
  (event) => {
    if (event.target === modal) {
      setModal(false);
    }
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape") {
      setModal(false);
    }
  }
);
