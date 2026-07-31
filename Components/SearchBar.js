export const createSearchBar = (placeholder = "Search collectibles", suggestions = []) => `
  <div class="search-shell reveal">
    <div class="search-bar">
      <span class="search-icon">⌕</span>
      <input id="searchInput" type="text" placeholder="${placeholder}" aria-label="Search collectibles" />
      <button type="button">Search</button>
    </div>
    ${suggestions.length ? `<div class="search-suggestions">${suggestions.map((suggestion) => `<button class="search-suggestion" type="button" data-suggestion="${suggestion}">${suggestion}</button>`).join("")}</div>` : ""}
    <p id="searchStatus">Search across premium figures, pins, and display pieces.</p>
  </div>
`;
