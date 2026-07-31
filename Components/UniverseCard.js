export const createUniverseCard = (title, description, image, link = "shop.html") => `
  <article class="universe-card" style="--card-bg: linear-gradient(135deg, rgba(0,0,0,0.55), rgba(15,15,15,0.75)), url('${image}')">
    <div class="universe-card-content">
      <h3>${title}</h3>
      <p>${description}</p>
      <a href="${link}">Explore →</a>
    </div>
  </article>
`;
