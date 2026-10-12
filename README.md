# Migräne-Tagebuch

Persönliches Tagebuch für Migräne- und Kopfschmerztage: Medikamente (mit Anzahl), Trigger, Aura-Symptome, Notizen, Kalender und Statistik.

**App öffnen:** https://karimamin0318-prog.github.io/migraene-tagebuch/

Alle Einträge bleiben auf dem Gerät, auf dem die App benutzt wird. Es gibt kein Konto, keinen Server und keine Verbindung zu Drittanbietern. Sicherungen lassen sich im Tab „Statistik“ exportieren und wieder importieren; die App erinnert regelmäßig daran.

Sprache: Deutsch oder Englisch (Tab „Einstellungen“).

## Installieren

**iPhone:** Link in **Safari** öffnen → Teilen-Symbol → **Zum Home-Bildschirm**.

**Android:** Link in **Chrome** (oder Samsung Internet) öffnen → Tab „Einstellungen“ → **Zum Startbildschirm hinzufügen**, oder im Browser-Menü (⋮) **App installieren**.

Danach die App über das Symbol starten (funktioniert auch offline).

## Aufbau

- `docs/index.html` – die komplette App (HTML, CSS und JavaScript in einer Datei)
- `docs/sw.js`, `docs/manifest.webmanifest`, Icons – werden von `build.mjs` erzeugt
- `node build.mjs` – nach jeder Änderung an `docs/index.html` ausführen (neue Versionsnummer, damit die Offline-Kopie auf dem Handy aktualisiert wird)

Die Daten liegen im Browser-Speicher unter dem Schlüssel `migraene-tagebuch-v1:local`. Diesen Namen nicht ändern, sonst findet die App vorhandene Einträge nicht mehr.
