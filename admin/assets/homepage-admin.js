import { createAdminSidebar, createAdminTopbar } from "../components/layout.js";
import { requireAdminSession, wireAdminTopbar } from "./admin-auth.js";

const API_BASE = "https://api.2ndlifetoys.nl/api";
const displayManager = document.getElementById("displayManager");
const highlightManager = document.getElementById("highlightManager");
const displayStatus = document.getElementById("displayStatus");
const highlightStatus = document.getElementById("highlightStatus");
const displayButton = document.getElementById("saveDisplayButton");
const highlightsButton = document.getElementById("saveHighlightsButton");

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
const normalizeCrop = (value = {}) => ({
  x: Number.isFinite(Number(value?.x)) ? clamp(value.x, 0, 100) : 50,
  y: Number.isFinite(Number(value?.y)) ? clamp(value.y, 0, 100) : 50,
  zoom: Number.isFinite(Number(value?.zoom)) ? clamp(value.zoom, 1, 3) : 1,
});

let settings = {
  display: Array.from({ length: 3 }, () => ({ image: "" })),
  highlights: Array.from({ length: 6 }, () => ({
    productId: null,
    image: "",
    crop: normalizeCrop(),
  })),
};
let products = [];
let busyUploads = 0;

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const text = await response.text();
  let body = {};

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Je admin-sessie is verlopen. Log opnieuw in.");
    }
    if (response.status === 413) {
      throw new Error("De foto is te groot. Kies een kleinere JPG/PNG/WebP-foto.");
    }
    throw new Error(body?.error || body?.details || `API ${response.status}`);
  }

  return body;
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error || new Error("Foto kon niet worden gelezen."));
    reader.readAsDataURL(file);
  });

const uploadHomepageImage = async (file, section, slot) => {
  if (!file) return "";

  const allowed =
    /\.(jpe?g|png|webp)$/i.test(file.name) ||
    ["image/jpeg", "image/png", "image/webp"].includes(
      String(file.type || "").toLowerCase()
    );

  if (!allowed) {
    throw new Error("Alleen JPG, PNG en WebP zijn toegestaan.");
  }

  const dataUrl = await fileToDataUrl(file);
  const result = await request("/site/homepage-media", {
    method: "POST",
    body: JSON.stringify({ section, slot, dataUrl, name: file.name }),
  });

  return result.image || "";
};

const saveSettings = async () => {
  settings = await request("/site/homepage", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
  return settings;
};

const productOptions = (selected) =>
  [
    '<option value="">Geen product / leeg vak</option>',
    ...products
      .filter((product) => !product.archived)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map(
        (product) =>
          `<option value="${product.id}" ${
            Number(selected) === Number(product.id) ? "selected" : ""
          }>${product.name}${product.number ? ` ${product.number}` : ""}</option>`
      ),
  ].join("");

const toPreviewSrc = (value = "") => {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean) || clean.startsWith("../")) return clean;
  return `../${clean}`;
};

const setBusy = (busy) => {
  busyUploads += busy ? 1 : -1;
  busyUploads = Math.max(0, busyUploads);

  if (displayButton) displayButton.disabled = busyUploads > 0;
  if (highlightsButton) highlightsButton.disabled = busyUploads > 0;
};

const setHighlightStatus = (message) => {
  if (highlightStatus) highlightStatus.textContent = message;
};

const uploadDisplayFile = async (input) => {
  const index = Number(input.dataset.displayFile);
  const file = input.files?.[0];

  if (!file) return;

  setBusy(true);
  if (displayStatus) displayStatus.textContent = `Foto ${index + 1} uploaden…`;

  try {
    settings.display[index] = {
      image: await uploadHomepageImage(file, "display", index + 1),
    };
    await saveSettings();
    if (displayStatus) {
      displayStatus.textContent = `Displayfoto ${index + 1} geüpload en opgeslagen.`;
    }
    render();
  } catch (error) {
    if (displayStatus) {
      displayStatus.textContent = error.message || "Upload mislukt.";
    }
  } finally {
    setBusy(false);
  }
};

const uploadHighlightFile = async (input) => {
  const index = Number(input.dataset.highlightFile);
  const file = input.files?.[0];

  if (!file) return;

  setBusy(true);
  setHighlightStatus(`Vitrinefoto ${index + 1} uploaden…`);

  try {
    const productId =
      Number(
        document.querySelector(`[data-highlight-product="${index}"]`)?.value
      ) ||
      settings.highlights[index]?.productId ||
      null;

    const image = await uploadHomepageImage(file, "highlight", index + 1);

    settings.highlights[index] = {
      ...settings.highlights[index],
      productId,
      image,
      crop: normalizeCrop(),
    };

    await saveSettings();
    setHighlightStatus(`Vitrinefoto ${index + 1} geüpload en opgeslagen.`);
    render();
  } catch (error) {
    setHighlightStatus(error.message || "Upload mislukt.");
  } finally {
    setBusy(false);
  }
};

const updateCropPreview = (index) => {
  const crop = normalizeCrop(settings.highlights[index]?.crop);
  const image = document.querySelector(`[data-crop-image="${index}"]`);
  const zoomValue = document.querySelector(`[data-crop-zoom-value="${index}"]`);

  if (image) {
    image.style.objectPosition = `${crop.x}% ${crop.y}%`;
    image.style.transformOrigin = `${crop.x}% ${crop.y}%`;
    image.style.transform = `scale(${crop.zoom})`;
  }

  if (zoomValue) {
    zoomValue.textContent = `${Math.round(crop.zoom * 100)}%`;
  }
};

const saveCrop = async (index, message = "Kader opgeslagen.") => {
  settings.highlights[index] = {
    ...settings.highlights[index],
    crop: normalizeCrop(settings.highlights[index]?.crop),
  };

  try {
    await saveSettings();
    setHighlightStatus(message);
  } catch (error) {
    setHighlightStatus(error.message || "Kader opslaan mislukt.");
  }
};

const bindCropControls = () => {
  document.querySelectorAll("[data-crop-frame]").forEach((frame) => {
    const index = Number(frame.dataset.cropFrame);

    frame.addEventListener("pointerdown", (event) => {
      if (!frame.querySelector(`[data-crop-image="${index}"]`)) return;

      event.preventDefault();
      frame.setPointerCapture?.(event.pointerId);
      frame.style.cursor = "grabbing";

      const rect = frame.getBoundingClientRect();
      const startPointerX = event.clientX;
      const startPointerY = event.clientY;
      const startCrop = normalizeCrop(settings.highlights[index]?.crop);

      const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startPointerX;
        const dy = moveEvent.clientY - startPointerY;

        const nextCrop = {
          ...startCrop,
          x: clamp(startCrop.x - (dx / Math.max(rect.width, 1)) * 100, 0, 100),
          y: clamp(startCrop.y - (dy / Math.max(rect.height, 1)) * 100, 0, 100),
        };

        settings.highlights[index] = {
          ...settings.highlights[index],
          crop: nextCrop,
        };

        updateCropPreview(index);
      };

      const onEnd = async () => {
        frame.removeEventListener("pointermove", onMove);
        frame.removeEventListener("pointerup", onEnd);
        frame.removeEventListener("pointercancel", onEnd);
        frame.style.cursor = "grab";
        await saveCrop(index);
      };

      frame.addEventListener("pointermove", onMove);
      frame.addEventListener("pointerup", onEnd);
      frame.addEventListener("pointercancel", onEnd);
    });
  });

  document.querySelectorAll("[data-crop-zoom]").forEach((slider) => {
    const index = Number(slider.dataset.cropZoom);

    slider.addEventListener("input", () => {
      settings.highlights[index] = {
        ...settings.highlights[index],
        crop: {
          ...normalizeCrop(settings.highlights[index]?.crop),
          zoom: clamp(slider.value, 1, 3),
        },
      };

      updateCropPreview(index);
    });

    slider.addEventListener("change", async () => {
      await saveCrop(index, "Zoom opgeslagen.");
    });
  });

  document.querySelectorAll("[data-crop-reset]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.cropReset);

      settings.highlights[index] = {
        ...settings.highlights[index],
        crop: normalizeCrop(),
      };

      render();
      await saveCrop(index, "Kader teruggezet.");
    });
  });
};

const bindRenderedControls = () => {
  document.querySelectorAll("[data-display-file]").forEach((input) => {
    input.addEventListener("change", () => uploadDisplayFile(input));
  });

  document.querySelectorAll("[data-highlight-file]").forEach((input) => {
    input.addEventListener("change", () => uploadHighlightFile(input));
  });

  document.querySelectorAll("[data-highlight-product]").forEach((select) => {
    select.addEventListener("change", async () => {
      const index = Number(select.dataset.highlightProduct);

      settings.highlights[index] = {
        ...settings.highlights[index],
        productId: Number(select.value) || null,
        image: "",
        crop: normalizeCrop(),
      };

      setHighlightStatus("Productkeuze opslaan…");

      try {
        await saveSettings();
        setHighlightStatus("Productkeuze opgeslagen.");
        render();
      } catch (error) {
        setHighlightStatus(error.message || "Opslaan mislukt.");
      }
    });
  });

  document.querySelectorAll("[data-clear-display]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.clearDisplay);
      settings.display[index] = { image: "" };

      try {
        await saveSettings();
      } catch (error) {
        if (displayStatus) displayStatus.textContent = error.message;
      }

      render();
    });
  });

  document
    .querySelectorAll("[data-clear-highlight-image]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const index = Number(button.dataset.clearHighlightImage);

        settings.highlights[index] = {
          ...settings.highlights[index],
          image: "",
          crop: normalizeCrop(),
        };

        try {
          await saveSettings();
          setHighlightStatus("Eigen foto gewist.");
        } catch (error) {
          setHighlightStatus(error.message || "Opslaan mislukt.");
        }

        render();
      });
    });

  bindCropControls();
};

const render = () => {
  if (displayManager) {
    displayManager.innerHTML = Array.from({ length: 3 }, (_, index) => {
      const current = settings.display[index]?.image || "";

      return `
        <article class="admin-home-slot">
          <span class="admin-home-slot-number">0${index + 1}</span>
          <div class="admin-home-preview">
            ${
              current
                ? `<img src="${toPreviewSrc(current)}" alt="Display ${index + 1}">`
                : "<span>Geen foto</span>"
            }
          </div>
          <label class="button primary admin-file-button">
            Kies JPG/PNG/WebP
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              data-display-file="${index}"
              hidden
            >
          </label>
          <button class="button secondary" type="button" data-clear-display="${index}">
            Leegmaken
          </button>
        </article>
      `;
    }).join("");
  }

  if (!highlightManager) return;

  highlightManager.innerHTML = Array.from({ length: 6 }, (_, index) => {
    const current = settings.highlights[index] || {};
    const crop = normalizeCrop(current.crop);
    const product = products.find(
      (item) => Number(item.id) === Number(current.productId)
    );
    const previewImage =
      current.image || product?.image || product?.thumbnail || "";
    const vitrine = index < 3 ? 1 : 2;
    const plaats = (index % 3) + 1;

    return `
      <article class="admin-home-slot">
        <span class="admin-home-slot-number">0${index + 1}</span>

        <p class="admin-detail">
          <strong>Vitrine ${vitrine}</strong> • plek ${plaats}
        </p>

        <div
          class="admin-home-preview"
          data-crop-frame="${index}"
          style="
            position:relative;
            overflow:hidden;
            aspect-ratio:3/4;
            cursor:${previewImage ? "grab" : "default"};
            touch-action:none;
          "
        >
          ${
            previewImage
              ? `<img
                  src="${toPreviewSrc(previewImage)}"
                  alt="Vitrine ${index + 1}"
                  draggable="false"
                  data-crop-image="${index}"
                  style="
                    position:absolute;
                    inset:0;
                    width:100%;
                    height:100%;
                    max-width:none;
                    object-fit:cover;
                    object-position:${crop.x}% ${crop.y}%;
                    transform:scale(${crop.zoom});
                    transform-origin:${crop.x}% ${crop.y}%;
                    user-select:none;
                    pointer-events:none;
                  "
                >`
              : "<span>Geen foto</span>"
          }
        </div>

        ${
          previewImage
            ? `
              <p class="admin-detail">
                Sleep links/rechts en omhoog/omlaag en gebruik Zoom.
              </p>

              <label>
                Zoom
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value="${crop.zoom}"
                  data-crop-zoom="${index}"
                >
                <span data-crop-zoom-value="${index}">
                  ${Math.round(crop.zoom * 100)}%
                </span>
              </label>

              <button
                class="button secondary"
                type="button"
                data-crop-reset="${index}"
              >
                Kader resetten
              </button>
            `
            : ""
        }

        <label>
          Product
          <select data-highlight-product="${index}">
            ${productOptions(current.productId)}
          </select>
        </label>

        <label class="button primary admin-file-button">
          Kies andere foto
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            data-highlight-file="${index}"
            hidden
          >
        </label>

        <button
          class="button secondary"
          type="button"
          data-clear-highlight-image="${index}"
        >
          Eigen foto wissen
        </button>
      </article>
    `;
  }).join("");

  bindRenderedControls();
};

const load = async () => {
  document.getElementById("adminSidebar").innerHTML =
    createAdminSidebar("homepage");

  document.getElementById("adminTopbar").innerHTML =
    createAdminTopbar("Homepage beheren");

  const user = await requireAdminSession();
  if (!user) return;

  wireAdminTopbar(user);

  const [loadedSettings, productPayload] = await Promise.all([
    request("/site/homepage"),
    request("/products"),
  ]);

  settings = {
    ...loadedSettings,
    highlights: Array.from({ length: 6 }, (_, index) => ({
      productId: Number(loadedSettings?.highlights?.[index]?.productId) || null,
      image: String(loadedSettings?.highlights?.[index]?.image || ""),
      crop: normalizeCrop(loadedSettings?.highlights?.[index]?.crop),
    })),
  };

  products = Array.isArray(productPayload.products)
    ? productPayload.products
    : [];

  render();
};

displayButton?.addEventListener("click", async () => {
  displayButton.disabled = true;

  if (displayStatus) {
    displayStatus.textContent = "Display wordt opgeslagen…";
  }

  try {
    await saveSettings();
    if (displayStatus) displayStatus.textContent = "Display opgeslagen.";
    render();
  } catch (error) {
    if (displayStatus) displayStatus.textContent = error.message;
  } finally {
    displayButton.disabled = false;
  }
});

highlightsButton?.addEventListener("click", async () => {
  highlightsButton.disabled = true;
  setHighlightStatus("Vitrines worden opgeslagen…");

  try {
    document
      .querySelectorAll("[data-highlight-product]")
      .forEach((select) => {
        const index = Number(select.dataset.highlightProduct);

        settings.highlights[index] = {
          ...settings.highlights[index],
          productId: Number(select.value) || null,
          crop: normalizeCrop(settings.highlights[index]?.crop),
        };
      });

    await saveSettings();
    setHighlightStatus("Vitrines opgeslagen.");
    render();
  } catch (error) {
    setHighlightStatus(error.message || "Opslaan mislukt.");
  } finally {
    highlightsButton.disabled = false;
  }
});

load().catch((error) => {
  setHighlightStatus(
    error.message || "Homepagebeheer kon niet worden geladen."
  );
});
