import { createButton } from "./Button.js";

export const createFilterSidebar = ({ categories, universes, brands, priceValue = 300 }) => `
  <aside class="shop-sidebar" aria-label="Shop filters">
    <div class="filter-group">
      <h3>Search</h3>
      <input id="shopSearch" type="text" placeholder="Search collectibles" />
    </div>

    <div class="filter-group">
      <h3>Category</h3>
      <select id="shopCategory">
        <option value="">All categories</option>
        ${categories.map((category) => `<option value="${category}">${category}</option>`).join("")}
      </select>
    </div>

    <div class="filter-group">
      <h3>Universe</h3>
      <select id="shopUniverse">
        <option value="">All universes</option>
        ${universes.map((universe) => `<option value="${universe}">${universe}</option>`).join("")}
      </select>
    </div>

    <div class="filter-group">
      <h3>Brand</h3>
      <select id="shopBrand">
        <option value="">All brands</option>
        ${brands.map((brand) => `<option value="${brand}">${brand}</option>`).join("")}
      </select>
    </div>

    <div class="filter-group">
      <h3>Price</h3>
      <input id="shopPrice" type="range" min="0" max="300" step="10" value="${priceValue}" />
      <div class="price-range-values">
        <span>$0</span>
        <span id="shopPriceValue">Up to $${priceValue}</span>
      </div>
    </div>

    <div class="filter-group">
      <h3>Edition</h3>
      <label class="filter-option"><input type="checkbox" id="shopExclusive" /> Exclusive</label>
      <label class="filter-option"><input type="checkbox" id="shopChase" /> Chase</label>
      <label class="filter-option"><input type="checkbox" id="shopVaulted" /> Vaulted</label>
    </div>

    <div class="filter-group">
      <h3>Availability</h3>
      <label class="filter-option"><input type="checkbox" id="shopInStock" /> In stock</label>
    </div>

    <div class="filter-group">
      ${createButton({ label: "Reset filters", modifier: "secondary", id: "shopReset" })}
    </div>
  </aside>
`;
