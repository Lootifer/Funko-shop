import { createHeader } from "../../Components/Header.js";
import { createFooter } from "../../Components/Footer.js";
import { createShoppingUi } from "../../Components/Experience/shopping-ui.js";
import { loadRuntimeCatalog } from "../../Products/runtime-catalog.js";
import { createImageAttributes, attachPremiumFallback } from "../../Products/product-media.js";
import { getSellingPrice, getValidDiscountPrice } from "../../Products/product-pricing.js";
import { formatCurrency } from "./formatting.js";

const headerRoot = document.getElementById("headerRoot");
const footerRoot = document.getElementById("footerRoot");
if (headerRoot) headerRoot.innerHTML = createHeader("collections");
if (footerRoot) footerRoot.innerHTML = createFooter();
const shoppingRoot = document.createElement("div");
shoppingRoot.id = "shoppingRoot";
document.body.appendChild(shoppingRoot);
createShoppingUi({ root: shoppingRoot });

const grid = document.getElementById("collectionsHighlightGrid");
const funkoToggle = document.getElementById("collectionsFunkoToggle");
const funkoDrawer = document.getElementById("collectionsFunkoDrawer");
const funkoClose = document.getElementById("collectionsFunkoClose");
const heroTitle = document.getElementById("collectionsHeroTitle");
let products = [];
let settings = { highlights: Array.from({ length: 6 }, () => ({ productId: null, image: "" })) };
const API = "http://localhost:3001/api/site/homepage";
const normalize = (value = "") => String(value || "").trim().toLowerCase();
const haystack = (product = {}) => [product.brand, product.category, product.universe, product.franchise, ...(product.tags || [])].map(normalize).join(" ");
const matches = (product, key) => {
  const h = haystack(product);
  if (key === "funko") return h.includes("funko");
  if (key === "lego") return h.includes("lego");
  if (key === "pokemon") return h.includes("pokemon") || h.includes("pokémon");
  if (key === "star-wars") return h.includes("star wars");
  if (key === "harry-potter") return h.includes("harry potter");
  if (key === "sale") return getValidDiscountPrice(product) !== null;
  return false;
};

const copy = {
  en: { kicker:"THE LOOTIFER VAULT", doorWord:"doors", titleRest:"Pick your next obsession.", titleAria:"12 doors. Pick your next obsession.", intro:"Six worlds and six hand-picked highlights, all visible at once.", worlds:"Choose your world", worldsHint:"6 collection worlds", picks:"Highlights from the vault", allProducts:"All products", items:"items", offers:"offers", funkoKick:"Figures, pins & more", legoKick:"Build & collect", pokemonKick:"Creature collecting", starKick:"A galaxy far away", harryKick:"Wizarding world", saleKick:"Limited-time finds", coming:"Coming soon", empty:"A new find lands here soon", explore:"Explore", price:"View item", funkoDrawerEyebrow:"FUNKO VAULT", funkoDrawerTitle:"Choose your Funko line.", funkoDrawerText:"Open one of the eight Funko doors or view the complete Funko collection.", allFunko:"All Funko" },
  nl: { kicker:"DE LOOTIFER KLUIS", doorWord:"deuren", titleRest:"Kies je volgende obsessie.", titleAria:"12 deuren. Kies je volgende obsessie.", intro:"Zes werelden en zes highlights, in één oogopslag zichtbaar.", worlds:"Kies jouw wereld", worldsHint:"6 collectiewerelden", picks:"Highlights uit de kluis", allProducts:"Alle producten", items:"items", offers:"aanbiedingen", funkoKick:"Figures, pins & meer", legoKick:"Bouwen & verzamelen", pokemonKick:"Creature collecting", starKick:"Een ver sterrenstelsel", harryKick:"Magische wereld", saleKick:"Tijdelijk voordeliger", coming:"Binnenkort", empty:"Hier landt binnenkort een nieuwe vondst", explore:"Ontdek", price:"Bekijk", funkoDrawerEyebrow:"FUNKO KLUIS", funkoDrawerTitle:"Kies je Funko-lijn.", funkoDrawerText:"Open één van de acht Funko-deuren of bekijk de complete Funko-collectie.", allFunko:"Alle Funko" }
};
const language = () => localStorage.getItem("lootifer-language") === "nl" ? "nl" : "en";
const applyCopy = () => {
  const dict = copy[language()];
  document.querySelectorAll("[data-collections-copy]").forEach((el) => { const value=dict[el.dataset.collectionsCopy]; if (value) el.textContent=value; });
  const doorWord = document.querySelector("[data-collections-door-word]");
  if (doorWord) doorWord.textContent = dict.doorWord;
  if (heroTitle) heroTitle.setAttribute("aria-label", dict.titleAria);
};

const updateCounts = () => {
  ["funko","lego","pokemon","star-wars","harry-potter","sale"].forEach((key) => {
    const el=document.querySelector(`[data-collection-count="${key}"]`);
    if (el) el.textContent=String(products.filter((product)=>matches(product,key)).length);
  });
  document.querySelectorAll("[data-collections-funko-count]").forEach((el) => {
    const category = normalize(el.dataset.collectionsFunkoCount);
    el.textContent = String(products.filter((product) => normalize(product.category) === category && !product.archived).length);
  });
};

const autoHighlights = () => [...products].filter((p)=>!p.archived).sort((a,b)=>{
  const fa=(a.featured?1:0)+(getValidDiscountPrice(a)!==null?1:0);
  const fb=(b.featured?1:0)+(getValidDiscountPrice(b)!==null?1:0);
  return fb-fa || Number(b.id||0)-Number(a.id||0);
}).slice(0,6);

const slots = () => {
  const configured = Array.isArray(settings.highlights) ? settings.highlights : [];
  const manual = configured.some((entry)=>Number(entry?.productId)||entry?.image);
  if (!manual) return autoHighlights().map((product)=>({product,image:""}));
  return Array.from({length:6},(_,index)=>{ const entry=configured[index]||{}; return { product:products.find((p)=>Number(p.id)===Number(entry.productId))||null, image:String(entry.image||"") }; });
};

const accentFor = (product,index) => {
  const h=haystack(product);
  if (h.includes("pokemon")) return "#76b9ff";
  if (h.includes("star wars")) return "#8ab7ff";
  if (h.includes("harry potter")) return "#d1a5ff";
  if (getValidDiscountPrice(product)!==null) return "#ff9855";
  return ["#e0b528","#8cc8ff","#d8a3ff","#72d4ba","#ffad79","#e0b528"][index%6];
};

const render = () => {
  if (!grid) return;
  const dict=copy[language()];
  const entries=slots();
  grid.innerHTML=Array.from({length:6},(_,index)=>{
    const entry=entries[index]||{}; const product=entry.product||null; const image=entry.image||product?.image||"";
    if (!product && !image) return `<a class="collections-pick-card is-empty" href="shop.html" style="--pick-accent:${accentFor({},index)}"><span class="pick-index">0${index+1}</span><div class="pick-media"><span class="pick-placeholder"></span></div><div class="pick-copy"><div><small>${dict.coming}</small><strong>${dict.empty}</strong></div><b>→</b></div></a>`;
    const accent=accentFor(product||{},index);
    if (!product) return `<a class="collections-pick-card" href="shop.html" style="--pick-accent:${accent}"><span class="pick-index">0${index+1}</span><span class="pick-badge">Lootifer</span><div class="pick-media"><img ${createImageAttributes({src:image,alt:"Collection highlight"})}></div><div class="pick-copy"><div><small>Lootifer</small><strong>${dict.explore}</strong></div><b>→</b></div></a>`;
    const sale=getValidDiscountPrice(product); const price=sale ?? getSellingPrice(product); const label=product.universe||product.category||product.brand||"Collectible"; const badge=sale!==null?"SALE":product.category||"Collectible";
    return `<a class="collections-pick-card" href="product.html?slug=${encodeURIComponent(product.slug||"")}" style="--pick-accent:${accent}"><span class="pick-index">0${index+1}</span><span class="pick-badge">${badge}</span><div class="pick-media"><img ${createImageAttributes({src:image,alt:product.name||"Collectible"})}></div><div class="pick-copy"><div><small>${label}</small><strong>${product.name||"Collectible"}</strong></div><b>${price>0?formatCurrency(price):"→"}</b></div></a>`;
  }).join("");
  attachPremiumFallback(grid);
};

const loadSettings = async () => {
  try { const response=await fetch(API,{credentials:"include",cache:"no-store"}); if(response.ok){ const data=await response.json(); settings.highlights=Array.from({length:6},(_,i)=>({productId:Number(data?.highlights?.[i]?.productId)||null,image:String(data?.highlights?.[i]?.image||"")})); } } catch {}
};

const setFunkoDrawer = (open) => {
  if (!funkoDrawer || !funkoToggle) return;
  const next = Boolean(open);
  funkoDrawer.classList.toggle("is-open", next);
  funkoDrawer.setAttribute("aria-hidden", String(!next));
  funkoToggle.setAttribute("aria-expanded", String(next));
  if (next) {
    window.requestAnimationFrame(() => funkoDrawer.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }
};

funkoToggle?.addEventListener("click", () => setFunkoDrawer(funkoToggle.getAttribute("aria-expanded") !== "true"));
funkoClose?.addEventListener("click", () => setFunkoDrawer(false));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") setFunkoDrawer(false); });

const init = async () => {
  applyCopy();
  try { const [catalog]=await Promise.all([loadRuntimeCatalog(),loadSettings()]); products=catalog.products||[]; } catch { products=[]; }
  updateCounts(); render();
};
window.addEventListener("lootifer:language-change",()=>{applyCopy();render();});
init();
