import { normalizeProductCatalog, PRODUCT_CATEGORIES } from "./product-schema.js";
import { createProductCardMarkup } from "./product-card.js";
import { getDisplayPrice, hasValidSellingPrice } from "./product-pricing.js";

export class ProductEngine {
  constructor({ productGrid, searchInput, searchStatus, filters = {}, viewAllButton, displayLimit = 8 }) {
    this.productGrid = productGrid;
    this.searchInput = searchInput;
    this.searchStatus = searchStatus;
    this.filters = filters;
    this.viewAllButton = viewAllButton;
    this.displayLimit = displayLimit;
    this.products = [];
    this.visibleProducts = [];
    this.currentCategory = filters.category || "All";
    this.showAllProducts = false;
  }

  async loadProducts(url = "Data/products.json") {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Productcatalogus kan niet worden geladen");

    const rawProducts = await response.json();
    this.products = normalizeProductCatalog(rawProducts);
    this.applyFilters();
    return this.products;
  }

  setCategory(category) {
    this.currentCategory = category;
    this.applyFilters();
  }

  getFilteredProducts() {
    const query = this.searchInput?.value.trim().toLowerCase() || "";
    const selectedUniverses = this.filters.universes?.filter((item) => item.checked).map((item) => item.value) || [];
    const selectedEditions = this.filters.editions?.filter((item) => item.checked).map((item) => item.value) || [];
    const maxPrice = Number(this.filters.priceRange?.value || 300);

    return this.products.filter((product) => {
      const categoryMatch = !this.currentCategory || this.currentCategory === "All" || product.category === this.currentCategory;
      const universeMatch = selectedUniverses.length === 0 || selectedUniverses.includes(product.universe);
      const editionMatch = selectedEditions.length === 0 || selectedEditions.some((edition) => {
        if (edition === "Exclusive" || edition === "Exclusief") return product.exclusive;
        if (edition === "Chase") return product.chase;
        if (edition === "Vaulted" || edition === "Gewaardeerd") return product.vaulted;
        if (edition === "Signed" || edition === "Ondertekend") return product.signed;
        return false;
      });
      const priceMatch = !hasValidSellingPrice(product) || getDisplayPrice(product) <= maxPrice;
      const searchMatch = `${product.name} ${product.universe} ${product.franchise} ${product.description} ${product.tags.join(" ")} ${product.number} ${product.id} ${product.sku}`.toLowerCase().includes(query);

      return categoryMatch && universeMatch && editionMatch && priceMatch && searchMatch;
    });
  }

  renderProducts(items = this.getFilteredProducts()) {
    if (!this.productGrid) return;

    this.visibleProducts = items;
    this.productGrid.innerHTML = "";

    const itemsToRender = this.showAllProducts ? items : items.slice(0, this.displayLimit);

    itemsToRender.forEach((product) => {
      this.productGrid.insertAdjacentHTML("beforeend", createProductCardMarkup(product));
    });

    this.updateStatus(items.length, itemsToRender.length);
    this.updateViewAllButton(items.length);
  }

  updateStatus(count, shownCount) {
    if (!this.searchStatus) return;

    if (!count) {
      this.searchStatus.textContent = "Er passen geen verzamelitems bij de huidige filters.";
      return;
    }

    this.searchStatus.textContent = this.showAllProducts
      ? `Er worden ${shownCount} van de ${count} verzamelitems getoond voor je huidige filters.`
      : `Er worden ${shownCount} verzamelstuk${shownCount === 1 ? "" : "ken"} getoond voor je huidige filters.`;
  }

  updateViewAllButton(count) {
    if (!this.viewAllButton) return;

    if (count <= this.displayLimit) {
      this.viewAllButton.style.display = "none";
      return;
    }

    this.viewAllButton.style.display = "inline-flex";
    this.viewAllButton.textContent = this.showAllProducts ? "Minder tonen" : "Alles tonen";
  }

  toggleViewAll() {
    this.showAllProducts = !this.showAllProducts;
    this.renderProducts(this.getFilteredProducts());
  }

  applyFilters() {
    this.showAllProducts = false;
    this.renderProducts(this.getFilteredProducts());
  }

  bindEvents() {
    if (this.searchInput) {
      this.searchInput.addEventListener("input", () => this.applyFilters());
    }

    if (this.filters.categorySelect) {
      this.filters.categorySelect.addEventListener("change", (event) => this.setCategory(event.target.value));
    }

    if (this.viewAllButton) {
      this.viewAllButton.addEventListener("click", () => this.toggleViewAll());
    }

    [...(this.filters.universes || []), ...(this.filters.editions || []), this.filters.priceRange]
      .filter(Boolean)
      .forEach((element) => {
        element.addEventListener("change", () => this.applyFilters());
        element.addEventListener("input", () => this.applyFilters());
      });
  }

  initialize() {
    this.bindEvents();
    this.applyFilters();
    return this;
  }
}

export const buildCategoryOptions = (catalog = []) => {
  return [...new Set(catalog.map((product) => product.category))].sort((left, right) => left.localeCompare(right));
};

export const createCatalogUi = ({ categorySelect, universeContainer, editionContainer, priceRange, priceRangeValue }) => {
  const ui = {
    categorySelect,
    universes: [],
    editions: [],
    priceRange,
  };

  if (categorySelect) {
    PRODUCT_CATEGORIES.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category === "All" ? "Alles" : category;
      categorySelect.appendChild(option);
    });
  }

  if (universeContainer) {
    ["Marvel", "DC", "Pokémon", "Harry Potter", "Star Wars", "Anime"].forEach((universe) => {
      const label = document.createElement("label");
      label.className = "filter-option";
      label.innerHTML = `<input type="checkbox" class="universe-option" value="${universe}" /> ${universe}`;
      universeContainer.appendChild(label);
      ui.universes.push(label.querySelector("input"));
    });
  }

  if (editionContainer) {
    ["Exclusief", "Chase", "Gewaardeerd", "Ondertekend"].forEach((edition) => {
      const label = document.createElement("label");
      label.className = "filter-option";
      label.innerHTML = `<input type="checkbox" class="edition-option" value="${edition}" /> ${edition}`;
      editionContainer.appendChild(label);
      ui.editions.push(label.querySelector("input"));
    });
  }

  if (priceRange && priceRangeValue) {
    priceRange.addEventListener("input", () => {
      priceRangeValue.textContent = priceRange.value === "300" ? "Tot €300" : `Tot €${priceRange.value}`;
    });
  }

  return ui;
};
