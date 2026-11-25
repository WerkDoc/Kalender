# 📅 Kalender & Schichtplaner (PWA)

Eine moderne, mobil-optimierte Kalender- und Schichtplaner Web-App (Progressive Web App) mit dezentem Glassmorphism-Design, Offline-Speicherung und flüssigen Animationen.

---

## ✨ Highlights & Funktionen

### 1. 🎨 Modernes Glassmorphism-Design (Mobile-First)
- **Glassmorphism-Optik:** Dezente halbtransparente Glaseffekte (`backdrop-filter: blur`), leuchtende Akzente und klare Kontraste.
- **Flüssige Animationen:** Sanfte Übergänge beim Wechseln zwischen Monaten und Tagen sowie beim Öffnen von Modals.
- **Dark- & Light-Mode:** Schneller Wechsel zwischen Dark- und Light-Design mit Speicherung der Präferenz.
- **Touch & Gesten:** Wischgesten (Swipe nach links/rechts) zum bequemen Wechseln von Tagen und Monaten auf dem Smartphone.

### 2. 🗓️ Monats- und Tagesansicht
- **Monatsansicht:**
  - Übersichtliche Monatsmatrix (Montag bis Sonntag) mit Schnellnavigation (`◀`, `Heute`, `▶`).
  - Monats- & Jahresauswahl per Klick auf den Monatstitel.
  - Farblich hervorgehobene Schicht-Badges direkt in den Tageszellen.
  - Termin-Punkte in den jeweiligen Kategorie-Farben.
  - **Monatsstatistik:** Automatische Zählung von Früh-, Spät-, Nachtschichten und Urlaubstagen im aktuellen Monat.
- **Tagesansicht:**
  - Detailansicht des ausgewählten Tages mit Wochentag und Datum.
  - Aktuelle Schicht mit Arbeitszeiten und Schnelländerungs-Buttons.
  - Übersichtliche Liste aller Termine des Tages, sortiert nach Uhrzeit oder ganztägig.
  - Schnelles Hinzufügen, Bearbeiten und Löschen von Terminen.

### 3. 🏭 Integrierter Schichtplaner
- Schnelle Schichteingabe mit vorgefertigten Schichtmodellen:
  - ☀️ **Frühschicht (F):** 06:00 – 14:00 Uhr
  - 🌅 **Spätschicht (S):** 14:00 – 22:00 Uhr
  - 🌙 **Nachtschicht (N):** 22:00 – 06:00 Uhr
  - 🌴 **Urlaub (U):** Ganztägig
  - ☕ **Frei:** Ruhetag / Freischicht
- **⚡ Schicht-Schnellstempel:** Schnelleingabemodus für Schichtpläne – wähle eine Schicht und stempfele sie mit wenigen Fingertipps auf beliebig viele Tage im Monat.

### 4. 📝 Termine & Notizen
- Termine mit **Titel**, **Datum**, **Uhrzeit** (Beginn/Ende oder ganztägig), **Notizen** und **Farbkategorien**:
  - 💼 Arbeit (Blau)
  - 🏠 Privat (Grün)
  - ⚠️ Wichtig (Rot)
  - 👨‍👩‍👧 Familie (Bernstein)
  - 🎉 Freizeit (Lila)
  - 🩺 Gesundheit (Cyan)

### 5. 🔍 Suche & Filter
- Echtzeit-Volltextsuche in Titeln und Notizen.
- Filterung nach Kategorien (z. B. nur "Arbeit" oder "Wichtig").
- Filterung nach Schichten (z. B. Termine an "Nachtschicht"-Tagen).
- Direkter Sprung zur Tagesansicht für jedes Suchergebnis.

### 6. 📱 PWA & Offline-Fähigkeit
- **Service Worker (`sw.js`):** Stale-While-Revalidate Caching aller App-Shell-Ressourcen für vollständige Offline-Nutzung.
- **Web App Manifest (`manifest.json`):** Homescreen-Installation (Add to Home Screen) auf iOS und Android mit Standalone-Anzeige.
- **Vektor-Icons (SVG):** Skalierbare Icons für alle Bildschirmauflösungen (`icons/icon.svg`, `icon-192.svg`, `icon-512.svg`).
- **Lokale Speicherung (`localStorage`):** Alle Daten bleiben offline im Browser gespeichert.
- **Datensicherung:** Export und Import als JSON-Datei sowie Funktion zum Laden von Beispieldaten.

---

## 🚀 Installation & Start

Die App benötigt keinen Build-Schritt oder externe Server-Abhängigkeiten. Sie läuft direkt in jedem modernen Webbrowser oder als installierte PWA:

```bash
# Repository klonen
git clone https://github.com/WerkDoc/Kalender.git
cd Kalender

# Tests ausführen
node --test tests/*.test.js

# Optional: Lokalen Server starten (z. B. mit Python oder npx serve)
python3 -m http.server 8000
# Öffne http://localhost:8000 im Browser
```

---

## 🧪 Tests
Die Kernlogik für Kalenderberechnungen, Schichten, Termine, Suche und PWA-Assets wird über Node.js-Tests abgedeckt:

```bash
node --test tests/*.test.js
```
