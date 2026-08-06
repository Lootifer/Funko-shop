import { createButton } from "./Button.js";

const getFilterCopy = () => {
  const language = typeof window !== "undefined" && window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en";
  return language === "nl"
    ? {
        title: "Filteren",
        search: "Zoeken",
        searchPlaceholder: "Zoek verzamelitems",
        category: "Categorie",
        allCategories: "Alle categorieën",
        universe: "Universum",
        allUniverses: "Alle universums",
        brand: "Merk",
        allBrands: "Alle merken",
        price: "Prijs",
        until: "Tot",
        edition: "Editie",
        exclusive: "Exclusief",
        chase: "Chase",
        vaulted: "Gewaardeerd",
        availability: "Beschikbaarheid",
        inStock: "Op voorraad",
        reset: "Filters wissen",
      }
    : {
        title: "Filters",
        search: "Search",
        searchPlaceholder: "Search collectibles",
        category: "Category",
        allCategories: "All categories",
        universe: "Universe",
        allUniverses: "All universes",
        brand: "Brand",
        allBrands: "All brands",
        price: "Price",
        until: "Up to",
        edition: "Edition",
        exclusive: "Exclusive",
        chase: "Chase",
        vaulted: "Vaulted",
        availability: "Availability",
        inStock: "In stock",
        reset: "Clear filters",
      };
};

export const createFilterSidebar = ({ categories, universes, brands, priceValue = 300 }) => {
  const copy = getFilterCopy();
  return `
    <aside class="shop-sidebar" aria-label="${copy.title}">
      <h2 class="filter-panel-title">${copy.title}</h2>

      <div class="filter-group">
        <h3>${copy.search}</h3>
        <input id="shopSearch" type="text" placeholder="${copy.searchPlaceholder}" />
      </div>

      <div class="filter-group">
        <h3>${copy.category}</h3>
        <select id="shopCategory">
          <option value="">${copy.allCategories}</option>
          ${categories.map((category) => `<option value="${category}">${category}</option>`).join("")}
        </select>
      </div>

      <div class="filter-group">
        <h3>${copy.universe}</h3>
        <select id="shopUniverse">
          <option value="">${copy.allUniverses}</option>
          ${universes.map((universe) => `<option value="${universe}">${universe}</option>`).join("")}
        </select>
      </div>

      <div class="filter-group">
        <h3>${copy.brand}</h3>
        <select id="shopBrand">
          <option value="">${copy.allBrands}</option>
          ${brands.map((brand) => `<option value="${brand}">${brand}</option>`).join("")}
        </select>
      </div>

      <div class="filter-group">
        <h3>${copy.price}</h3>
        <input id="shopPrice" type="range" min="0" max="300" step="10" value="${priceValue}" />
        <div class="price-range-values">
          <span>€0</span>
          <span id="shopPriceValue">${copy.until} €${priceValue}</span>
        </div>
      </div>

      <div class="filter-group">
        <h3>${copy.edition}</h3>
        <label class="filter-option"><input type="checkbox" id="shopExclusive" /> ${copy.exclusive}</label>
        <label class="filter-option"><input type="checkbox" id="shopChase" /> ${copy.chase}</label>
        <label class="filter-option"><input type="checkbox" id="shopVaulted" /> ${copy.vaulted}</label>
      </div>

      <div class="filter-group">
        <h3>${copy.availability}</h3>
        <label class="filter-option"><input type="checkbox" id="shopInStock" /> ${copy.inStock}</label>
      </div>

      <div class="filter-group">
        ${createButton({ label: copy.reset, modifier: "secondary", id: "shopReset" })}
      </div>
    </aside>
  `;
};
