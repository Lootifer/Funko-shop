import fs from "node:fs/promises";
import path from "node:path";
import { all, exec, get, run } from "../db/connection.js";

const PROJECT_ROOT = path.resolve(process.cwd());
const IMAGE_ROOT = path.resolve(PROJECT_ROOT, "Assets", "Images");
const DATA_ROOT = path.resolve(PROJECT_ROOT, "Data");
const IMAGE_SLOTS = ["front", "back", "left", "right"];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const cleanText = (value = "") => String(value || "").trim();
const slugify = (value = "") => cleanText(value)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const normalizeUniverseFolder = (universe = "", category = "") => {
  const categoryValue = cleanText(category).toLowerCase();
  if (categoryValue.includes("funko movies")) return "Movies";
  if (categoryValue.includes("funko television")) return "Television";
  if (categoryValue.includes("funko animation")) return "Animation";
  if (categoryValue.includes("funko games")) return "Games";
  if (categoryValue.includes("funko heroes")) return "Heroes";
  if (categoryValue.includes("funko pin")) return "Pin";
  if (categoryValue.includes("funko bitty pop")) return "Bitty Pop";
  if (categoryValue.includes("funko tee")) return "Tee";

  const value = cleanText(universe).toLowerCase();
  if (value.includes("marvel")) return "Marvel";
  if (value.includes("dc") || value.includes("batman")) return "DC";
  if (value.includes("disney")) return "Disney";
  if (value.includes("anime") || value.includes("dragon") || value.includes("naruto") || value.includes("one piece")) return "Anime";
  if (value.includes("game")) return "Games";
  if (value.includes("tv") || value.includes("television")) return "Television";
  return "Movies";
};

const categoryRoot = (category = "", brand = "") => {
  const source = `${category} ${brand}`.toLowerCase();
  if (source.includes("funko")) return "funko";
  if (source.includes("lego")) return "lego";
  if (source.includes("hot toys") || source.includes("hottoys")) return "Hot Toys";
  if (source.includes("hot wheels")) return "hot-wheels";
  if (source.includes("pokemon") || source.includes("pokémon")) return "Pokémon";
  if (source.includes("trading cards") || source.includes("tcg")) return "Trading Cards";
  if (source.includes("statue")) return "Statues";
  return slugify(category || brand || "products") || "products";
};

const getProductFolder = (product = {}) => {
  const slug = slugify(product.slug || `${product.name || ""} ${String(product.number || "").replace(/#/g, " ")}`);
  if (!slug) throw new Error(`Product ${product.id || "?"} heeft geen geldige slug voor foto-opslag.`);

  const root = categoryRoot(product.category, product.brand);
  const relativeFolder = root === "funko"
    ? path.posix.join("Assets", "Images", "Products", root, normalizeUniverseFolder(product.universe, product.category), slug)
    : path.posix.join("Assets", "Images", "Products", root, slug);
  const absoluteFolder = path.resolve(PROJECT_ROOT, ...relativeFolder.split("/"));

  if (!absoluteFolder.startsWith(IMAGE_ROOT)) throw new Error("Ongeldig afbeeldingspad.");
  return { slug, relativeFolder, absoluteFolder };
};

const isDataImageUrl = (value = "") => /^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(String(value || ""));

const decodeDataImage = (value = "") => {
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([a-z0-9+/=\r\n]+)$/i.exec(String(value || ""));
  if (!match) throw new Error("Ongeldige ingesloten productfoto.");
  const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error("Ingesloten productfoto is leeg of te groot.");
  return { extension, buffer };
};

const safeJsonArray = (value) => {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const removeOldSlotFiles = async (folderPath, slot) => {
  const extensions = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG", "WEBP"];
  await Promise.all(extensions.map(async (extension) => {
    try { await fs.unlink(path.join(folderPath, `${slot}.${extension}`)); } catch { /* not present */ }
  }));
};

const writeDataImage = async ({ dataUrl, slot, folder }) => {
  const { extension, buffer } = decodeDataImage(dataUrl);
  await fs.mkdir(folder.absoluteFolder, { recursive: true });
  await removeOldSlotFiles(folder.absoluteFolder, slot);
  const fileName = `${slot}.${extension}`;
  await fs.writeFile(path.join(folder.absoluteFolder, fileName), buffer);
  return `${folder.relativeFolder}/${fileName}`;
};

const normalizeStoredImages = async ({ product, images = [] }) => {
  const folder = getProductFolder(product);
  const stored = [];
  let savedCount = 0;

  for (let index = 0; index < images.length && index < IMAGE_SLOTS.length; index += 1) {
    const raw = cleanText(images[index]);
    if (!raw) continue;
    if (!isDataImageUrl(raw)) {
      stored.push(raw);
      continue;
    }

    const saved = await writeDataImage({ dataUrl: raw, slot: IMAGE_SLOTS[index], folder });
    stored.push(saved);
    savedCount += 1;
  }

  return { stored, savedCount, folder };
};

const hasEmbeddedMedia = (product = {}) => {
  const images = Array.isArray(product.images) ? product.images : [];
  return images.some(isDataImageUrl)
    || [product.thumbnail, product.image, product.boxFront, product.boxBack, product.leftSide, product.rightSide].some(isDataImageUrl);
};

export const persistEmbeddedProductMedia = async (payload = {}, fallback = {}) => {
  const product = { ...fallback, ...payload };
  const rawImages = Array.isArray(payload.images)
    ? payload.images
    : Array.isArray(fallback.images)
      ? fallback.images
      : [];

  if (!hasEmbeddedMedia({ ...product, images: rawImages })) return payload;

  const workingImages = [...rawImages];
  const fieldSlotMap = [
    ["thumbnail", "front", 0],
    ["image", "front", 0],
    ["boxFront", "front", 0],
    ["boxBack", "back", 1],
    ["leftSide", "left", 2],
    ["rightSide", "right", 3],
  ];

  // If an older record stored media only in dedicated fields, fold it into the normal image array first.
  for (const [field, , index] of fieldSlotMap) {
    const value = cleanText(product[field]);
    if (isDataImageUrl(value) && !workingImages[index]) workingImages[index] = value;
  }

  const { stored } = await normalizeStoredImages({ product, images: workingImages });
  const front = stored[0] || cleanText(payload.thumbnail || payload.image || fallback.thumbnail || fallback.image);
  const back = stored[1] || front;
  const left = stored[2] || front;
  const right = stored[3] || front;

  return {
    ...payload,
    images: stored,
    thumbnail: isDataImageUrl(payload.thumbnail) || !cleanText(payload.thumbnail) ? front : payload.thumbnail,
    image: isDataImageUrl(payload.image) || !cleanText(payload.image) ? front : payload.image,
    boxFront: isDataImageUrl(payload.boxFront) || !cleanText(payload.boxFront) ? front : payload.boxFront,
    boxBack: isDataImageUrl(payload.boxBack) || !cleanText(payload.boxBack) ? back : payload.boxBack,
    leftSide: isDataImageUrl(payload.leftSide) || !cleanText(payload.leftSide) ? left : payload.leftSide,
    rightSide: isDataImageUrl(payload.rightSide) || !cleanText(payload.rightSide) ? right : payload.rightSide,
  };
};

const createRepairBackup = async () => {
  const backupDir = path.resolve(DATA_ROOT, "backups");
  await fs.mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `lootifer-pre-media-repair-${stamp}.sqlite`);
  const sqlitePath = backupPath.replace(/'/g, "''");
  await exec(`VACUUM INTO '${sqlitePath}'`);
  return backupPath;
};

export const repairEmbeddedProductMedia = async () => {
  const candidates = await all(`
    SELECT id, slug, category, brand, universe, name, number
    FROM products
    WHERE instr(COALESCE(images_json, ''), 'data:image/') > 0
       OR instr(substr(COALESCE(thumbnail, ''), 1, 32), 'data:image/') > 0
       OR instr(substr(COALESCE(box_front, ''), 1, 32), 'data:image/') > 0
       OR instr(substr(COALESCE(box_back, ''), 1, 32), 'data:image/') > 0
       OR instr(substr(COALESCE(left_side, ''), 1, 32), 'data:image/') > 0
       OR instr(substr(COALESCE(right_side, ''), 1, 32), 'data:image/') > 0
    ORDER BY id ASC
  `);

  if (!candidates.length) {
    return { repairedProducts: 0, savedImages: 0, backupPath: "" };
  }

  const backupPath = await createRepairBackup();
  let repairedProducts = 0;
  let savedImages = 0;

  for (const lightRow of candidates) {
    const row = await get(`
      SELECT id, slug, category, brand, universe, name, number,
             thumbnail, images_json, box_front, box_back, left_side, right_side
      FROM products WHERE id = ?
    `, [lightRow.id]);
    if (!row) continue;

    const originalImages = safeJsonArray(row.images_json);
    const payload = {
      id: row.id,
      slug: row.slug,
      category: row.category,
      brand: row.brand,
      universe: row.universe,
      name: row.name,
      number: row.number,
      images: originalImages,
      thumbnail: row.thumbnail || "",
      image: row.thumbnail || "",
      boxFront: row.box_front || "",
      boxBack: row.box_back || "",
      leftSide: row.left_side || "",
      rightSide: row.right_side || "",
    };

    const embeddedBefore = originalImages.filter(isDataImageUrl).length
      + [row.thumbnail, row.box_front, row.box_back, row.left_side, row.right_side].filter(isDataImageUrl).length;
    if (!embeddedBefore) continue;

    const repaired = await persistEmbeddedProductMedia(payload, {});
    const images = Array.isArray(repaired.images) ? repaired.images.filter(Boolean).slice(0, 4) : [];
    const front = cleanText(repaired.thumbnail || repaired.image || images[0]);
    const back = cleanText(repaired.boxBack || images[1] || front);
    const left = cleanText(repaired.leftSide || images[2] || front);
    const right = cleanText(repaired.rightSide || images[3] || front);

    await run(`
      UPDATE products
      SET images_json = ?, thumbnail = ?, box_front = ?, box_back = ?, left_side = ?, right_side = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [JSON.stringify(images), front, front, back, left, right, row.id]);

    repairedProducts += 1;
    savedImages += originalImages.filter(isDataImageUrl).length;
  }

  return { repairedProducts, savedImages, backupPath };
};
