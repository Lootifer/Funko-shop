import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createShoppingUi, syncHeaderCounters } from "../../Components/Experience/shopping-ui.js";
import { loadRuntimeCatalog } from "../../Products/runtime-catalog.js";
import { getValidDiscountPrice } from "../../Products/product-pricing.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");
if (headerRoot) headerRoot.innerHTML = createHeader("shop");
if (footerRoot) footerRoot.innerHTML = createFooter();

const shoppingRoot = document.createElement("div");
shoppingRoot.id = "shoppingRoot";
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });
syncHeaderCounters();
window.addEventListener("lootifer:state-updated", syncHeaderCounters);

const normalize = (value = "") => String(value).trim().toLowerCase();
const haystack = (product = {}) =>
  [product.brand, product.category, product.universe, product.franchise, ...(Array.isArray(product.tags) ? product.tags : [])]
    .map(normalize).join(" ");

const matches = (product, key) => {
  const text = haystack(product);
  const isFunko = text.includes("funko");
  if (key === "funko") return isFunko;
  if (key === "lego") return !isFunko && text.includes("lego");
  if (key === "pokemon") return !isFunko && !text.includes("collectible lamps") && (text.includes("pokemon") || text.includes("pokémon"));
  if (key === "star-wars") return !isFunko && text.includes("star wars");
  if (key === "collectible-lamps") return !isFunko && text.includes("collectible lamps");
  if (key === "figures-toys") return !isFunko && (text.includes("figures & toys") || text.includes("figures and toys"));
  if (key === "vintage-figures") return !isFunko && text.includes("vintage figures");
  if (key === "hot-wheels") return !isFunko && text.includes("hot wheels");
  if (key === "sale") return getValidDiscountPrice(product) !== null;
  return false;
};

const setCounts = (products = []) => {
  ["funko","lego","pokemon","star-wars","collectible-lamps","figures-toys","vintage-figures","hot-wheels","sale"].forEach((key) => {
    const count = products.filter((p) => matches(p,key)).length;
    document.querySelectorAll(`[data-category-count="${key}"]`).forEach((el) => el.textContent = String(count));
  });
  document.querySelectorAll("[data-funko-count]").forEach((el) => {
    const category = normalize(el.dataset.funkoCount || "");
    el.textContent = String(products.filter((p) => normalize(p.category) === category).length);
  });
};

loadRuntimeCatalog()
  .then((result) => setCounts(result.products || []))
  .catch((error) => { console.error("Categorie-aantallen konden niet worden geladen", error); setCounts([]); });

const modal = document.getElementById("shopFunkoModal");
const trigger = document.querySelector('[data-category-card="funko"]');
const close = modal?.querySelector(".shop-v44-modal-close");
const setModal = (open) => {
  if (!modal) return;
  modal.classList.toggle("is-open", Boolean(open));
  modal.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.style.overflow = open ? "hidden" : "";
};
trigger?.addEventListener("click", () => setModal(true));
close?.addEventListener("click", () => setModal(false));
modal?.addEventListener("click", (event) => { if (event.target === modal) setModal(false); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") setModal(false); });
