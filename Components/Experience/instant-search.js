import { createImageAttributes } from "../../Products/product-media.js";
import { formatCurrency } from "../../Assets/Js/formatting.js";
import { getProductPriceLabel } from "../../Products/product-pricing.js";

const SEARCH_LIMIT = 8;
const DEBOUNCE_MS = 120;

const normalize = (value = "") => String(value)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim();

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const debounce = (fn, delay = DEBOUNCE_MS) => {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const getStatusBadges = (product) => {
  const badges = [];
  if (product.exclusive) badges.push("Exclusief");
  if (product.chase) badges.push("Chase");
  if (product.vaulted) badges.push("Gewaardeerd");
  if (!badges.length) badges.push("Standaard");
  return badges;
};

const isKnownBarcode = (value = "") => {
  const barcode = String(value || "").trim();
  return Boolean(barcode) && !/^unknown/i.test(barcode);
};

const getCharacter = (product) => {
  if (product.character) return product.character;
  const fromName = String(product.name || "").split("(")[0].trim();
  return fromName || product.name || "";
};

const buildSearchIndex = (products = []) => {
  return products.map((product) => {
    const character = getCharacter(product);
    const fields = {
      name: String(product.name || ""),
      number: String(product.number || ""),
      sku: String(product.sku || ""),
      barcode: String(product.barcode || ""),
      universe: String(product.universe || ""),
      franchise: String(product.franchise || ""),
      character,
      category: String(product.category || ""),
    };

    const normalizedFields = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, normalize(value)])
    );

    return {
      product,
      fields,
      normalizedFields,
      searchBlob: normalize(Object.values(fields).join(" ")),
    };
  });
};

const scoreMatch = (entry, query, terms) => {
  const { normalizedFields } = entry;
  let score = 0;

  if (normalizedFields.name.includes(query)) score += 120;
  if (normalizedFields.character.includes(query)) score += 90;
  if (normalizedFields.number.includes(query)) score += 80;
  if (normalizedFields.sku.includes(query)) score += 80;
  if (normalizedFields.barcode.includes(query)) score += 75;
  if (normalizedFields.franchise.includes(query)) score += 55;
  if (normalizedFields.universe.includes(query)) score += 50;
  if (normalizedFields.category.includes(query)) score += 40;

  if (normalizedFields.sku.startsWith(query)) score += 30;
  if (normalizedFields.barcode.startsWith(query)) score += 30;
  if (normalizedFields.name.startsWith(query)) score += 25;

  terms.forEach((term) => {
    if (entry.searchBlob.includes(term)) score += 10;
  });

  return score;
};

const highlightTokens = (value = "", terms = []) => {
  let output = escapeHtml(value);
  const validTerms = terms
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .sort((a, b) => b.length - a.length);

  validTerms.forEach((term) => {
    const matcher = new RegExp(`(${escapeRegex(term)})`, "ig");
    output = output.replace(matcher, "<mark>$1</mark>");
  });

  return output;
};

export const createInstantSearch = ({ input, resultsContainer, products = [], statusElement, searchButton }) => {
  if (!input || !resultsContainer) {
    return {
      updateProducts: () => {},
    };
  }

  let index = buildSearchIndex(products);
  let activeIndex = -1;
  let currentResults = [];
  let currentTerms = [];

  const hideResults = () => {
    resultsContainer.innerHTML = "";
    resultsContainer.hidden = true;
    input.setAttribute("aria-expanded", "false");
    activeIndex = -1;
  };

  const openProduct = (product) => {
    if (!product?.slug) return;
    window.location.href = `product.html?slug=${encodeURIComponent(product.slug)}`;
  };

  const renderResults = (results, terms) => {
    currentResults = results;
    currentTerms = terms;

    if (!results.length) {
      resultsContainer.hidden = false;
      input.setAttribute("aria-expanded", "true");
      resultsContainer.innerHTML = '<div class="search-result-empty">Geen bijpassende verzamelitems gevonden.</div>';
      return;
    }

    const itemsMarkup = results.map((entry, indexValue) => {
      const product = entry.product;
      const badges = getStatusBadges(product)
        .map((badge) => `<span class="search-status-badge">${badge}</span>`)
        .join("");

      const name = highlightTokens(product.name || "Collectible", terms);
      const number = highlightTokens(product.number || "-", terms);
      const universe = highlightTokens(product.universe || product.category || "-", terms);
      const sku = highlightTokens(product.sku || "-", terms);
      const barcode = isKnownBarcode(product.barcode) ? highlightTokens(product.barcode, terms) : "Niet beschikbaar";
      const franchise = highlightTokens(product.franchise || "-", terms);
      const character = highlightTokens(getCharacter(product), terms);

      return `
        <a
          href="product.html?slug=${encodeURIComponent(product.slug || "")}" 
          class="search-result-item${indexValue === activeIndex ? " active" : ""}"
          role="option"
          aria-selected="${indexValue === activeIndex ? "true" : "false"}"
          data-result-index="${indexValue}"
        >
          <div class="search-result-image-wrap">
            <img ${createImageAttributes({ src: product.image, alt: product.name, loading: "lazy" })} />
          </div>
          <div class="search-result-content">
            <div class="search-result-title-row">
              <strong class="search-result-name">${name}</strong>
              <span class="search-result-price">${getProductPriceLabel(product, formatCurrency)}</span>
            </div>
            <p class="search-result-meta">${number} • ${universe}</p>
            <p class="search-result-submeta">SKU: ${sku} • Barcode: ${barcode}</p>
            <p class="search-result-submeta">Franchise: ${franchise} • Personage: ${character}</p>
            <div class="search-status-badges">${badges}</div>
          </div>
        </a>
      `;
    }).join("");

    resultsContainer.hidden = false;
    input.setAttribute("aria-expanded", "true");
    resultsContainer.innerHTML = `<div class="search-result-list" role="listbox">${itemsMarkup}</div>`;

    resultsContainer.querySelectorAll("[data-result-index]").forEach((node) => {
      node.addEventListener("mouseenter", () => {
        activeIndex = Number(node.dataset.resultIndex || -1);
        syncActive();
      });

      node.addEventListener("click", () => {
        hideResults();
      });
    });
  };

  const syncActive = () => {
    const nodes = resultsContainer.querySelectorAll("[data-result-index]");
    nodes.forEach((node, indexValue) => {
      const active = indexValue === activeIndex;
      node.classList.toggle("active", active);
      node.setAttribute("aria-selected", active ? "true" : "false");
      if (active) {
        node.scrollIntoView({ block: "nearest" });
      }
    });
  };

  const findMatches = (queryRaw = "") => {
    const query = normalize(queryRaw);
    if (!query) {
      hideResults();
      return;
    }

    const terms = query.split(/\s+/).filter(Boolean);

    const matches = index
      .map((entry) => ({
        entry,
        score: scoreMatch(entry, query, terms),
      }))
      .filter(({ entry, score }) => score > 0 || terms.every((term) => entry.searchBlob.includes(term)))
      .sort((left, right) => right.score - left.score || Number(right.entry.product.stock || 0) - Number(left.entry.product.stock || 0))
      .slice(0, SEARCH_LIMIT)
      .map(({ entry }) => entry);

    activeIndex = matches.length ? 0 : -1;
    renderResults(matches, terms);
    syncActive();

    if (statusElement) {
      statusElement.textContent = matches.length
        ? `${matches.length} direct resultaat${matches.length === 1 ? "" : "en"} gevonden.`
        : "Geen directe resultaten voor deze zoekopdracht.";
    }
  };

  const debouncedSearch = debounce(findMatches, DEBOUNCE_MS);

  input.setAttribute("autocomplete", "off");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", "instantSearchResults");

  input.addEventListener("input", () => {
    debouncedSearch(input.value);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      findMatches(input.value);
    }
  });

  input.addEventListener("keydown", (event) => {
    if (!currentResults.length) {
      if (event.key === "Escape") {
        hideResults();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = activeIndex >= currentResults.length - 1 ? 0 : activeIndex + 1;
      syncActive();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = activeIndex <= 0 ? currentResults.length - 1 : activeIndex - 1;
      syncActive();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const active = currentResults[activeIndex] || currentResults[0];
      if (active) {
        openProduct(active.product);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      hideResults();
      input.blur();
    }
  });

  if (searchButton) {
    searchButton.addEventListener("click", () => {
      if (!currentResults.length) {
        findMatches(input.value);
        return;
      }

      const active = currentResults[activeIndex] || currentResults[0];
      if (active) {
        openProduct(active.product);
      }
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (target === input || resultsContainer.contains(target)) return;
    hideResults();
  });

  return {
    updateProducts: (nextProducts = []) => {
      index = buildSearchIndex(nextProducts);
      if (input.value.trim()) {
        findMatches(input.value);
      }
    },
  };
};
