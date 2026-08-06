const normalizeUniverseClass = (title = "") => {
  const value = String(title).toLowerCase();
  if (value.includes("batman") || value === "dc") return "batman";
  if (value.includes("marvel")) return "marvel";
  if (value.includes("pok")) return "pokemon";
  if (value.includes("star wars")) return "star-wars";
  if (value.includes("harry")) return "harry-potter";
  return "default";
};

const getUniverseIcon = (type) => {
  const icons = {
    batman: `
      <svg class="universe-symbol universe-symbol-bat" viewBox="0 0 160 88" aria-hidden="true">
        <g class="bat-wings">
          <path d="M8 29c16 1 24 7 34 16l11-18 12 12 15-25 15 25 12-12 11 18c10-9 18-15 34-16-8 16-20 28-37 36l-15 17-15-17C28 57 16 45 8 29Z"/>
        </g>
      </svg>`,
    marvel: `
      <svg class="universe-symbol" viewBox="0 0 120 88" aria-hidden="true">
        <rect x="12" y="15" width="96" height="58" rx="8" />
        <path d="M27 59V29h10l9 16 9-16h10v30H55V44l-9 15-9-15v15H27Zm45 0V29h21v8H82v4h10v7H82v4h12v7H72Z" class="symbol-cutout"/>
      </svg>`,
    pokemon: `
      <svg class="universe-symbol" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="38" />
        <path d="M12 50h76" class="symbol-line"/>
        <circle cx="50" cy="50" r="13" class="symbol-core"/>
        <circle cx="50" cy="50" r="6" class="symbol-cutout"/>
      </svg>`,
    "star-wars": `
      <svg class="universe-symbol universe-symbol-stars" viewBox="0 0 120 90" aria-hidden="true">
        <path d="M34 73 72 14" class="symbol-line saber-line"/>
        <path d="M30 72h9" class="symbol-line"/>
        <path d="m91 22 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z"/>
        <circle cx="28" cy="27" r="3" />
        <circle cx="87" cy="67" r="2.5" />
      </svg>`,
    "harry-potter": `
      <svg class="universe-symbol universe-symbol-magic" viewBox="0 0 110 95" aria-hidden="true">
        <path d="M64 8 34 49h21L43 87l35-48H57L64 8Z"/>
        <path d="m88 18 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"/>
        <path d="m22 21 1.5 4.5L28 27l-4.5 1.5L22 33l-1.5-4.5L16 27l4.5-1.5L22 21Z"/>
      </svg>`,
    default: `<span class="universe-symbol universe-symbol-letter" aria-hidden="true">L</span>`,
  };
  return icons[type] || icons.default;
};

export const createUniverseCard = (title, description, image, link = "shop.html") => {
  const type = normalizeUniverseClass(title);
  const imageStyle = image ? ` style="--universe-image: url('${image}')"` : "";
  return `
    <article class="universe-card premium-universe-card universe-${type} depth-card ${image ? "has-universe-photo" : ""}"${imageStyle}>
      ${image ? '<div class="universe-photo" aria-hidden="true"></div>' : ""}
      <div class="universe-card-aurora" aria-hidden="true"></div>
      <div class="universe-card-icon">${getUniverseIcon(type)}</div>
      <div class="universe-card-content">
        <h3>${title}</h3>
        <p>${description}</p>
        <a href="${link}">Ontdek <span aria-hidden="true">→</span></a>
      </div>
    </article>
  `;
};
