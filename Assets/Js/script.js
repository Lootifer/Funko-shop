import { ProductEngine, createCatalogUi } from "../../Products/product-engine.js";
import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createSearchBar } from "../../Components/SearchBar.js";
import { createUniverseCard } from "../../Components/UniverseCard.js";
import { createShoppingUi, bindShoppingActions, attachProductCardInteractions } from "../../Components/Experience/shopping-ui.js";
import { createInstantSearch } from "../../Components/Experience/instant-search.js";
import { shoppingState } from "../../Components/Experience/shopping-state.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");
const searchRoot = document.getElementById("searchRoot");

if (headerRoot) headerRoot.innerHTML = createHeader("home");
if (footerRoot) footerRoot.innerHTML = createFooter();
const searchSuggestions = ["Batman", "593", "Marvel", "Pokémon"];
if (searchRoot) searchRoot.innerHTML = createSearchBar("Search figures, universes, or limited drops", searchSuggestions);

const universeGrid = document.getElementById("universeGrid");
const universeImageByName = {
  Batman: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
  DC: "https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=900&q=80",
  Marvel: "https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=900&q=80",
  "Star Wars": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
  "Pokémon": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
  "Harry Potter": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80",
  Disney: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=900&q=80",
  "Dragon Ball": "https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&w=900&q=80",
  Naruto: "https://images.unsplash.com/photo-1612036782180-6f0822045d07?auto=format&fit=crop&w=900&q=80",
  "One Piece": "https://images.unsplash.com/photo-1608889476561-6242cfdbf622?auto=format&fit=crop&w=900&q=80",
};

const UNIVERSE_ORDER = [
  "Batman",
  "DC",
  "Marvel",
  "Star Wars",
  "Pokémon",
  "Harry Potter",
  "Disney",
  "Dragon Ball",
  "Naruto",
  "One Piece",
];

const renderUniverseCards = (products = []) => {
  if (!universeGrid) return;

  const counts = products.reduce((accumulator, product) => {
    const key = product.universe || "Other";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const universeItems = UNIVERSE_ORDER.filter((name) => counts[name]).map((name) => ({
    title: name,
    description: `${counts[name]} collectible${counts[name] === 1 ? "" : "s"}`,
    image: universeImageByName[name] || universeImageByName.DC,
  }));

  universeGrid.innerHTML = universeItems.map((item) => createUniverseCard(item.title, item.description, item.image)).join("");
};

const shoppingRoot = document.createElement("div");
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const searchStatus = document.getElementById("searchStatus");
const instantSearchResults = document.getElementById("instantSearchResults");
const clubForm = document.getElementById("clubForm");
const clubEmail = document.getElementById("clubEmail");
const clubMessage = document.getElementById("clubMessage");
const notifyForm = document.getElementById("notifyMeForm");
const notifyEmail = document.getElementById("notifyEmail");
const notifyMessage = document.getElementById("notifyMessage");

document.querySelectorAll(".search-suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.suggestion || "";
    if (searchInput) {
      searchInput.value = value;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
});

clubForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!clubEmail?.value) return;
  shoppingState.subscribeToClub(clubEmail.value);
  if (clubMessage) {
    clubMessage.textContent = "You're on the list — early access and alerts are on the way.";
  }
  clubForm.reset();
});

notifyForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!notifyEmail?.value) return;
  shoppingState.subscribeToClub(notifyEmail.value);
  if (notifyMessage) {
    notifyMessage.textContent = "You're on the notify list — restocks and rare drops will reach you first.";
  }
  notifyForm.reset();
});

const productGrid = document.getElementById("productGrid");
const categoryFilter = document.getElementById("categoryFilter");
const universeFilterGroup = document.getElementById("universeFilterGroup");
const editionFilterGroup = document.getElementById("editionFilterGroup");
const priceRange = document.getElementById("priceRange");
const priceRangeValue = document.getElementById("priceRangeValue");
const viewAllButton = document.getElementById("viewAllButton");

const filterUi = createCatalogUi({
  categorySelect: categoryFilter,
  universeContainer: universeFilterGroup,
  editionContainer: editionFilterGroup,
  priceRange,
  priceRangeValue,
});

const engine = new ProductEngine({
  productGrid,
  searchInput,
  searchStatus,
  filters: filterUi,
  viewAllButton,
  displayLimit: 8,
});

engine.initialize();

const instantSearch = createInstantSearch({
  input: searchInput,
  resultsContainer: instantSearchResults,
  products: [],
  searchButton,
});

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

bindProductCardActions(productGrid);

engine.loadProducts("Data/products.json").then(() => {
  instantSearch.updateProducts(engine.products);
  renderUniverseCards(engine.products);
  bindProductCardActions(productGrid);
}).catch(() => {
  renderUniverseCards([]);
  if (productGrid) {
    productGrid.innerHTML = '<p class="card-empty">Product catalog is unavailable right now.</p>';
  }
});

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
