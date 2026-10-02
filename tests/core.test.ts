import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyMapping, suggestMapping } from "../lib/mapping";
import { parseCsv, parseJson, parseText } from "../lib/parse";
import { CUSTOMER_SCHEMA } from "../lib/schema";
import { parseDate, parseDecimal, toPayload, validateRecords } from "../lib/validate";

const fields = CUSTOMER_SCHEMA.fields;

describe("CSV", () => {
  it("erkennt Semikolon, Anführungszeichen und Umbrüche im Feld", () => {
    const d = parseCsv('a;b;c\r\n1;"x;y";"zeile\nzwei"\r\n2;"sagt ""hallo""";\r\n');
    expect(d.delimiter).toBe(";");
    expect(d.rows).toEqual([
      { a: "1", b: "x;y", c: "zeile\nzwei" },
      { a: "2", b: 'sagt "hallo"', c: "" },
    ]);
  });

  it("erkennt Komma und Tab", () => {
    expect(parseCsv("a,b\n1,2").delimiter).toBe(",");
    expect(parseCsv("a\tb\n1\t2").delimiter).toBe("\t");
  });

  it("benennt leere und doppelte Kopfzellen", () => {
    expect(parseCsv("name;;name\n1;2;3").columns).toEqual(["name", "Spalte 2", "name (2)"]);
  });

  it("warnt bei zu kurzen Zeilen und überspringt Leerzeilen", () => {
    const d = parseCsv("a;b;c\n1;2\n\n4;5;6\n");
    expect(d.rows).toHaveLength(2);
    expect(d.rows[0].c).toBe("");
    expect(d.warnings[0]).toMatch(/weniger Spalten/);
  });

  it("entfernt das BOM", () => {
    expect(parseText("x.csv", "﻿id;name\n1;a").columns[0]).toBe("id");
  });
});

describe("JSON", () => {
  it("flacht verschachtelte Objekte ab und findet das Array im Objekt", () => {
    const d = parseJson(JSON.stringify({ kunden: [{ id: 1, adresse: { plz: "82538" }, tags: ["a"] }, { id: 2, extra: null }] }));
    expect(d.columns).toEqual(["id", "adresse.plz", "tags", "extra"]);
    expect(d.rows[1]["adresse.plz"]).toBe("");
    expect(d.rows[0].tags).toBe('["a"]');
  });

  it("lehnt Unbrauchbares mit klarer Meldung ab", () => {
    expect(() => parseJson("{x")).toThrow(/Ungültiges JSON/);
    expect(() => parseJson('{"a":1}')).toThrow(/Array/);
  });
});

describe("Zuordnung", () => {
  it("ordnet typische deutsche Spaltennamen zu", () => {
    const m = suggestMapping(["Kdnr_01", "Firma", "Vorname", "Nachname", "E-Mail", "Tel.", "PLZ", "Kunde seit", "Umsatz", "Bemerkung"], fields);
    expect(m).toMatchObject({
      customer_id: "Kdnr_01",
      company: "Firma",
      first_name: "Vorname",
      last_name: "Nachname",
      email: "E-Mail",
      phone: "Tel.",
      postal_code: "PLZ",
      created_at: "Kunde seit",
      revenue: "Umsatz",
    });
    expect(Object.values(m)).not.toContain("Bemerkung");
  });

  it("nutzt bei JSON-Pfaden das letzte Segment", () => {
    const m = suggestMapping(["kontakt.email", "adresse.plz", "adresse.ort"], fields);
    expect(m).toMatchObject({ email: "kontakt.email", postal_code: "adresse.plz", city: "adresse.ort" });
  });

  it("vergibt keine Quellspalte doppelt", () => {
    const m = suggestMapping(["name"], fields);
    expect(Object.values(m).filter((v) => v === "name")).toHaveLength(1);
  });

  it("Korrekturen überschreiben den Quellwert", () => {
    const r = applyMapping([{ mail: " x " }], { email: "mail" }, fields, { 0: { email: "neu@a.de" } });
    expect(r[0].email).toBe("neu@a.de");
  });
});

describe("Prüfung", () => {
  it("Zahlen in deutscher und englischer Schreibweise", () => {
    expect(parseDecimal("1.234,56")).toBe(1234.56);
    expect(parseDecimal("1,234.56")).toBe(1234.56);
    expect(parseDecimal("12,5 €")).toBe(12.5);
    expect(parseDecimal("1.234.567")).toBe(1234567);
    expect(parseDecimal("k. A.")).toBeNull();
    expect(parseDecimal("1,2,3")).toBeNull();
  });

  it("Datum nur, wenn es den Tag gibt", () => {
    expect(parseDate("01.02.2024")).toBe("2024-02-01");
    expect(parseDate("2024-02-29")).toBe("2024-02-29");
    expect(parseDate("31.02.2023")).toBeNull();
    expect(parseDate("2023-13-01")).toBeNull();
  });

  it("markiert Pflichtfelder, Formate und Dubletten", () => {
    const base = { customer_id: "1", last_name: "A", email: "a@b.de" };
    const r = validateRecords(
      [base, { ...base, email: "kaputt" }, { ...base, customer_id: "2", last_name: "" }, { ...base, customer_id: "1" }],
      fields,
    );
    expect(r.rows.map((x) => x.issues.map((i) => i.field))).toEqual([[], ["customer_id", "email"], ["last_name"], ["customer_id"]]);
    expect(r.validCount).toBe(1);
    expect(r.issuesByField).toMatchObject({ customer_id: 2, email: 1, last_name: 1 });
  });

  it("baut typisierte API-Objekte", () => {
    expect(toPayload({ customer_id: "K1", email: "A@B.DE", revenue: "1.000,50", created_at: "03.04.2021", phone: "" }, fields)).toEqual({
      customer_id: "K1",
      email: "a@b.de",
      revenue: 1000.5,
      created_at: "2021-04-03",
    });
  });
});

describe("Beispieldatei", () => {
  it("142 Zeilen, Vorschlag deckt alle Pflichtfelder, genau 7 fehlerhafte Zeilen", () => {
    const d = parseText("beispiel-kunden.csv", readFileSync("public/beispiel-kunden.csv", "utf8"));
    const m = suggestMapping(d.columns, fields);
    const r = validateRecords(applyMapping(d.rows, m, fields), fields);
    expect(d.rows).toHaveLength(142);
    expect(fields.filter((f) => f.required && !m[f.key])).toEqual([]);
    expect(r.invalidCount).toBe(7);
  });
});
