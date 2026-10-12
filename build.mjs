// Erzeugt die Begleitdateien der App in docs/ (GitHub Pages):
// Service Worker (offline, Versionsnummer = Prüfsumme von index.html), Manifest und Icons.
// Nach jeder Änderung an docs/index.html ausführen: node build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

const OUT = "docs";
const version = createHash("sha1").update(readFileSync(`${OUT}/index.html`)).digest("hex").slice(0, 10);

// ---------- Service Worker ----------
writeFileSync(`${OUT}/sw.js`, `// Version ${version} – wird von build.mjs erzeugt
const CACHE = "migraene-${version}";
const CORE = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

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
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === "navigate") {
      // App: aktuelle Version aus dem Netz, nach 3 s (schlechter Empfang) oder offline aus dem Speicher
      const net = fetch(req).then(res => { if (res.ok) cache.put("./", res.clone()); return res; });
      const slow = new Promise((_, reject) => setTimeout(reject, 3000));
      try { return await Promise.race([net, slow]); }
      catch { return (await cache.match("./")) || net; }
    }
    return (await cache.match(req, { ignoreSearch: true })) ||
      fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
  })());
});
`);

// ---------- Manifest ----------
writeFileSync(`${OUT}/manifest.webmanifest`, JSON.stringify({
  id: "./",
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

// ---------- Icons: violetter Grund, weißer Blitz (PNG ohne externe Bibliotheken) ----------
const BOLT = [[23, 4], [11, 22], [20, 22], [17, 36], [29, 17], [20, 17]]; // 40×40-Raster wie das App-Symbol
function inPoly(x, y) {
  let inside = false;
  for (let i = 0, j = BOLT.length - 1; i < BOLT.length; j = i++) {
    const [xi, yi] = BOLT[i], [xj, yj] = BOLT[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function icon(size) {
  const BG = [0x6a, 0x3f, 0xd2], SS = 4; // 4×4 Unterabtastung für glatte Kanten
  const scale = (size * 0.62) / 40, off = (size - 40 * scale) / 2; // Blitz im sicheren Bereich (maskable)
  const stride = size * 3 + 1, raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let hits = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++)
      if (inPoly((x + (sx + 0.5) / SS - off) / scale, (y + (sy + 0.5) / SS - off) / scale)) hits++;
    const a = hits / (SS * SS), o = y * stride + 1 + x * 3;
    for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] * (1 - a) + 255 * a);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 Bit, RGB
  return Buffer.concat([Buffer.from("\x89PNG\r\n\x1a\n", "latin1"), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
writeFileSync(`${OUT}/apple-touch-icon.png`, icon(180));
writeFileSync(`${OUT}/icon-192.png`, icon(192));
writeFileSync(`${OUT}/icon-512.png`, icon(512));
writeFileSync(`${OUT}/.nojekyll`, "");

console.log(`Fertig: ${OUT}/ (Version ${version})`);
