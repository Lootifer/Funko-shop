const searchInput = document.getElementById("searchInput");
const searchStatus = document.getElementById("searchStatus");
const cards = Array.from(document.querySelectorAll(".collectible-card"));

if (searchInput && searchStatus) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const text = card.dataset.name + " " + card.textContent.toLowerCase();
      const matches = text.includes(query);
      card.style.display = matches ? "block" : "none";
      if (matches) visibleCount += 1;
    });

    searchStatus.textContent = query
      ? `Showing ${visibleCount} collectible${visibleCount === 1 ? "" : "s"} for “${searchInput.value.trim()}”.`
      : "Search across premium figures, pins, and display pieces.";
  });
}

const revealItems = document.querySelectorAll(".reveal");

if (revealItems.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));
}
