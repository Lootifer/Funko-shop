export const createFooter = () => `
  <footer id="footer" class="footer premium-footer reveal">
    <div class="footer-brand-block">
      <a class="brand footer-brand" href="index.html" aria-label="Lootifer startpagina">
        <span class="brand-mark brand-mark-angular" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M11 8v30h27" />
            <path d="M18 8v21L38 9" />
            <path d="M18 29h12" />
          </svg>
        </span>
        <span class="brand-wordmark">
          <strong>Lootifer</strong>
          <small>Collectibles</small>
        </span>
      </a>
      <p>Van mijn privécollectie naar die van jou. Veel items zijn maar één keer beschikbaar.</p>
      <span class="footer-private-label">Particuliere verkoop • geen fysieke winkel</span>
    </div>

    <div class="footer-column">
      <h3>Collectie</h3>
      <a href="shop.html">Alle producten</a>
      <a href="wishlist.html">Verlanglijst</a>
      <a href="cart.html">Winkelwagen</a>
    </div>

    <div class="footer-column">
      <h3>Klantenservice</h3>
      <a href="contact.html">Contact</a>
      <a href="checkout.html">Afrekenen</a>
      <a href="terms.html">Voorwaarden</a>
    </div>

    <div class="footer-column">
      <h3>Lootifer</h3>
      <a href="about.html">Over ons</a>
      <a href="index.html#categories">Collecties</a>
      <a href="shop.html">Op is op</a>
    </div>

    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} Lootifer Collectibles</span>
      <span>Met zorg gebouwd voor verzamelaars.</span>
    </div>
  </footer>
`;
