// Baut aus index.html (Claude-Artifact-Quelle) die eigenständige Web-App in docs/
// für GitHub Pages: vollständiges HTML-Dokument, Manifest, Service Worker (offline) und Icons.
// Aufruf: node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

const OUT = "docs";
const src = readFileSync("index.html", "utf8");
const split = src.indexOf('<div class="app">');
if (split < 0) throw new Error('Marker <div class="app"> nicht gefunden');
const head = src.slice(0, split).replace(/<meta name="apple-mobile-web-app-[^>]*>\s*/g, "");
const body = src.slice(split);
const version = createHash("sha1").update(src).digest("hex").slice(0, 10);

mkdirSync(OUT, { recursive: true });

// ---------- index.html ----------
writeFileSync(`${OUT}/index.html`, `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f4f5fa" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#11121a" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Migräne">
<meta name="description" content="Persönliches Tagebuch für Migräne und Kopfschmerzen">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="icon-192.png">
<style>
:root { color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; font: 14px system-ui, sans-serif; }
img { max-width: 100%; }
[hidden] { display: none !important; }
</style>
${head.trim()}
</head>
<body>
${body.trim()}
<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
</script>
</body>
</html>
`);

// ---------- Manifest ----------
writeFileSync(`${OUT}/manifest.webmanifest`, JSON.stringify({
  name: "Migräne-Tagebuch",
  short_name: "Migräne",
  description: "Persönliches Tagebuch für Migräne und Kopfschmerzen",
  lang: "de",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#f4f5fa",
  theme_color: "#6a3fd2",
  icons: [
    { src: "icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
}, null, 2));

// ---------- Service Worker ----------
writeFileSync(`${OUT}/sw.js`, `// Version ${version} – wird bei jedem Build neu erzeugt
const CACHE = "migraene-${version}";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("migraene-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // App selbst: erst Netz (damit Updates ankommen), offline aus dem Cache
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put("./", copy));
      return res;
    }).catch(() => caches.match("./", { ignoreSearch: true })));
    return;
  }
  // Schriften und eigene Dateien: aus dem Cache, im Hintergrund auffrischen
  if (url.origin === location.origin || /fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req, { ignoreSearch: url.origin === location.origin });
      const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
`);

// ---------- Icons (PNG, ohne externe Bibliotheken) ----------
// Violetter Grund mit weißem Blitz – wie der Migräne-Button in der App.
const BOLT = [[23, 4], [11, 22], [20, 22], [17, 36], [29, 17], [20, 17]]; // 40×40-Raster
function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function icon(size) {
  const BG = [0x6a, 0x3f, 0xd2], FG = [0xff, 0xff, 0xff];
  const scale = (size * 0.62) / 40, off = (size - 40 * scale) / 2; // Blitz im sicheren Bereich (maskable)
  const SS = 4; // Kantenglättung
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = (x + (sx + 0.5) / SS - off) / scale, py = (y + (sy + 0.5) / SS - off) / scale;
        if (inPoly(px, py, BOLT)) hits++;
      }
      const a = hits / (SS * SS), o = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] * (1 - a) + FG[c] * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))
  ]);
}
writeFileSync(`${OUT}/apple-touch-icon.png`, icon(180));
writeFileSync(`${OUT}/icon-192.png`, icon(192));
writeFileSync(`${OUT}/icon-512.png`, icon(512));
writeFileSync(`${OUT}/.nojekyll`, "");

console.log(`Fertig: ${OUT}/ (Version ${version})`);
