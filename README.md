# Datenmapper

CSV- oder JSON-Datei einlesen, Spalten den Feldern einer Ziel-API zuordnen, Daten prüfen,
paketweise an einen (simulierten) REST-Endpunkt senden und das Ergebnis protokollieren.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # Vitest: Parser, Zuordnung, Prüfung, Beispieldatei
npm run build
node scripts/beispieldaten.mjs   # Beispieldateien in public/ neu erzeugen
```

## Ablauf

1. **Import**: Drag-and-drop oder Dateiauswahl, CSV (Trennzeichen `; , Tab |` wird erkannt,
   Anführungszeichen und Zeilenumbrüche im Feld nach RFC 4180, BOM) oder JSON (Array oder Objekt
   mit Array, verschachtelte Felder werden zu `adresse.plz`). Bis 10 MB, alles im Browser.
2. **Zuordnung**: je Zielfeld ein Dropdown mit den Quellspalten und Beispielwerten. Vorschlag
   nach Spaltennamen und Aliassen (`Kdnr_01` → `customer_id`). Pflichtfelder ohne Quelle sperren
   den nächsten Schritt.
3. **Prüfung**: Vorschau mit rot markierten Zellen (Pflichtfeld, E-Mail, PLZ, Telefon, Datum,
   Zahl, Dubletten bei eindeutigen Feldern). Filter „nur Fehler“ und je Feld. Rote Zellen lassen
   sich per Klick korrigieren.
4. **Einspeisen**: gültige Zeilen gehen in Paketen à 50 per `POST /api/ingest`. Der Endpunkt
   prüft jedes Paket mit demselben Schema noch einmal und antwortet je Zeile. Bei 5xx/429 bis zu
   drei Versuche mit Backoff, Abbruch jederzeit. Schalter „Ausfall simulieren“ erzwingt beim
   ersten Versuch ein 503. Ergebnis: „142 Einträge verarbeitet, 136 übernommen, 6 Fehler“,
   Protokoll, Liste der abgewiesenen Zeilen, Exporte (API-JSON, gemappte CSV, Fehlerbericht).

## Aufbau

```
lib/schema.ts              Zielschema (Felder, Typen, Pflicht, Aliasse, Endpunkt, Paketgröße)
lib/parse.ts               CSV-/JSON-Parser
lib/mapping.ts             Zuordnungsvorschlag, Anwenden der Zuordnung plus Korrekturen
lib/validate.ts            Prüfregeln und Umwandlung in typisierte API-Objekte (Browser und Server)
lib/push-engine.ts         Pakete, Wiederholung, Abbruch, Zusammenfassung
lib/export.ts              CSV-Erzeugung, Download
lib/state/mapper-store.tsx useReducer + Context; Prüfergebnis wird abgeleitet, nie gespeichert
app/api/ingest/route.ts    simuliertes Zielsystem, speichert nichts
components/ui/             Button, Card, Badge, Select, Stat, Switch, Stepper
components/mapper/         Dropzone, MappingPanel, PreviewTable, PushPanel, ProtocolLog, MapperApp
```

**Anderes Zielsystem:** neues `TargetSchema` in `lib/schema.ts` anlegen und an
`<MapperProvider schema={…}>` übergeben. Für einen echten Endpunkt `endpoint` ändern und die
Antwort auf das Format `{ received, accepted, rejected: [{ row, reasons }] }` abbilden
(`lib/push-engine.ts`).

Die Beispieldateien in `public/` sind erfunden (Domains auf `.example`) und enthalten sieben
absichtlich fehlerhafte Zeilen.
