const API_BASE = "http://localhost:3001/api";
const folderInput = document.getElementById("productPhotoFolderInput");
const filesInput = document.getElementById("productPhotoFilesInput");
const folderButton = document.getElementById("chooseProductPhotoFolderButton");
const filesButton = document.getElementById("chooseProductPhotosButton");
const preview = document.getElementById("productPhotoPreview");
const status = document.getElementById("productPhotoUploadStatus");
const fieldImages = document.getElementById("fieldImages");
const fieldSlug = document.getElementById("fieldSlug");
const fieldName = document.getElementById("fieldName");
const fieldNumber = document.getElementById("fieldNumber");
const fieldCategory = document.getElementById("fieldCategory");
const fieldBrand = document.getElementById("fieldBrand");
const fieldUniverse = document.getElementById("fieldUniverse");

const SLOT_ORDER = ["front", "back", "left", "right"];
const IMAGE_EXTENSION = /\.(jpe?g|png|webp)$/i;
let currentPreviewUrls = [];

const slugify = (value = "") => String(value || "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const setStatus = (message, tone = "muted") => {
  if (!status) return;
  status.textContent = message;
  status.dataset.tone = tone;
};

const isImageFile = (file) => {
  const type = String(file?.type || "").toLowerCase();
  return ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(type)
    || IMAGE_EXTENSION.test(String(file?.name || ""));
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(reader.error || new Error("Foto kon niet worden gelezen."));
  reader.readAsDataURL(file);
});


const median = (values = []) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 255;
  return sorted[Math.floor(sorted.length / 2)];
};

const canvasToBlob = (canvas, type = "image/png", quality = 0.94) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Foto kon niet worden voorbereid."));
  }, type, quality);
});

/*
 * V16.3 productfoto-verwerking:
 * - verwijdert alleen bijna-witte achtergrond die met de buitenrand verbonden is;
 * - laat witte/lichtgekleurde delen van de doos zoveel mogelijk intact;
 * - snijdt lege buitenruimte strak weg;
 * - bewaart als transparante PNG zodat er geen witte rechthoek op de donkere site staat.
 */
const prepareProductPhoto = async (file) => {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 2200;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.clearRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    const pixelCount = width * height;

    const cornerSize = Math.max(4, Math.min(16, Math.floor(Math.min(width, height) * 0.01)));
    const rs = [];
    const gs = [];
    const bs = [];
    const sampleCorner = (startX, startY) => {
      for (let y = startY; y < startY + cornerSize; y += 1) {
        for (let x = startX; x < startX + cornerSize; x += 1) {
          const offset = (y * width + x) * 4;
          if (data[offset + 3] < 220) continue;
          rs.push(data[offset]);
          gs.push(data[offset + 1]);
          bs.push(data[offset + 2]);
        }
      }
    };

    sampleCorner(0, 0);
    sampleCorner(width - cornerSize, 0);
    sampleCorner(0, height - cornerSize);
    sampleCorner(width - cornerSize, height - cornerSize);

    const bgR = median(rs);
    const bgG = median(gs);
    const bgB = median(bs);
    const backgroundLooksWhite = Math.min(bgR, bgG, bgB) >= 242;

    const visited = new Uint8Array(pixelCount);
    const queue = new Int32Array(pixelCount);
    let queueStart = 0;
    let queueEnd = 0;

    const isBackgroundPixel = (pixelIndex) => {
      const offset = pixelIndex * 4;
      const alpha = data[offset + 3];
      if (alpha <= 8) return true;
      if (!backgroundLooksWhite) return false;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const maxDiff = Math.max(Math.abs(r - bgR), Math.abs(g - bgG), Math.abs(b - bgB));
      return maxDiff <= 12 && ((r + g + b) / 3) >= 240;
    };

    const enqueue = (pixelIndex) => {
      if (pixelIndex < 0 || pixelIndex >= pixelCount || visited[pixelIndex]) return;
      if (!isBackgroundPixel(pixelIndex)) return;
      visited[pixelIndex] = 1;
      queue[queueEnd] = pixelIndex;
      queueEnd += 1;
    };

    if (backgroundLooksWhite) {
      for (let x = 0; x < width; x += 1) {
        enqueue(x);
        enqueue((height - 1) * width + x);
      }
      for (let y = 0; y < height; y += 1) {
        enqueue(y * width);
        enqueue(y * width + (width - 1));
      }

      while (queueStart < queueEnd) {
        const pixelIndex = queue[queueStart];
        queueStart += 1;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        if (x > 0) enqueue(pixelIndex - 1);
        if (x + 1 < width) enqueue(pixelIndex + 1);
        if (y > 0) enqueue(pixelIndex - width);
        if (y + 1 < height) enqueue(pixelIndex + width);
      }

      for (let index = 0; index < pixelCount; index += 1) {
        if (visited[index]) data[index * 4 + 3] = 0;
      }
    }

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha <= 8) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) return file;

    const pad = Math.max(6, Math.round(Math.min(width, height) * 0.008));
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);

    context.putImageData(imageData, 0, 0);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const output = document.createElement("canvas");
    output.width = cropWidth;
    output.height = cropHeight;
    const outputContext = output.getContext("2d");
    outputContext.clearRect(0, 0, cropWidth, cropHeight);
    outputContext.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    const blob = await canvasToBlob(output, "image/png");
    const baseName = String(file.name || "product").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.png`, { type: "image/png", lastModified: Date.now() });
  } catch {
    return file;
  }
};

const detectSlot = (name = "") => {
  const value = String(name).toLowerCase();
  if (/front|voor|voorzijde/.test(value)) return "front";
  if (/back|achter|achterzijde/.test(value)) return "back";
  if (/left|links/.test(value)) return "left";
  if (/right|rechts/.test(value)) return "right";
  return "";
};

const mapFilesToSlots = (files = []) => {
  const allImages = files.filter(isImageFile);
  const withoutAdminOnly = allImages.filter((file) => !/bottom|under|onder|barcode|ean|upc/i.test(file.name));
  const clean = (withoutAdminOnly.length ? withoutAdminOnly : allImages).slice(0, 4);
  const usedSlots = new Set();
  const mapped = [];

  clean.forEach((file) => {
    const slot = detectSlot(file.name);
    if (slot && !usedSlots.has(slot)) {
      usedSlots.add(slot);
      mapped.push({ file, slot });
    }
  });

  clean.forEach((file) => {
    if (mapped.some((entry) => entry.file === file)) return;
    const slot = SLOT_ORDER.find((candidate) => !usedSlots.has(candidate));
    if (!slot) return;
    usedSlots.add(slot);
    mapped.push({ file, slot });
  });

  return SLOT_ORDER.map((slot) => mapped.find((entry) => entry.slot === slot)).filter(Boolean);
};

const clearPreviewUrls = () => {
  currentPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  currentPreviewUrls = [];
};

const renderPreview = (mapped = [], uploadedSlots = new Set()) => {
  if (!preview) return;
  clearPreviewUrls();
  preview.innerHTML = mapped.map(({ file, slot }) => {
    const objectUrl = URL.createObjectURL(file);
    currentPreviewUrls.push(objectUrl);
    const uploaded = uploadedSlots.has(slot);
    return `
      <article class="admin-upload-preview-card" data-upload-slot="${slot}" data-uploaded="${uploaded ? "true" : "false"}">
        <img src="${objectUrl}" alt="${slot}" />
        <div><strong>${slot.toUpperCase()}</strong><small>${file.name}</small><em>${uploaded ? "Geüpload" : "Geselecteerd"}</em></div>
      </article>`;
  }).join("");
};

const ensureSlug = () => {
  let slug = slugify(fieldSlug?.value || "");
  if (!slug) {
    slug = slugify(`${fieldName?.value || ""} ${String(fieldNumber?.value || "").replace(/#/g, " ")}`);
    if (fieldSlug && slug) {
      fieldSlug.value = slug;
      fieldSlug.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  return slug;
};

const parseApiResponse = async (response) => {
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
  if (!response.ok) {
    if (response.status === 401) throw new Error("Je admin-sessie is verlopen. Log opnieuw in; je ingevulde productgegevens blijven bewaard.");
    if (response.status === 413) throw new Error("De foto is te groot voor één upload. Kies een kleinere JPG/PNG/WebP-foto.");
    throw new Error(body?.error || body?.details || `Upload mislukt (${response.status}).`);
  }
  return body;
};

const uploadOneFile = async ({ file, slot }, slug) => {
  const dataUrl = await fileToDataUrl(file);
  const response = await fetch(`${API_BASE}/site/product-media`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      category: fieldCategory?.value || "",
      brand: fieldBrand?.value || "",
      universe: fieldUniverse?.value || "",
      files: [{ slot, name: file.name, dataUrl }],
    }),
  });
  const body = await parseApiResponse(response);
  return String(body.images?.[0] || "").trim();
};

const uploadMappedFiles = async (mapped = []) => {
  if (!mapped.length) return;
  const slug = ensureSlug();
  if (!slug) {
    renderPreview(mapped);
    setStatus("Foto's geselecteerd. Vul eerst Naam en Nummer in; daarna kun je dezelfde map opnieuw kiezen.", "error");
    return;
  }

  folderButton && (folderButton.disabled = true);
  filesButton && (filesButton.disabled = true);
  const uploadedSlots = new Set();
  const uploadedPaths = [];

  try {
    const preparedMapped = [];
    for (let index = 0; index < mapped.length; index += 1) {
      const entry = mapped[index];
      setStatus(`Foto ${index + 1} van ${mapped.length} automatisch uitsnijden…`, "muted");
      const preparedFile = await prepareProductPhoto(entry.file);
      preparedMapped.push({ ...entry, file: preparedFile });
    }

    renderPreview(preparedMapped, uploadedSlots);

    for (let index = 0; index < preparedMapped.length; index += 1) {
      const entry = preparedMapped[index];
      setStatus(`Foto ${index + 1} van ${preparedMapped.length} uploaden: ${entry.file.name}…`, "muted");
      const savedPath = await uploadOneFile(entry, slug);
      if (savedPath) uploadedPaths.push(savedPath);
      uploadedSlots.add(entry.slot);
      renderPreview(preparedMapped, uploadedSlots);
    }

    if (!uploadedPaths.length) throw new Error("De server heeft geen foto's opgeslagen.");

    if (fieldImages) {
      fieldImages.value = uploadedPaths.join("\n");
      fieldImages.dispatchEvent(new Event("input", { bubbles: true }));
      fieldImages.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setStatus(`${uploadedPaths.length} foto('s) automatisch uitgesneden, geüpload en gekoppeld.`, "success");
  } catch (error) {
    setStatus(error?.message || "Upload mislukt. Je productgegevens zijn niet gewist.", "error");
  } finally {
    if (folderButton) folderButton.disabled = false;
    if (filesButton) filesButton.disabled = false;
  }
};

const handleSelection = (fileList) => {
  const mapped = mapFilesToSlots(Array.from(fileList || []));
  if (!mapped.length) {
    setStatus("Geen geldige JPG/PNG/WebP foto's gevonden.", "error");
    return;
  }
  if (Array.from(fileList || []).filter(isImageFile).length > 4) {
    setStatus("Meer dan 4 foto's gevonden. Alleen de eerste 4 productfoto's worden gebruikt.", "muted");
  }
  uploadMappedFiles(mapped);
};

folderButton?.addEventListener("click", (event) => {
  event.preventDefault();
  folderInput?.click();
});
filesButton?.addEventListener("click", (event) => {
  event.preventDefault();
  filesInput?.click();
});
folderInput?.addEventListener("change", () => handleSelection(folderInput.files));
filesInput?.addEventListener("change", () => handleSelection(filesInput.files));
