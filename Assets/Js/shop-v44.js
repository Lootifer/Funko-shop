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

const normalizeCategory = (product = {}) =>
  normalize(product.category || "");

const matches = (product = {}, key = "") => {
  const category = normalizeCategory(product);

  /*
   * BELANGRIJK:
   * De echte productcategorie is leidend.
   *
   * Daardoor wordt bijvoorbeeld een Funko Star Wars
   * niet meer als gewone Star Wars geteld.
   */

  if (key === "funko") {
    return category.startsWith("funko");
  }

  if (key === "lego") {
    return (
      category === "lego" ||
      category.startsWith("lego ")
    );
  }

  if (key === "pokemon") {
    return (
      category.includes("pokemon") ||
      category.includes("pokémon")
    );
  }

  if (key === "star-wars") {
    return (
      category === "star wars" ||
      category === "star-wars" ||
      category.startsWith("star wars ")
    );
  }

  if (key === "collectible-lamps") {
    return (
      category === "collectible lamps" ||
      category === "collectible-lamps" ||
      category.includes("collectible lamp")
    );
  }

  if (key === "figures-toys") {
    return (
      category === "figures & toys" ||
      category === "figures and toys" ||
      category === "figures-toys" ||
      category.includes("figures & toys") ||
      category.includes("figures and toys")
    );
  }

  if (key === "vintage-figures") {
    return (
      category === "vintage figures" ||
      category === "vintage-figures" ||
      category.includes("vintage figures")
    );
  }

  if (key === "hot-wheels") {
    return (
      category === "hot wheels" ||
      category === "hot-wheels" ||
      category.includes("hot wheels")
    );
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

  /*
   * Aantallen binnen het Funko-popupmenu.
   * Hier moet de exacte Funko-subcategorie overeenkomen.
   */
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