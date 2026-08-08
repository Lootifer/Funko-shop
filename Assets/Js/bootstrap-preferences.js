(() => {
  try {
    if (!window.localStorage.getItem("lootifer-language")) {
      window.localStorage.setItem("lootifer-language", "en");
    }
    window.localStorage.setItem("lootifer-theme", "dark");
    window.localStorage.setItem("lootifer-preference-version", "v16-dark-only");
    const language = window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en";
    document.documentElement.dataset.theme = "dark";
    document.documentElement.lang = language;
  } catch {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.lang = "en";
  }
})();
