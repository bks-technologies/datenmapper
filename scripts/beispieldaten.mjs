// Erzeugt public/beispiel-kunden.csv und .json. Erfundene Daten, Domains auf .example.
// Aufruf: node scripts/beispieldaten.mjs
import { writeFileSync } from "node:fs";

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rand() * a.length)];

const vornamen = ["Anna", "Lukas", "Marie", "Jonas", "Sophie", "Felix", "Laura", "Paul", "Lea", "Maximilian", "Julia", "Tobias", "Katharina", "Stefan", "Sabine", "Michael", "Petra", "Andreas"];
const nachnamen = ["Huber", "Bauer", "Wagner", "Maier", "Schmid", "Gruber", "Weber", "Hofmann", "Brandl", "Lechner", "Fischer", "Schuster", "Kellner", "Moser", "Wimmer", "Riedl"];
const branchen = ["Elektro", "Haustechnik", "Autovermietung", "Zahntechnik", "Gartenbau", "Schreinerei", "Steuerberatung", "Malerbetrieb", "Physiotherapie", "Kfz-Service"];
const orte = [["82538", "Geretsried"], ["82515", "Wolfratshausen"], ["83646", "Bad Tölz"], ["82377", "Penzberg"], ["80331", "München"], ["82319", "Starnberg"], ["83607", "Holzkirchen"]];
const strassen = ["Hauptstraße", "Bahnhofstraße", "Am Anger", "Lindenweg", "Isarstraße", "Gewerbering", "Schulstraße"];

const ascii = (s) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const rows = [];
for (let i = 0; i < 142; i++) {
  const vn = pick(vornamen);
  const nn = pick(nachnamen);
  const branche = pick(branchen);
  const firma = `${branche} ${nn} GmbH`;
  const [plz, ort] = pick(orte);
  const d = 1 + Math.floor(rand() * 28);
  const m = 1 + Math.floor(rand() * 12);
  const y = 2018 + Math.floor(rand() * 8);
  rows.push({
    Kdnr_01: `K-${String(10001 + i)}`,
    Firma: firma,
    Vorname: vn,
    Nachname: nn,
    "E-Mail": `${ascii(vn)}.${ascii(nn)}@${ascii(branche)}-${ascii(nn)}.example`,
    "Tel.": `+49 8171 ${String(100000 + Math.floor(rand() * 899999))}`,
    Straße: `${pick(strassen)} ${1 + Math.floor(rand() * 80)}`,
    PLZ: plz,
    Ort: ort,
    "Kunde seit": `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`,
    Umsatz: (Math.floor(rand() * 9000000) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 }),
    Bemerkung: rand() < 0.15 ? "Rückruf erbeten; bitte vormittags" : "",
  });
}

// Bewusst eingebaute Fehler, damit die Prüfung etwas zu zeigen hat.
rows[11]["E-Mail"] = "stefan.huber(at)elektro-huber.example";
rows[37]["E-Mail"] = "";
rows[54].Nachname = "";
rows[78].PLZ = "8253";
rows[96].Kdnr_01 = rows[95].Kdnr_01;
rows[118]["Kunde seit"] = "31.02.2023";
rows[133].Umsatz = "k. A.";

const cols = Object.keys(rows[0]);
const esc = (v) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
writeFileSync("public/beispiel-kunden.csv", "﻿" + [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\r\n") + "\r\n");

const json = rows.slice(0, 40).map((r) => ({
  kundennummer: r.Kdnr_01,
  firma: r.Firma,
  kontakt: { vorname: r.Vorname, nachname: r.Nachname, email: r["E-Mail"], telefon: r["Tel."] },
  adresse: { strasse: r.Straße, plz: r.PLZ, ort: r.Ort },
  kundeSeit: r["Kunde seit"].split(".").reverse().join("-"),
  umsatz: Number(r.Umsatz.replace(/\./g, "").replace(",", ".")),
  tags: ["bestand"],
}));
writeFileSync("public/beispiel-kunden.json", JSON.stringify({ kunden: json }, null, 2) + "\n");
console.log(`CSV: ${rows.length} Zeilen, JSON: ${json.length} Einträge`);
