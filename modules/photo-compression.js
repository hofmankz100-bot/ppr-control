(function (root) {
  "use strict";
  const MAX_BYTES = 250 * 1024;
  const MAX_SIDE = 1200;
  let queue = Promise.resolve();

  function dataBytes(dataUrl) {
    const base64 = String(dataUrl).split(",")[1] || "";
    return Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  }

  function compress(image, createCanvas = () => document.createElement("canvas")) {
    const canvas = createCanvas();
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!(width > 0 && height > 0)) throw new Error("Не удалось прочитать размеры фотографии.");
    let scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    try {
      for (let step = 0; step < 7; step += 1) {
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Не удалось обработать фотографию.");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.72, 0.62, 0.54]) {
          const data = canvas.toDataURL("image/jpeg", quality);
          if (/^data:image\/jpeg;base64,/.test(data) && dataBytes(data) <= MAX_BYTES) return data;
        }
        scale *= 0.85;
      }
      throw new Error("Не удалось уменьшить фотографию. Попробуйте другой снимок.");
    } finally { canvas.width = canvas.height = 1; }
  }

  async function readNow(file) {
    if (!file) return "";
    if (!/^image\//i.test(file.type || "")) throw new Error("Выберите файл фотографии.");
    if (file.size > 20 * 1024 * 1024) throw new Error("Максимальный исходный размер фотографии — 20 МБ.");
    const url = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Этот формат фото не удалось прочитать. Выберите JPEG или сделайте новый снимок камерой."));
        image.src = url;
      });
      return compress(image);
    } finally {
      image.onload = image.onerror = null;
      image.src = "";
      URL.revokeObjectURL(url);
    }
  }

  function read(file) {
    const next = queue.then(() => readNow(file));
    queue = next.catch(() => {});
    return next;
  }

  const api = { read, compress, dataBytes, MAX_BYTES, MAX_SIDE };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PprPhotoCompression = api;
})(typeof window !== "undefined" ? window : globalThis);
