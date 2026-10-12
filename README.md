# Migräne-Tagebuch

Persönliches Tagebuch für Migräne- und Kopfschmerztage: Medikamente (mit Anzahl), Trigger, Aura-Symptome, Notizen, Kalender und Statistik.

**App öffnen:** https://karimamin0318-prog.github.io/migraene-tagebuch/

Alle Einträge bleiben auf dem Gerät, auf dem die App benutzt wird. Es gibt kein Konto, keinen Server und keine Verbindung zu Drittanbietern. Sicherungen lassen sich im Tab „Statistik“ exportieren und wieder importieren; die App erinnert regelmäßig daran.

## Auf dem iPhone installieren

1. Link in **Safari** öffnen.
2. Teilen-Symbol → **Zum Home-Bildschirm**.
3. Ab jetzt die App über das Symbol starten (funktioniert auch offline).

## Aufbau

- `docs/index.html` – die komplette App (HTML, CSS und JavaScript in einer Datei)
- `docs/sw.js`, `docs/manifest.webmanifest`, Icons – werden von `build.mjs` erzeugt
- `node build.mjs` – nach jeder Änderung an `docs/index.html` ausführen (neue Versionsnummer, damit die Offline-Kopie auf dem Handy aktualisiert wird)

Die Daten liegen im Browser-Speicher unter dem Schlüssel `migraene-tagebuch-v1:local`. Diesen Namen nicht ändern, sonst findet die App vorhandene Einträge nicht mehr.
