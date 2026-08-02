import { createButton } from "./Button.js";

export const createFilterSidebar = ({ categories, universes, brands, priceValue = 300 }) => `
  <aside class="shop-sidebar" aria-label="Shop filters">
    <div class="filter-group">
      <h3>Zoeken</h3>
      <input id="shopSearch" type="text" placeholder="Zoek collectibles" />
    </div>

    <div class="filter-group">
      <h3>Categorie</h3>
      <select id="shopCategory">
        <option value="">Alle categorieën</option>
        ${categories.map((category) => `<option value="${category}">${category}</option>`).join("")}
      </select>
    </div>

    <div class="filter-group">
      <h3>Universum</h3>
      <select id="shopUniverse">
        <option value="">Alle universums</option>
        ${universes.map((universe) => `<option value="${universe}">${universe}</option>`).join("")}
      </select>
    </div>

    <div class="filter-group">
      <h3>Merk</h3>
      <select id="shopBrand">
        <option value="">Alle merken</option>
        ${brands.map((brand) => `<option value="${brand}">${brand}</option>`).join("")}
      </select>
    </div>

    <div class="filter-group">
      <h3>Prijs</h3>
      <input id="shopPrice" type="range" min="0" max="300" step="10" value="${priceValue}" />
      <div class="price-range-values">
        <span>€0</span>
        <span id="shopPriceValue">Tot €${priceValue}</span>
      </div>
    </div>

    <div class="filter-group">
      <h3>Editie</h3>
      <label class="filter-option"><input type="checkbox" id="shopExclusive" /> Exclusief</label>
      <label class="filter-option"><input type="checkbox" id="shopChase" /> Chase</label>
      <label class="filter-option"><input type="checkbox" id="shopVaulted" /> Gewaardeerd</label>
    </div>

    <div class="filter-group">
      <h3>Beschikbaarheid</h3>
      <label class="filter-option"><input type="checkbox" id="shopInStock" /> Op voorraad</label>
    </div>

    <div class="filter-group">
      ${createButton({ label: "Filters wissen", modifier: "secondary", id: "shopReset" })}
    </div>
  </aside>
`;
