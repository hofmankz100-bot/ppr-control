"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const JSZip = require("jszip");
const { buildMammoth } = require("../tools/build-mammoth");

test("rebuilt Mammoth browser bundle uses patched xmldom and extracts DOCX text without Node globals", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ppr-mammoth-build-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const outfile = path.join(directory, "mammoth.browser.min.js");
  const result = await buildMammoth({ outfile });
  const inputs = Object.keys(result.metafile.inputs).map(input => input.replaceAll("\\", "/"));
  assert.ok(inputs.some(input => input.endsWith("node_modules/@xmldom/xmldom/lib/dom.js")));
  assert.ok(inputs.some(input => input.endsWith("node_modules/mammoth/browser/unzip.js")));
  assert.ok(!inputs.some(input => input.endsWith("mammoth.browser.js") || input.endsWith("mammoth.browser.min.js")));
  const { DOMImplementation } = require("@xmldom/xmldom");
  const document = new DOMImplementation().createDocument(null, "root", null);
  assert.throws(() => document.createEntityReference("safe; <injected/> &x"), /invalid|character/i);

  const bundle = await fs.readFile(outfile, "utf8");
  assert.match(bundle, /requireWellFormed/);
  const context = vm.createContext({ setTimeout, clearTimeout, ArrayBuffer, Uint8Array, TextDecoder, TextEncoder });
  context.self = context;
  vm.runInContext(bundle, context, { timeout: 5000 });
  assert.equal(typeof context.mammoth.extractRawText, "function");
  assert.equal(vm.runInContext("typeof require + ':' + typeof process + ':' + typeof Buffer", context), "undefined:undefined:undefined");

  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Проверка ППР &amp; Word</w:t></w:r></w:p><w:p><w:r><w:t>&lt;Текст инструкции&gt;</w:t></w:r></w:p></w:body></w:document>');
  const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const extracted = await context.mammoth.extractRawText({ arrayBuffer });
  assert.equal(extracted.value, "Проверка ППР & Word\n\n<Текст инструкции>\n\n");

  // A clean rebuild must reproduce the served file byte for byte.
  await buildMammoth({ outfile });
  assert.equal(await fs.readFile(outfile, "utf8"), bundle);
});
