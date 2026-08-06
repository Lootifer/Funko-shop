(() => {
  try {
    const version = "v14-english-light";
    if (window.localStorage.getItem("lootifer-preference-version") !== version) {
      window.localStorage.setItem("lootifer-language", "en");
      window.localStorage.setItem("lootifer-theme", "light");
      window.localStorage.setItem("lootifer-preference-version", version);
    }

    const theme = window.localStorage.getItem("lootifer-theme") === "dark" ? "dark" : "light";
    const language = window.localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en";
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.lang = "en";
  }
})();
