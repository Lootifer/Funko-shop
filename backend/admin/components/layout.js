export const createAdminSidebar = (active = "dashboard") => `
  <aside class="admin-sidebar">
    <div class="admin-brand">
      <span class="brand-mark">L</span>
      <div>
        <strong>Lootifer</strong>
        <small>Admin</small>
      </div>
    </div>

    <nav class="admin-nav">
      <a href="dashboard.html" class="${active === "dashboard" ? "active" : ""}">Dashboard</a>
      <a href="products.html" class="${active === "products" ? "active" : ""}">Producten</a>
      <a href="homepage.html" class="${active === "homepage" ? "active" : ""}">Homepage</a>
      <a href="orders.html" class="${active === "orders" ? "active" : ""}">Bestellingen</a>
      <a href="settings.html" class="${active === "settings" ? "active" : ""}">Instellingen</a>
    </nav>
  </aside>
`;

export const createAdminTopbar = (title = "Dashboard") => `
  <header class="admin-topbar">
    <h1>${title}</h1>
    <div class="admin-topbar-actions">
      <span class="admin-pill" data-admin-user>Beheerder</span>
      <a class="button secondary" href="../index.html">Bekijk winkel</a>
      <button class="button secondary" type="button" data-admin-logout>Uitloggen</button>
    </div>
  </header>
`;

export const createStatsCard = (label, value, detail = "") => `
  <article class="admin-card admin-stat-card">
    <p class="admin-label">${label}</p>
    <h3>${value}</h3>
    <p class="admin-detail">${detail}</p>
  </article>
`;

export const createTable = (headers, rows) => `
  <div class="admin-card">
    <table class="admin-table">
      <thead>
        <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  </div>
`;

export const createFormCard = (title, children) => `
  <section class="admin-card admin-form-card">
    <h3>${title}</h3>
    <div class="admin-form-grid">${children}</div>
  </section>
`;
