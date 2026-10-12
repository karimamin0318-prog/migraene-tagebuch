// Prüft Export → Import, damit eine Änderung keine Sicherungen kaputt macht: node test.mjs
// Läuft vor jeder Veröffentlichung in GitHub Actions.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import strict from "node:assert/strict";

// App-Skript ohne den Start-Teil (der zeichnet die Oberfläche), dafür die benötigten Funktionen nach außen geben
const html = readFileSync("docs/index.html", "utf8");
const app = html.match(/<script>([\s\S]*?)<\/script>/)[1].split("// ---------- Start ----------")[0] +
  "setLang('de'); globalThis.T = { S, parseImport, runImport, csvExport, jsonExport, load }; })();";

// Platzhalter für Browser-Objekte: jeder Zugriff und Aufruf liefert wieder den Platzhalter
const dom = new Proxy(function () {}, { get: (_, k) => (typeof k === "symbol" ? undefined : dom), apply: () => dom, construct: () => dom });
const store = new Map();
const ctx = {
  document: dom, window: dom, navigator: { userAgent: "" }, history: dom, location: dom,
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
  setTimeout, clearTimeout, Intl, console
};
runInNewContext(app, ctx);
// Werte aus der Sandbox in normale Objekte umwandeln, sonst scheitert der Vergleich an fremden Prototypen
const plain = v => JSON.parse(JSON.stringify(v));
const assert = { deepEqual: (a, b) => strict.deepEqual(plain(a), plain(b)), equal: strict.equal, ok: strict.ok };
const { S, parseImport, runImport, csvExport, jsonExport, load } = ctx.T;

const day = {
  type: "migraine", intensity: 7, meds: ["Zolmitriptan 2,5 mg"], medCounts: { "Zolmitriptan 2,5 mg": 2 },
  triggers: ["Stress", "Wein, rot"], symptoms: ["Sehstörungen"], note: "=Kopf; \"schlimm\"\nzweite Zeile"
};
const fresh = () => {
  S.days = { "2026-10-01": structuredClone(day) };
  S.customTriggers = ["Wein, rot"]; S.hiddenTriggers = ["Alkohol"];
  S.customMeds = []; S.hiddenMeds = []; S.customSymptoms = []; S.hiddenSymptoms = [];
};
const importText = (text, name, replace) => { S.imp = { p: parseImport(text, name) }; runImport(replace); };

// JSON: alles kommt unverändert zurück
fresh();
const json = jsonExport();
S.days = {}; S.customTriggers = []; S.hiddenTriggers = [];
importText(json, "b.json", true);
assert.deepEqual(S.days["2026-10-01"], day);
assert.deepEqual([S.customTriggers, S.hiddenTriggers], [["Wein, rot"], ["Alkohol"]]);

// CSV: Kommas in Namen, Anzahl, Notiz mit Sonderzeichen; Formel-Schutz wird beim Import entfernt
fresh();
const csv = csvExport();
S.days = {};
importText(csv, "b.csv", true);
assert.deepEqual(S.days["2026-10-01"].triggers, day.triggers);
assert.deepEqual(S.days["2026-10-01"].medCounts, day.medCounts);
assert.equal(S.days["2026-10-01"].note.replace(/^'/, ""), day.note);

// Ältere CSV (Trigger mit Komma getrennt) wird weiter gelesen
importText("Datum;Typ;Trigger\n2026-10-02;Migräne;Stress, Alkohol", "alt.csv", false);
assert.deepEqual(S.days["2026-10-02"].triggers, ["Stress", "Alkohol"]);

// Zusammenführen behält die eigenen gelöschten Standardeinträge, ersetzen übernimmt die der Datei
fresh();
importText(JSON.stringify({ hiddenTriggers: [], days: { "2026-10-03": { type: "headache" } } }), "m.json", false);
assert.deepEqual(S.hiddenTriggers, ["Alkohol"]);
assert.ok(S.days["2026-10-01"] && S.days["2026-10-03"]);
importText(JSON.stringify({ hiddenTriggers: [], days: { "2026-10-03": { type: "headache" } } }), "r.json", true);
assert.deepEqual([S.hiddenTriggers, Object.keys(S.days)], [[], ["2026-10-03"]]);

// Gespeicherter Stand lässt sich wieder laden
load();
assert.deepEqual(Object.keys(S.days), ["2026-10-03"]);

console.log("Alle Tests bestanden");
