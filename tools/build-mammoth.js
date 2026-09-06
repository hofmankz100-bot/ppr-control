"use strict";

const path = require("node:path");
const esbuild = require("esbuild");

async function buildMammoth({ outfile } = {}) {
  const mammothRoot = path.dirname(require.resolve("mammoth/package.json"));
  const xmldomPackage = require.resolve("@xmldom/xmldom/package.json", { paths: [mammothRoot] });
  const xmldomVersion = require(xmldomPackage).version;
  const supportedVersion = /^0\.8\.(\d+)$/.exec(xmldomVersion);
  if (!supportedVersion || Number(supportedVersion[1]) < 15) {
    throw new Error(`Mammoth browser build requires patched xmldom 0.8.15 or later in 0.8.x; installed ${xmldomVersion}. Run npm ci.`);
  }

  // The prebuilt file shipped by Mammoth contains its own old xmldom copy.
  // Rebuild from source so the browser receives the dependency in our lockfile.
  return esbuild.build({
    stdin: {
      // JSZip needs the same browser scheduling polyfill used by its upstream bundle.
      contents: 'require("setimmediate"); module.exports = require("mammoth");',
      resolveDir: mammothRoot,
      sourcefile: "ppr-mammoth-browser-entry.js"
    },
    outfile: outfile || path.join(mammothRoot, "mammoth.browser.min.js"),
    bundle: true,
    platform: "browser",
    format: "iife",
    globalName: "mammoth",
    target: ["es2018"],
    minify: true,
    charset: "utf8",
    metafile: true,
    banner: { js: `/*! PPR Control: Mammoth browser build with @xmldom/xmldom ${xmldomVersion}. */` }
  });
}

if (require.main === module) {
  buildMammoth().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildMammoth };
