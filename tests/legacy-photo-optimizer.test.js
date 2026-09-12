"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const {
  optimizeLegacyPhoto, MAX_INPUT_BYTES, MAX_OUTPUT_BYTES, MAX_SIDE
} = require("../server/legacy-photo-optimizer");

function noise(width, height, channels = 3) {
  const bytes = Buffer.alloc(width * height * channels);
  let value = 0x12345678;
  for (let index = 0; index < bytes.length; index += 1) {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    bytes[index] = value & 255;
  }
  return bytes;
}

test("legacy JPEG optimization auto-orients, bounds dimensions, and never changes the input", async () => {
  const pixels = noise(1800, 1200);
  for (let index = 0; index < pixels.length; index += 1) pixels[index] = 96 + (pixels[index] & 63);
  const input = await sharp(pixels, { raw: { width: 1800, height: 1200, channels: 3 } })
    .withMetadata({ orientation: 6 }).jpeg({ quality: 100, chromaSubsampling: "4:4:4" }).toBuffer();
  const original = Buffer.from(input);
  const result = await optimizeLegacyPhoto(input, { mimeType: "image/jpeg", fileName: "legacy.jpg" });
  assert.equal(result.changed, true, result.reason);
  assert.equal(result.mimeType, "image/jpeg");
  assert.equal(result.width, 800);
  assert.equal(result.height, MAX_SIDE);
  assert.ok(result.bytes.length <= MAX_OUTPUT_BYTES);
  assert.ok(result.savedBytes >= 8192 && result.savedBytes >= input.length * 0.1);
  assert.deepEqual(input, original);
  const metadata = await sharp(result.bytes).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.ok(!metadata.orientation || metadata.orientation === 1);
  assert.deepEqual(await optimizeLegacyPhoto(result.bytes), { changed: false, reason: "already_small" });
});

test("legacy photographs below the side limit are never enlarged", async () => {
  const input = await sharp(noise(600, 600), { raw: { width: 600, height: 600, channels: 3 } })
    .jpeg({ quality: 100, chromaSubsampling: "4:4:4" }).toBuffer();
  assert.ok(input.length > MAX_OUTPUT_BYTES);
  const result = await optimizeLegacyPhoto(input);
  assert.equal(result.changed, true, result.reason);
  assert.equal(result.width, 600);
  assert.equal(result.height, 600);
});

test("legacy WebP retains its format and alpha channel", async () => {
  const pixels = noise(1000, 700, 4);
  for (let index = 0; index < pixels.length; index += 1) pixels[index] = index % 4 === 3 ? 150 : 96 + (pixels[index] & 63);
  const input = await sharp(pixels, { raw: { width: 1000, height: 700, channels: 4 } }).webp({ lossless: true }).toBuffer();
  const result = await optimizeLegacyPhoto(input, { mimeType: "image/webp", fileName: "legacy.webp" });
  assert.equal(result.changed, true, result.reason);
  const metadata = await sharp(result.bytes).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.hasAlpha, true);
  assert.equal(metadata.width, 1000);
  assert.equal(metadata.height, 700);
  assert.ok(result.bytes.length <= MAX_OUTPUT_BYTES);
});

test("PNG diagrams keep exact decoded pixels, alpha, and dimensions even above 1200px", async () => {
  const width = 1400, height = 220;
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = (index % 40) ? 240 : 15;
    pixels[index + 1] = 120;
    pixels[index + 2] = 35;
    pixels[index + 3] = (index % 12) ? 255 : 80;
  }
  const input = await sharp(pixels, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 0 }).toBuffer();
  const original = Buffer.from(input);
  const result = await optimizeLegacyPhoto(input, { mimeType: "image/png", fileName: "diagram.png" });
  assert.equal(result.changed, true, result.reason);
  assert.equal(result.format, "png");
  assert.equal(result.width, width);
  assert.equal(result.height, height);
  assert.deepEqual(await sharp(result.bytes).raw().toBuffer(), await sharp(input).raw().toBuffer());
  assert.deepEqual(input, original);
});

test("already compressed lossless PNG is skipped when savings are too small", async () => {
  const input = await sharp(noise(500, 500, 4), { raw: { width: 500, height: 500, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  assert.ok(input.length > MAX_OUTPUT_BYTES);
  assert.deepEqual(await optimizeLegacyPhoto(input), { changed: false, reason: "insufficient_savings" });
});

test("small, oversized, unknown, PDF and malformed inputs cannot yield replacement bytes", async () => {
  const pdf = Buffer.alloc(MAX_OUTPUT_BYTES + 1); pdf.write("%PDF-1.7");
  const malformed = Buffer.alloc(MAX_OUTPUT_BYTES + 1); malformed.set([0xff, 0xd8, 0xff]);
  for (const [input, reason] of [
    [null, "invalid_input"], [Buffer.alloc(0), "invalid_input"],
    [Buffer.alloc(MAX_OUTPUT_BYTES), "already_small"],
    [Buffer.alloc(MAX_INPUT_BYTES + 1), "input_too_large"],
    [pdf, "unsupported_format"], [malformed, "decode_or_encode_failed"]
  ]) assert.deepEqual(await optimizeLegacyPhoto(input), { changed: false, reason });
});

test("APNG and animated WebP containers are skipped before first-frame decoding", async () => {
  const png = Buffer.alloc(MAX_OUTPUT_BYTES + 1);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  png.writeUInt32BE(8, 8); png.write("acTL", 12);
  const webp = Buffer.alloc(MAX_OUTPUT_BYTES + 1);
  webp.write("RIFF", 0); webp.writeUInt32LE(webp.length - 8, 4); webp.write("WEBP", 8);
  webp.write("VP8X", 12); webp.writeUInt32LE(10, 16); webp[20] = 2;
  for (const input of [png, webp]) {
    const result = await optimizeLegacyPhoto(input);
    assert.deepEqual(result, { changed: false, reason: "animated_image" });
  }
});

test("format and extension mismatches are skipped to preserve existing URL content types", async () => {
  const input = Buffer.alloc(MAX_OUTPUT_BYTES + 1); input.set([0xff, 0xd8, 0xff]);
  assert.deepEqual(await optimizeLegacyPhoto(input, { mimeType: "application/pdf" }), { changed: false, reason: "mime_mismatch" });
  assert.deepEqual(await optimizeLegacyPhoto(input, { fileName: "legacy.png" }), { changed: false, reason: "extension_mismatch" });
});

test("images exceeding the decoded pixel limit are skipped", async () => {
  const input = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: "white" } })
    .jpeg({ quality: 100 }).toBuffer();
  // A valid large image may compress below the byte threshold, which itself
  // makes it safe to skip. Padding exercises the decoder pixel limit as well.
  const padded = Buffer.concat([input, Buffer.alloc(MAX_OUTPUT_BYTES + 1)]);
  assert.deepEqual(await optimizeLegacyPhoto(padded), { changed: false, reason: "pixel_limit" });
});
