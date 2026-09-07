"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { compress, dataBytes, MAX_BYTES } = require("../modules/photo-compression");
const dataUrl = bytes => "data:image/jpeg;base64," + Buffer.alloc(bytes).toString("base64");

test("compression preserves aspect ratio and fits the upload byte budget", () => {
  const sizes = [];
  const canvas = {
    getContext: () => ({ fillRect() {}, drawImage() {} }),
    toDataURL(type, quality) {
      sizes.push([this.width, this.height, quality]);
      return dataUrl(this.width > 1100 ? 400000 : 200000);
    }
  };
  const result = compress({ width: 4000, height: 3000 }, () => canvas);
  assert.ok(dataBytes(result) <= MAX_BYTES);
  assert.deepEqual(sizes[0], [1200, 900, 0.72]);
  assert.deepEqual(sizes.at(-1), [1020, 765, 0.72]);
  assert.equal(canvas.width, 1);
  assert.equal(canvas.height, 1);
});

test("small images are not upscaled and encoder failure releases the canvas", () => {
  const canvas = { getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL() {
    assert.equal(this.width, 400); assert.equal(this.height, 300);
    return dataUrl(10000);
  } };
  compress({ width: 400, height: 300 }, () => canvas);
  canvas.toDataURL = () => { throw new Error("encoder failed"); };
  assert.throws(() => compress({ width: 400, height: 300 }, () => canvas), /encoder failed/);
  assert.equal(canvas.width, 1);
  assert.equal(canvas.height, 1);
});

test("a decode failure never uploads the original and releases its object URL", async () => {
  const released = [];
  const code = fs.readFileSync(path.join(__dirname, "../modules/photo-compression.js"), "utf8");
  const context = { module: { exports: {} }, URL: {
    createObjectURL: () => "blob:test-photo",
    revokeObjectURL: value => released.push(value)
  }, Image: class {
    set src(value) { if (value) queueMicrotask(() => this.onerror()); }
  } };
  vm.createContext(context);
  vm.runInContext(code, context);
  await assert.rejects(context.module.exports.read({ type: "application/pdf", size: 1000 }), /файл фотографии/);
  await assert.rejects(context.module.exports.read({ type: "image/jpeg", size: 21 * 1024 * 1024 }), /20 МБ/);
  await assert.rejects(context.module.exports.read({ type: "image/jpeg", size: 1000 }), /не удалось прочитать/);
  assert.deepEqual(released, ["blob:test-photo"]);
  assert.equal(await context.module.exports.read(null), "");
});
