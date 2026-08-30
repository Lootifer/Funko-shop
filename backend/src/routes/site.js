import { Router } from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { requireAdmin } from "../auth/middleware.js";
import { exec } from "../db/connection.js";

const router = Router();
const PROJECT_ROOT = path.resolve(process.cwd());
const HOMEPAGE_FILE = path.resolve(PROJECT_ROOT, "Data", "homepage.json");
const IMAGE_ROOT = path.resolve(PROJECT_ROOT, "Assets", "Images");
const HOMEPAGE_HIGHLIGHT_SLOTS = 6;

const cleanText = (value = "") => String(value || "").trim();
const slugify = (value = "") => cleanText(value)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const defaultHomepage = () => ({
  display: Array.from({ length: 3 }, () => ({ productId: null, image: "" })),
  highlights: Array.from({ length: HOMEPAGE_HIGHLIGHT_SLOTS }, () => ({ productId: null, image: "" })),
});

const readHomepage = async () => {
  try {
    const parsed = JSON.parse(await fs.readFile(HOMEPAGE_FILE, "utf8"));
    return {
      display: Array.from({ length: 3 }, (_, index) => ({
        productId: Number(parsed?.display?.[index]?.productId) || null,
        image: cleanText(parsed?.display?.[index]?.image),
      })),
      highlights: Array.from({ length: HOMEPAGE_HIGHLIGHT_SLOTS }, (_, index) => ({
        productId: Number(parsed?.highlights?.[index]?.productId) || null,
        image: cleanText(parsed?.highlights?.[index]?.image),
      })),
    };
  } catch {
    return defaultHomepage();
  }
};

const writeHomepage = async (homepage) => {
  await fs.mkdir(path.dirname(HOMEPAGE_FILE), { recursive: true });
  await fs.writeFile(HOMEPAGE_FILE, JSON.stringify(homepage, null, 2), "utf8");
};

const funkoFolder = (category = "", universe = "") => {
  const value = cleanText(category).toLowerCase();
  if (value.includes("funko movies")) return "Movies";
  if (value.includes("funko television")) return "Television";
  if (value.includes("funko animation")) return "Animation";
  if (value.includes("funko games")) return "Games";
  if (value.includes("funko heroes")) return "Heroes";
  if (value.includes("funko pin")) return "Pin";
  if (value.includes("funko bitty pop")) return "Bitty Pop";
  if (value.includes("funko tee")) return "Tee";

  const fallback = cleanText(universe).toLowerCase();
  if (fallback.includes("game")) return "Games";
  if (fallback.includes("television") || fallback.includes("tv")) return "Television";
  if (fallback.includes("animation") || fallback.includes("anime")) return "Animation";
  return "Movies";
};

const categoryRoot = (category = "", brand = "") => {
  const value = `${category} ${brand}`.toLowerCase();
  if (value.includes("funko")) return "funko";
  if (value.includes("lego")) return "lego";
  if (value.includes("pokemon") || value.includes("pokémon")) return "pokemon";
  if (value.includes("star wars")) return "star-wars";
  if (value.includes("harry potter")) return "harry-potter";
  return slugify(category || brand || "products") || "products";
};

const extensionForMime = (mime = "") => {
  const value = String(mime).toLowerCase();
  if (value === "image/png") return "png";
  if (value === "image/webp") return "webp";
  if (value === "image/jpeg" || value === "image/jpg") return "jpg";
  return "";
};

const decodeDataUrl = (dataUrl = "") => {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-z0-9+/=\r\n]+)$/i.exec(String(dataUrl));
  if (!match) throw new Error("Ongeldig afbeeldingsbestand.");
  const extension = extensionForMime(match[1]);
  if (!extension) throw new Error("Alleen JPG, PNG en WebP zijn toegestaan.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw new Error("Afbeelding is te groot of leeg.");
  return { extension, buffer };
};


const ZIP_SIGNATURE_EOCD = 0x06054b50;
const ZIP_SIGNATURE_CENTRAL = 0x02014b50;
const ZIP_MAX_BYTES = 80 * 1024 * 1024;
const ZIP_MAX_ENTRY_BYTES = 15 * 1024 * 1024;
const ZIP_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

const normalizeZipName = (name = "") => String(name || "")
  .replace(/\\/g, "/")
  .replace(/^\/+/, "")
  .replace(/\/+/g, "/");

const findEndOfCentralDirectory = (buffer) => {
  const min = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= min; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_SIGNATURE_EOCD) return offset;
  }
  return -1;
};

const readZipEntries = (buffer) => {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > ZIP_MAX_BYTES) {
    throw new Error("ZIP-bestand is leeg of te groot.");
  }

  const eocd = findEndOfCentralDirectory(buffer);
  if (eocd < 0) throw new Error("Ongeldig ZIP-bestand.");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  let offset = centralOffset;
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== ZIP_SIGNATURE_CENTRAL) {
      throw new Error("ZIP-index kon niet worden gelezen.");
    }

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    const name = normalizeZipName(buffer.subarray(nameStart, nameEnd).toString("utf8"));

    offset = nameEnd + extraLength + commentLength;
    if (!name || name.endsWith("/")) continue;
    if (uncompressedSize > ZIP_MAX_ENTRY_BYTES) throw new Error(`ZIP-bestand bevat een te groot onderdeel: ${name}`);
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`ZIP-onderdeel kon niet worden gelezen: ${name}`);
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) throw new Error(`ZIP-onderdeel is beschadigd: ${name}`);

    const compressed = buffer.subarray(dataStart, dataEnd);
    let data;
    if (method === 0) data = Buffer.from(compressed);
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error(`ZIP-compressiemethode wordt niet ondersteund (${method}): ${name}`);

    if (data.length !== uncompressedSize) throw new Error(`ZIP-onderdeel heeft een onjuiste grootte: ${name}`);
    entries.push({ name, data });
  }

  return entries;
};

const extensionFromZipName = (name = "") => {
  const match = /\.([a-z0-9]+)$/i.exec(String(name));
  const extension = String(match?.[1] || "").toLowerCase();
  return ZIP_IMAGE_EXTENSIONS.has(extension) ? (extension === "jpeg" ? "jpg" : extension) : "";
};

const normalizeEntryLookupKey = (name = "") => normalizeZipName(name).toLowerCase();

const findImageEntry = (entries, names = []) => {
  const wanted = new Set(names.map(normalizeEntryLookupKey));
  return entries.find((entry) => wanted.has(normalizeEntryLookupKey(entry.name))) || null;
};

const candidateNamesForSlot = (slug, slot) => {
  const extensions = ["jpg", "jpeg", "png", "webp"];
  const bases = [
    `photos/${slug}/${slot}`,
    `media/${slug}/${slot}`,
    `${slug}/${slot}`,
    `photos/${slug}-${slot}`,
    `${slug}-${slot}`,
  ];
  return bases.flatMap((base) => extensions.map((extension) => `${base}.${extension}`));
};

const decodeZipDataUrl = (value = "") => {
  const match = /^data:(?:application\/(?:zip|x-zip-compressed)|application\/octet-stream);base64,([a-z0-9+/=\r\n]+)$/i.exec(String(value));
  if (!match) throw new Error("Ongeldig ZIP-importbestand.");
  const buffer = Buffer.from(match[1], "base64");
  if (!buffer.length || buffer.length > ZIP_MAX_BYTES) throw new Error("ZIP-bestand is leeg of te groot.");
  return buffer;
};

const saveBatchProductImages = async ({ product, entries, usedEntryNames, fallbackEntries }) => {
  const slug = slugify(product?.slug || `${product?.name || ""} ${String(product?.number || "").replace(/#/g, " ")}`);
  if (!slug) return { product, savedCount: 0, warning: "Product zonder geldige slug overgeslagen voor foto's." };

  const root = categoryRoot(product?.category, product?.brand);
  const relativeFolder = root === "funko"
    ? path.posix.join("Assets", "Images", "Products", root, funkoFolder(product?.category, product?.universe), slug)
    : path.posix.join("Assets", "Images", "Products", root, slug);
  const absoluteFolder = path.resolve(PROJECT_ROOT, ...relativeFolder.split("/"));
  if (!absoluteFolder.startsWith(IMAGE_ROOT)) throw new Error("Ongeldig afbeeldingspad in batchimport.");
  await fs.mkdir(absoluteFolder, { recursive: true });

  const allowedSlots = ["front", "back", "left", "right"];
  const explicitMedia = product?.batchMedia && typeof product.batchMedia === "object" ? product.batchMedia : {};
  const explicitFiles = Array.isArray(product?.photoFiles) ? product.photoFiles : [];
  const selected = [];

  for (let index = 0; index < allowedSlots.length; index += 1) {
    const slot = allowedSlots[index];
    const explicitName = cleanText(explicitMedia?.[slot] || explicitFiles[index] || "");
    let entry = explicitName ? findImageEntry(entries, [explicitName]) : null;
    if (!entry) entry = findImageEntry(entries, candidateNamesForSlot(slug, slot));
    if (entry && !usedEntryNames.has(normalizeEntryLookupKey(entry.name))) {
      selected.push({ slot, entry });
      usedEntryNames.add(normalizeEntryLookupKey(entry.name));
    }
  }

  // If the ZIP only contains the photos in upload order, pair them automatically:
  // product 1 = photo 1+2, product 2 = photo 3+4, etc.
  if (!selected.length && fallbackEntries.length) {
    const takeNextUnused = () => {
      while (fallbackEntries.length) {
        const candidate = fallbackEntries.shift();
        if (!usedEntryNames.has(normalizeEntryLookupKey(candidate?.name))) return candidate;
      }
      return null;
    };
    const first = takeNextUnused();
    if (first) selected.push({ slot: "front", entry: first });
    const second = takeNextUnused();
    if (second) selected.push({ slot: "back", entry: second });
    selected.forEach(({ entry }) => usedEntryNames.add(normalizeEntryLookupKey(entry.name)));
  }

  const savedPaths = [];
  for (const { slot, entry } of selected) {
    const extension = extensionFromZipName(entry.name);
    if (!extension) continue;
    await removeOldSlotFiles(absoluteFolder, slot);
    const fileName = `${slot}.${extension}`;
    await fs.writeFile(path.join(absoluteFolder, fileName), entry.data);
    savedPaths.push(`${relativeFolder}/${fileName}`);
  }

  if (!savedPaths.length) return { product: { ...product, slug }, savedCount: 0, warning: `${product?.name || slug}: geen foto's gevonden in ZIP.` };

  const bySlot = Object.fromEntries(savedPaths.map((savedPath) => {
    const match = /\/(front|back|left|right)\.[a-z0-9]+$/i.exec(savedPath);
    return [String(match?.[1] || "").toLowerCase(), savedPath];
  }));
  const images = allowedSlots.map((slot) => bySlot[slot]).filter(Boolean);
  const front = bySlot.front || images[0] || "";
  const back = bySlot.back || front;

  return {
    product: {
      ...product,
      slug,
      images,
      thumbnail: front,
      image: front,
      boxFront: front,
      boxBack: back,
      leftSide: bySlot.left || front,
      rightSide: bySlot.right || front,
    },
    savedCount: images.length,
    warning: "",
  };
};

const removeOldSlotFiles = async (folderPath, slot) => {
  const extensions = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG", "WEBP"];
  await Promise.all(extensions.map(async (extension) => {
    try { await fs.unlink(path.join(folderPath, `${slot}.${extension}`)); } catch { /* not present */ }
  }));
};

router.get("/backup", requireAdmin, async (request, response, next) => {
  let backupPath = "";
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `lootifer-backup-${stamp}.sqlite`;
    backupPath = path.join(os.tmpdir(), `${process.pid}-${fileName}`);
    const sqlitePath = backupPath.replace(/'/g, "''");

    // VACUUM INTO creates a consistent standalone SQLite snapshot while the shop is running.
    await exec(`VACUUM INTO '${sqlitePath}'`);

    response.download(backupPath, fileName, async (error) => {
      try { await fs.unlink(backupPath); } catch { /* already removed */ }
      if (error && !response.headersSent) next(error);
    });
  } catch (error) {
    if (backupPath) {
      try { await fs.unlink(backupPath); } catch { /* no partial file */ }
    }
    next(error);
  }
});

router.get("/homepage", async (request, response, next) => {
  try {
    response.json(await readHomepage());
  } catch (error) {
    next(error);
  }
});

router.put("/homepage", requireAdmin, async (request, response, next) => {
  try {
    const current = await readHomepage();
    const display = Array.from({ length: 3 }, (_, index) => ({
      productId: Number(request.body?.display?.[index]?.productId ?? current.display[index]?.productId) || null,
      image: cleanText(request.body?.display?.[index]?.image ?? current.display[index]?.image),
    }));
    const highlights = Array.from({ length: HOMEPAGE_HIGHLIGHT_SLOTS }, (_, index) => ({
      productId: Number(request.body?.highlights?.[index]?.productId) || null,
      image: cleanText(request.body?.highlights?.[index]?.image ?? current.highlights[index]?.image),
    }));
    const homepage = { display, highlights };
    await writeHomepage(homepage);
    response.json(homepage);
  } catch (error) {
    next(error);
  }
});


router.post("/product-batch-import", requireAdmin, async (request, response, next) => {
  try {
    const buffer = decodeZipDataUrl(request.body?.dataUrl);
    const entries = readZipEntries(buffer);
    const jsonEntry = entries.find((entry) => /(^|\/)products\.json$/i.test(entry.name))
      || entries.find((entry) => /\.json$/i.test(entry.name));
    if (!jsonEntry) return response.status(400).json({ error: "ZIP bevat geen products.json." });

    const parsed = JSON.parse(jsonEntry.data.toString("utf8"));
    if (!Array.isArray(parsed) || !parsed.length) {
      return response.status(400).json({ error: "products.json moet een niet-lege array met producten bevatten." });
    }
    if (parsed.length > 50) return response.status(400).json({ error: "Maximaal 50 producten per ZIP-import." });

    const imageEntries = entries.filter((entry) => extensionFromZipName(entry.name));
    const usedEntryNames = new Set();
    const fallbackEntries = imageEntries.slice();
    const products = [];
    const warnings = [];
    let importedPhotos = 0;

    for (const product of parsed) {
      const result = await saveBatchProductImages({ product, entries: imageEntries, usedEntryNames, fallbackEntries });
      products.push(result.product);
      importedPhotos += result.savedCount;
      if (result.warning) warnings.push(result.warning);
    }

    response.json({
      products,
      importedPhotos,
      warnings,
      format: "lootifer-product-batch-v1",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/product-media", requireAdmin, async (request, response, next) => {
  try {
    const slug = slugify(request.body?.slug);
    const category = cleanText(request.body?.category);
    const brand = cleanText(request.body?.brand);
    const universe = cleanText(request.body?.universe);
    const files = Array.isArray(request.body?.files) ? request.body.files.slice(0, 4) : [];
    if (!slug) return response.status(400).json({ error: "Vul eerst naam/slug van het product in." });
    if (!files.length) return response.status(400).json({ error: "Geen foto's ontvangen." });

    const root = categoryRoot(category, brand);
    const relativeFolder = root === "funko"
      ? path.posix.join("Assets", "Images", "Products", root, funkoFolder(category, universe), slug)
      : path.posix.join("Assets", "Images", "Products", root, slug);
    const absoluteFolder = path.resolve(PROJECT_ROOT, ...relativeFolder.split("/"));
    if (!absoluteFolder.startsWith(IMAGE_ROOT)) throw new Error("Ongeldig afbeeldingspad.");
    await fs.mkdir(absoluteFolder, { recursive: true });

    const allowedSlots = ["front", "back", "left", "right"];
    const saved = [];
    for (let index = 0; index < files.length; index += 1) {
      const item = files[index] || {};
      const requestedSlot = slugify(item.slot || "");
      const slot = allowedSlots.includes(requestedSlot) ? requestedSlot : allowedSlots[index];
      if (!slot) continue;
      const { extension, buffer } = decodeDataUrl(item.dataUrl);
      await removeOldSlotFiles(absoluteFolder, slot);
      const fileName = `${slot}.${extension}`;
      await fs.writeFile(path.join(absoluteFolder, fileName), buffer);
      saved.push(`${relativeFolder}/${fileName}`);
    }

    response.json({ folder: relativeFolder, images: saved });
  } catch (error) {
    next(error);
  }
});

router.post("/homepage-media", requireAdmin, async (request, response, next) => {
  try {
    const section = request.body?.section === "highlight" ? "highlight" : "display";
    const max = section === "display" ? 3 : HOMEPAGE_HIGHLIGHT_SLOTS;
    const slot = Math.max(1, Math.min(max, Number(request.body?.slot) || 1));
    const { extension, buffer } = decodeDataUrl(request.body?.dataUrl);
    const folder = path.resolve(IMAGE_ROOT, "Home", "Admin");
    await fs.mkdir(folder, { recursive: true });
    await removeOldSlotFiles(folder, `${section}-${slot}`);
    const fileName = `${section}-${slot}.${extension}`;
    await fs.writeFile(path.join(folder, fileName), buffer);
    response.json({ image: `Assets/Images/Home/Admin/${fileName}` });
  } catch (error) {
    next(error);
  }
});

export default router;
