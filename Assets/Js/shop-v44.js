import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import {
  createShoppingUi,
  syncHeaderCounters,
} from "../../Components/Experience/shopping-ui.js";
import { loadRuntimeCatalog } from "../../Products/runtime-catalog.js?v=20260829-2";
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

createShoppingUi({ root: shoppingRoot });
syncHeaderCounters();

window.addEventListener(
  "lootifer:state-updated",
  syncHeaderCounters
);

const normalize = (value = "") =>r
  String(value).trim().toLowerCase();

const FUNKO_CATEGORIES = new Set([
  "funko heroes",
  "funko movies",
  "funko animation",
  "funko games",
  "funko television",
  "funko bitty pop",
  "funko pin",
  "funko tee",
]);

const matches = (product = {}, key = "") => {
  const category = normalize(product.category);

  if (key === "funko") {
    return FUNKO_CATEGORIES.has(category);
  }

  if (key === "lego") {
    return category === "lego";
  }

  if (key === "pokemon") {
    return (
      category === "pokémon" ||
      category === "pokemon"
    );
  }

  if (key === "star-wars") {
    return category === "star wars";
  }

  if (key === "collectible-lamps") {
    return category === "collectible lamps";
  }

  if (key === "figures-toys") {
    return category === "figures & toys";
  }

  if (key === "vintage-figures") {
    return category === "vintage figures";
  }

  if (key === "hot-wheels") {
    return category === "hot wheels";
  }

  if (key === "fifa-365-cards") {
    return category === "fifa 365 cards";
  }

  if (key === "donald-duck-strips") {
    return category === "donald duck strips";
  }

  if (key === "bordspellen-games") {
    return category === "bordspellen & games";
  }

  if (key === "sale") {
    return getValidDiscountPrice(product) !== null;
  }

  return false;
};

const setCounts = (products = []) => {
  const categoryKeys = [
    "funko",
    "lego",
    "pokemon",
    "star-wars",
    "collectible-lamps",
    "figures-toys",
    "vintage-figures",
    "hot-wheels",
    "fifa-365-cards",
    "donald-duck-strips",
    "bordspellen-games",
    "sale",
  ];

  categoryKeys.forEach((key) => {
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
      const requestedCategory = normalize(
        element.dataset.funkoCount || ""
      );

      const count = products.filter(
        (product) =>
          normalize(product.category) === requestedCategory
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

const modal = document.getElementById("shopFunkoModal");

const trigger = document.querySelector(
  '[data-category-card="funko"]'
);

const close = modal?.querySelector(
  ".shop-v44-modal-close"
);

const setModal = (open) => {
  if (!modal) return;

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