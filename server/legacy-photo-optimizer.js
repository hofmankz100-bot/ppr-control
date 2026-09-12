"use strict";

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_INPUT_PIXELS = 24 * 1000 * 1000;
const MAX_OUTPUT_BYTES = 250 * 1024;
const MAX_SIDE = 1200;
const MIN_SAVED_BYTES = 8 * 1024;
const MIN_SAVED_RATIO = 0.1;
const MIME_TYPES = { jpeg: "image/jpeg", webp: "image/webp", png: "image/png" };

function inputFormat(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return "";
}

// Some decoders expose only the first APNG frame. Inspect container chunks too,
// before a normal single-image decode could silently discard animation.
function animatedContainer(bytes, format) {
  let offset = format === "png" ? 8 : 12;
  while (offset + 8 <= bytes.length) {
    const png = format === "png";
    const length = png ? bytes.readUInt32BE(offset) : bytes.readUInt32LE(offset + 4);
    const type = bytes.toString("ascii", offset + (png ? 4 : 0), offset + (png ? 8 : 4));
    if ((png && type === "acTL") || (!png && (type === "ANIM" || type === "ANMF"))) return true;
    if (!png && type === "VP8X" && length >= 1 && offset + 8 < bytes.length && (bytes[offset + 8] & 2)) return true;
    const next = offset + 8 + length + (png ? 4 : length % 2);
    if (next > bytes.length || next <= offset) break;
    offset = next;
  }
  return false;
}

async function optimizeLegacyPhoto(bytes, { mimeType = "", fileName = "" } = {}) {
  const skip = reason => ({ changed: false, reason });
  if (!Buffer.isBuffer(bytes) || !bytes.length) return skip("invalid_input");
  if (bytes.length > MAX_INPUT_BYTES) return skip("input_too_large");
  if (bytes.length <= MAX_OUTPUT_BYTES) return skip("already_small");
  const format = inputFormat(bytes);
  if (!format) return skip("unsupported_format");
  const normalizedMime = String(mimeType).toLowerCase().split(";")[0].trim().replace("image/jpg", "image/jpeg");
  if (normalizedMime && normalizedMime !== MIME_TYPES[format]) return skip("mime_mismatch");
  const extension = String(fileName).split(".").pop().toLowerCase();
  if (fileName && !({ jpeg: ["jpeg", "jpg"], png: ["png"], webp: ["webp"] }[format].includes(extension))) return skip("extension_mismatch");
  if ((format === "png" || format === "webp") && animatedContainer(bytes, format)) return skip("animated_image");

  try {
    const sharp = require("sharp");
    const options = { failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS, sequentialRead: true };
    const metadata = await sharp(bytes, options).metadata();
    if (metadata.format !== format) return skip("format_mismatch");
    if ((metadata.pages || 1) > 1) return skip("animated_image");
    if (!(metadata.width > 0 && metadata.height > 0) || metadata.width * metadata.height > MAX_INPUT_PIXELS) return skip("pixel_limit");
    let result;
    if (format === "png") {
      // Documents and diagrams retain their dimensions, alpha and metadata.
      // Avoid implicitly reducing 16-bit samples or transforming unusual colour
      // spaces; these can be handled by a separate lossless migration if needed.
      if (metadata.depth !== "uchar" || !["srgb", "rgb", "b-w"].includes(metadata.space)) return skip("unsupported_png_depth_or_colour");
      result = await sharp(bytes, options).keepMetadata()
        .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
        .toBuffer({ resolveWithObject: true });
      if (result.info.width !== metadata.width || result.info.height !== metadata.height) return skip("png_dimensions_changed");
    } else {
      for (const quality of [72, 62, 54]) {
        let pipeline = sharp(bytes, options).rotate()
          .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
        pipeline = format === "jpeg"
          ? pipeline.jpeg({ quality })
          : pipeline.webp({ quality, alphaQuality: 100 });
        result = await pipeline.toBuffer({ resolveWithObject: true });
        if (result.data.length <= MAX_OUTPUT_BYTES) break;
        result = null;
      }
      if (!result) return skip("output_too_large");
    }
    const savedBytes = bytes.length - result.data.length;
    if (savedBytes < MIN_SAVED_BYTES || savedBytes / bytes.length < MIN_SAVED_RATIO) return skip("insufficient_savings");
    return {
      changed: true, bytes: result.data, mimeType: MIME_TYPES[format], format,
      originalBytes: bytes.length, optimizedBytes: result.data.length, savedBytes,
      width: result.info.width, height: result.info.height
    };
  } catch (error) {
    // The caller only receives replacement bytes after successful decoding and
    // encoding. An invalid/unsupported image must never replace the original.
    return skip(/pixel limit/i.test(String(error.message || error)) ? "pixel_limit" : "decode_or_encode_failed");
  }
}

module.exports = {
  optimizeLegacyPhoto, MAX_INPUT_BYTES, MAX_OUTPUT_BYTES, MAX_SIDE
};
