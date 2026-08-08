import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "../auth/middleware.js";

const router = Router();
const PROJECT_ROOT = path.resolve(process.cwd());
const HOMEPAGE_FILE = path.resolve(PROJECT_ROOT, "Data", "homepage.json");
const IMAGE_ROOT = path.resolve(PROJECT_ROOT, "Assets", "Images");

const cleanText = (value = "") => String(value || "").trim();
const slugify = (value = "") => cleanText(value)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const defaultHomepage = () => ({
  display: [{ image: "" }, { image: "" }, { image: "" }],
  highlights: Array.from({ length: 6 }, () => ({ productId: null, image: "" })),
});

const readHomepage = async () => {
  try {
    const parsed = JSON.parse(await fs.readFile(HOMEPAGE_FILE, "utf8"));
    return {
      display: Array.from({ length: 3 }, (_, index) => ({ image: cleanText(parsed?.display?.[index]?.image) })),
      highlights: Array.from({ length: 6 }, (_, index) => ({
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

const removeOldSlotFiles = async (folderPath, slot) => {
  const extensions = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG", "WEBP"];
  await Promise.all(extensions.map(async (extension) => {
    try { await fs.unlink(path.join(folderPath, `${slot}.${extension}`)); } catch { /* not present */ }
  }));
};

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
      image: cleanText(request.body?.display?.[index]?.image ?? current.display[index]?.image),
    }));
    const highlights = Array.from({ length: 6 }, (_, index) => ({
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
    const max = section === "display" ? 3 : 6;
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
