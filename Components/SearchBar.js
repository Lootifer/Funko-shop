export const createSearchBar = (placeholder = "Zoek collectibles", suggestions = []) => `
  <div class="search-shell reveal">
    <div class="search-bar" role="search" aria-label="Zoekbalk voor verzamelaars">
      <span class="search-icon">⌕</span>
      <input id="searchInput" type="text" placeholder="${placeholder}" aria-label="Zoek collectibles" />
      <button id="searchButton" type="button">Zoeken</button>
    </div>
    <div id="instantSearchResults" class="search-results" hidden></div>
    ${suggestions.length ? `<div class="search-suggestions">${suggestions.map((suggestion) => `<button class="search-suggestion" type="button" data-suggestion="${suggestion}">${suggestion}</button>`).join("")}</div>` : ""}
    <p id="searchStatus">Zoek door premium figures, pins en displaystukken.</p>
  </div>
`;
