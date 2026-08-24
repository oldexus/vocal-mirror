const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const results = {
  buildMatrix: [],
  jsonSchemas: [],
  headersAndConfigs: [],
  imageIntegrity: [],
  spaFallback: [],
  summary: { total: 0, passed: 0, failed: 0 }
};

function recordTest(category, name, passed, details = "") {
  results.summary.total++;
  if (passed) {
    results.summary.passed++;
    results[category].push({ name, status: "PASS", details });
    console.log(`  [PASS] ${name}`);
  } else {
    results.summary.failed++;
    results[category].push({ name, status: "FAIL", details });
    console.error(`  [FAIL] ${name}: ${details}`);
  }
}

console.log("===============================================================");
console.log("  EMPIRICAL CHALLENGER 1: BUILD MATRIX & HOSTING STRESS AUDIT  ");
console.log("===============================================================\n");

// =========================================================================
// SECTION 1: Image Binary Integrity & PNG IHDR Parsing
// =========================================================================
console.log(">>> Section 1: Image Binary & Dimensional Integrity");

function parsePng(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) return null;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
                buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a;
  if (!isPng) return null;
  const chunkType = buf.toString("ascii", 12, 16);
  if (chunkType !== "IHDR") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25);
  return { width, height, bitDepth, colorType, size: buf.length };
}

const imagesToTest = [
  { file: "icon-192.png", expW: 192, expH: 192 },
  { file: "icon-512.png", expW: 512, expH: 512 },
  { file: "icon-maskable-512.png", expW: 512, expH: 512 },
  { file: "apple-touch-icon.png", expW: 180, expH: 180 },
  { file: "og-image.png", expW: 1200, expH: 630 }
];

for (const img of imagesToTest) {
  const imgPath = path.join(PUBLIC_DIR, img.file);
  const exists = fs.existsSync(imgPath);
  if (!exists) {
    recordTest("imageIntegrity", `Image ${img.file} existence`, false, "File does not exist");
    continue;
  }
  const parsed = parsePng(imgPath);
  if (!parsed) {
    recordTest("imageIntegrity", `PNG Header & Magic Signature: ${img.file}`, false, "Invalid PNG signature");
    continue;
  }
  const dimOk = parsed.width === img.expW && parsed.height === img.expH;
  recordTest("imageIntegrity", `PNG Dimensions & Signature: ${img.file} (${parsed.width}x${parsed.height}, ${parsed.size} bytes)`, dimOk,
    dimOk ? `Size: ${parsed.size}B, Depth: ${parsed.bitDepth}` : `Expected ${img.expW}x${img.expH}, got ${parsed.width}x${parsed.height}`);
}

// Favicon SVG check
const svgPath = path.join(PUBLIC_DIR, "favicon.svg");
if (fs.existsSync(svgPath)) {
  const svg = fs.readFileSync(svgPath, "utf-8");
  const svgOk = svg.includes("<svg") && svg.includes("viewBox") && svg.includes("</svg>");
  recordTest("imageIntegrity", "favicon.svg XML & viewBox validity", svgOk, `Size: ${svg.length}B`);
} else {
  recordTest("imageIntegrity", "favicon.svg existence", false, "File missing");
}

// =========================================================================
// SECTION 2: JSON Schemas, Static Configs & Headers
// =========================================================================
console.log("\n>>> Section 2: JSON Schemas, Security Headers & Static Configs");

// 2.1 manifest.webmanifest
try {
  const manifestPath = path.join(PUBLIC_DIR, "manifest.webmanifest");
  const manifestRaw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestRaw);
  const hasFields = manifest.name && manifest.short_name && manifest.start_url === "./" && manifest.scope === "./" &&
                    manifest.display === "standalone" && manifest.theme_color === "#020617" &&
                    manifest.background_color === "#020617" && Array.isArray(manifest.icons);
  recordTest("jsonSchemas", "manifest.webmanifest JSON validity & required PWA fields", !!hasFields, `Name: ${manifest.name}, Icons: ${manifest.icons ? manifest.icons.length : 0}`);

  // Verify all icon paths exist
  let allIconsFound = true;
  for (const ic of manifest.icons || []) {
    if (!fs.existsSync(path.join(PUBLIC_DIR, ic.src))) {
      allIconsFound = false;
      break;
    }
  }
  recordTest("jsonSchemas", "manifest.webmanifest all referenced icon files exist on disk", allIconsFound);
} catch (e) {
  recordTest("jsonSchemas", "manifest.webmanifest parse", false, e.message);
}

// 2.2 vercel.json
try {
  const vercelPath = path.join(ROOT, "vercel.json");
  const vercelRaw = fs.readFileSync(vercelPath, "utf-8");
  const vercel = JSON.parse(vercelRaw);
  const hasSchema = !!vercel.$schema;
  const hasRewrites = Array.isArray(vercel.rewrites) && vercel.rewrites.some(r => r.source === "/(.*)" && r.destination === "/index.html");
  const hasHeaders = Array.isArray(vercel.headers);
  const globalHeader = hasHeaders ? vercel.headers.find(h => h.source === "/(.*)") : null;
  const assetHeader = hasHeaders ? vercel.headers.find(h => h.source === "/assets/(.*)") : null;

  const hMap = {};
  if (globalHeader) {
    for (const h of globalHeader.headers) hMap[h.key.toLowerCase()] = h.value;
  }

  const secOk = hMap["x-content-type-options"] === "nosniff" &&
                hMap["x-frame-options"] === "DENY" &&
                hMap["cross-origin-opener-policy"] === "same-origin" &&
                hMap["cross-origin-embedder-policy"] === "credentialless" &&
                hMap["cross-origin-resource-policy"] === "same-origin" &&
                hMap["permissions-policy"] && hMap["permissions-policy"].includes("microphone=(self)") &&
                hMap["strict-transport-security"] && hMap["strict-transport-security"].includes("max-age=31536000") &&
                hMap["content-security-policy"] && hMap["content-security-policy"].includes("media-src 'self' blob: data: mediastream:") &&
                hMap["content-security-policy"].includes("wasm-unsafe-eval");

  const cacheOk = assetHeader && assetHeader.headers.some(h => h.key === "Cache-Control" && h.value.includes("immutable"));

  recordTest("jsonSchemas", "vercel.json schema & SPA rewrites (/(.*) -> /index.html)", hasSchema && hasRewrites);
  recordTest("jsonSchemas", "vercel.json security headers (CSP, COOP same-origin, COEP credentialless, HSTS, Permissions-Policy)", !!secOk);
  recordTest("jsonSchemas", "vercel.json asset caching (/assets/(.*) -> immutable)", !!cacheOk);
} catch (e) {
  recordTest("jsonSchemas", "vercel.json parse", false, e.message);
}

// 2.3 public/_headers (Cloudflare Pages)
try {
  const headersPath = path.join(PUBLIC_DIR, "_headers");
  const hContent = fs.readFileSync(headersPath, "utf-8");
  const hasSec = hContent.includes("Cross-Origin-Embedder-Policy: credentialless") &&
                 hContent.includes("Cross-Origin-Opener-Policy: same-origin") &&
                 hContent.includes("Permissions-Policy: microphone=(self)") &&
                 hContent.includes("Strict-Transport-Security: max-age=31536000") &&
                 hContent.includes("Content-Security-Policy:") &&
                 hContent.includes("wasm-unsafe-eval");
  const hasCache = hContent.includes("/assets/*") && hContent.includes("Cache-Control: public, max-age=31536000, immutable");
  recordTest("headersAndConfigs", "public/_headers (Cloudflare Pages) security headers & immutable cache", hasSec && hasCache);
} catch (e) {
  recordTest("headersAndConfigs", "public/_headers", false, e.message);
}

// 2.4 netlify.toml
try {
  const netlifyPath = path.join(ROOT, "netlify.toml");
  const nContent = fs.readFileSync(netlifyPath, "utf-8");
  const nOk = nContent.includes('publish = "dist"') &&
              nContent.includes('from = "/*"') &&
              nContent.includes('to = "/index.html"') &&
              nContent.includes('status = 200') &&
              nContent.includes('Cache-Control = "public, max-age=31536000, immutable"') &&
              nContent.includes('Cross-Origin-Embedder-Policy = "credentialless"');
  recordTest("headersAndConfigs", "netlify.toml SPA redirects & security headers", nOk);
} catch (e) {
  recordTest("headersAndConfigs", "netlify.toml", false, e.message);
}

// 2.5 public/_redirects & public/robots.txt
try {
  const redPath = path.join(PUBLIC_DIR, "_redirects");
  const redOk = fs.readFileSync(redPath, "utf-8").trim() === "/* /index.html 200";
  recordTest("headersAndConfigs", "public/_redirects (Cloudflare Pages fallback: /* /index.html 200)", redOk);

  const robPath = path.join(PUBLIC_DIR, "robots.txt");
  const robOk = fs.readFileSync(robPath, "utf-8").includes("User-agent: *") && fs.readFileSync(robPath, "utf-8").includes("Allow: /");
  recordTest("headersAndConfigs", "public/robots.txt (Crawler permissions)", robOk);
} catch (e) {
  recordTest("headersAndConfigs", "robots & redirects", false, e.message);
}

// =========================================================================
// SECTION 3: SPA 404 Fallback Redirection Algorithm
// =========================================================================
console.log("\n>>> Section 3: SPA 404 Fallback Algorithm Simulation");

function simulateGithubPagesSpaRedirect(incomingUrlStr, pathSegmentsToKeep = 0) {
  const url = new URL(incomingUrlStr);
  const pathname = url.pathname;
  const search = url.search;
  const hash = url.hash;

  const pathSegments = pathname.split("/").slice(0, 1 + pathSegmentsToKeep).join("/");
  const subpath = pathname.slice(1).split("/").slice(pathSegmentsToKeep).join("/").replace(/&/g, "~and~");
  const searchPart = search ? "&" + search.slice(1).replace(/&/g, "~and~") : "";

  const redirectedUrl = url.protocol + "//" + url.host + pathSegments + "/?/" + subpath + searchPart + hash;

  const redirectedObj = new URL(redirectedUrl);
  let decodedPath = "";
  if (redirectedObj.search && redirectedObj.search[1] === "/") {
    const decoded = redirectedObj.search.slice(1).split("&").map((s) => s.replace(/~and~/g, "&")).join("?");
    decodedPath = redirectedObj.pathname.slice(0, -1) + decoded + redirectedObj.hash;
  }
  const restoredUrl = redirectedObj.protocol + "//" + redirectedObj.host + decodedPath;
  return { redirectedUrl, restoredUrl };
}

const testUrls = [
  "https://example.com/studio",
  "https://example.com/presets/cranial-bone?gain=6&mode=direct",
  "https://example.com/analysis/spectrum?freq=1000&q=2.5&enabled=true#realtime",
  "https://example.com/vocal-mirror/studio?param1=foo&param2=bar#section",
  "https://example.com/deep/sub/path/item?a=1&b=2&c=3#target",
  "https://example.com/studio?preset=Voice%20Confrontation&notes=test%201%2B2%3D3#analyzer-top"
];

let spaAllPass = true;
for (const u of testUrls) {
  const res = simulateGithubPagesSpaRedirect(u, 0);
  if (res.restoredUrl !== u) {
    spaAllPass = false;
    recordTest("spaFallback", `SPA 404 roundtrip: ${u}`, false, `Got ${res.restoredUrl}`);
  }
}
if (spaAllPass) {
  recordTest("spaFallback", `SPA 404 URL encoding/decoding roundtrip (${testUrls.length} complex deep-link scenarios)`, true);
}

// =========================================================================
// SECTION 4: Build Matrix Variations & HTML Asset Inspection
// =========================================================================
console.log("\n>>> Section 4: Empirical Build Matrix Verification");

const buildMatrixConfigs = [
  { name: "Default (relative base ./)", env: {}, expectedPrefix: "./", base: "./" },
  { name: "Subpath (/vocal-mirror/)", env: { BASE_PATH: "/vocal-mirror/" }, expectedPrefix: "/vocal-mirror/", base: "/vocal-mirror/" },
  { name: "Root domain (/)", env: { BASE_PATH: "/" }, expectedPrefix: "/", base: "/" },
  { name: "Nested subpath (/apps/audio/vocal-mirror/)", env: { BASE_PATH: "/apps/audio/vocal-mirror/" }, expectedPrefix: "/apps/audio/vocal-mirror/", base: "/apps/audio/vocal-mirror/" }
];

for (const tc of buildMatrixConfigs) {
  console.log(`\n--- Executing Build Matrix Target: ${tc.name} ---`);
  const distDir = path.join(ROOT, "dist");
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  try {
    const envObj = { ...process.env, ...tc.env };
    // Run vite build directly to test build pipeline
    execSync("npx vite build", { env: envObj, cwd: ROOT, stdio: "pipe" });

    // Check dist existence
    const indexPath = path.join(distDir, "index.html");
    const indexExists = fs.existsSync(indexPath);
    recordTest("buildMatrix", `[${tc.name}] dist/index.html generated`, indexExists);

    const htmlContent = fs.readFileSync(indexPath, "utf-8");

    // Check chunks
    const assetsDir = path.join(distDir, "assets");
    const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
    const hasVendorReact = assetFiles.some(f => f.startsWith("vendor-react-") && f.endsWith(".js"));
    const hasVendorIcons = assetFiles.some(f => f.startsWith("vendor-icons-") && f.endsWith(".js"));
    const hasIndexJs = assetFiles.some(f => f.startsWith("index-") && f.endsWith(".js"));
    const hasIndexCss = assetFiles.some(f => f.startsWith("index-") && f.endsWith(".css"));

    recordTest("buildMatrix", `[${tc.name}] Rollup chunk splitting (vendor-react, vendor-icons, index.js, index.css)`,
      hasVendorReact && hasVendorIcons && hasIndexJs && hasIndexCss,
      `Found: ${assetFiles.join(", ")}`);

    // Check static files copied to dist
    const copiedFiles = [
      "manifest.webmanifest", "_headers", "_redirects", "404.html", "robots.txt",
      "favicon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png",
      "apple-touch-icon.png", "og-image.png"
    ];
    let allCopied = true;
    for (const cf of copiedFiles) {
      if (!fs.existsSync(path.join(distDir, cf)) || fs.statSync(path.join(distDir, cf)).size === 0) {
        allCopied = false;
        break;
      }
    }
    recordTest("buildMatrix", `[${tc.name}] All 11 static assets copied to dist/ with non-zero byte size`, allCopied);

    // Check HTML asset URLs
    const faviconMatch = htmlContent.match(/<link rel="icon"[^>]*href="([^"]+)"/);
    const appleTouchMatch = htmlContent.match(/<link rel="apple-touch-icon"[^>]*href="([^"]+)"/);
    const manifestMatch = htmlContent.match(/<link rel="manifest"[^>]*href="([^"]+)"/);
    const ogImageMatch = htmlContent.match(/<meta property="og:image" content="([^"]+)"/);
    const twitterImageMatch = htmlContent.match(/<meta name="twitter:image" content="([^"]+)"/);

    const scriptMatches = [...htmlContent.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
    const cssMatches = [...htmlContent.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1]);

    let urlOk = true;
    let urlReason = "";

    if (tc.expectedPrefix === "./") {
      // Relative base
      if (!faviconMatch || !faviconMatch[1].endsWith("favicon.svg")) { urlOk = false; urlReason = "Favicon link"; }
      if (!appleTouchMatch || !appleTouchMatch[1].endsWith("apple-touch-icon.png")) { urlOk = false; urlReason = "Apple touch icon"; }
      if (!manifestMatch || !manifestMatch[1].endsWith("manifest.webmanifest")) { urlOk = false; urlReason = "Manifest link"; }
      if (!ogImageMatch || !ogImageMatch[1].endsWith("og-image.png")) { urlOk = false; urlReason = "OG Image"; }
      if (!twitterImageMatch || !twitterImageMatch[1].endsWith("og-image.png")) { urlOk = false; urlReason = "Twitter Image"; }
      for (const s of scriptMatches) {
        if (!s.startsWith("./assets/") && !s.startsWith("assets/")) { urlOk = false; urlReason = `Script: ${s}`; }
      }
      for (const c of cssMatches) {
        if (!c.startsWith("./assets/") && !c.startsWith("assets/")) { urlOk = false; urlReason = `CSS: ${c}`; }
      }
    } else {
      // Absolute prefix
      if (!faviconMatch || !faviconMatch[1].startsWith(tc.expectedPrefix)) { urlOk = false; urlReason = `Favicon: ${faviconMatch ? faviconMatch[1] : "none"}`; }
      if (!appleTouchMatch || !appleTouchMatch[1].startsWith(tc.expectedPrefix)) { urlOk = false; urlReason = "Apple touch"; }
      if (!manifestMatch || !manifestMatch[1].startsWith(tc.expectedPrefix)) { urlOk = false; urlReason = "Manifest"; }
      if (!ogImageMatch || !ogImageMatch[1].startsWith(tc.expectedPrefix)) { urlOk = false; urlReason = "OG image"; }
      if (!twitterImageMatch || !twitterImageMatch[1].startsWith(tc.expectedPrefix)) { urlOk = false; urlReason = "Twitter image"; }
      for (const s of scriptMatches) {
        if (!s.startsWith(tc.expectedPrefix)) { urlOk = false; urlReason = `Script: ${s}`; }
      }
      for (const c of cssMatches) {
        if (!c.startsWith(tc.expectedPrefix)) { urlOk = false; urlReason = `CSS: ${c}`; }
      }
    }

    recordTest("buildMatrix", `[${tc.name}] HTML %BASE_URL% resolution & asset URL prefixing (${tc.expectedPrefix})`, urlOk, urlReason);

  } catch (e) {
    recordTest("buildMatrix", `[${tc.name}] Execution`, false, e.message);
  }
}

// Rebuild default for local distribution
console.log("\n--- Rebuilding default production distribution ---");
execSync("npx vite build", { cwd: ROOT, stdio: "pipe" });

// Output Summary
console.log("\n===============================================================");
console.log(`  SUMMARY: ${results.summary.passed} / ${results.summary.total} PASSED (${results.summary.failed} FAILED)`);
console.log("===============================================================\n");

fs.writeFileSync(path.join(ROOT, ".agents/challenger_1/raw_matrix_results.json"), JSON.stringify(results, null, 2), "utf-8");

if (results.summary.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
