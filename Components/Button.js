export const createButton = ({ label, href = "", modifier = "primary", className = "", id = "" }) => {
  const classes = [`button`, modifier, className].filter(Boolean).join(" ");
  const attrs = id ? ` id="${id}"` : "";
  return href
    ? `<a class="${classes}"${attrs} href="${href}">${label}</a>`
    : `<button class="${classes}"${attrs} type="button">${label}</button>`;
};
