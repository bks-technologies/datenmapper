import type { MappedRecord } from "./mapping";
import type { FieldType, TargetField } from "./schema";

export interface CellIssue {
  field: string;
  message: string;
}

export interface RowResult {
  index: number;
  record: MappedRecord;
  issues: CellIssue[];
}

export interface ValidationReport {
  rows: RowResult[];
  validCount: number;
  invalidCount: number;
  issueCount: number;
  issuesByField: Record<string, number>;
}

type Coerced = { ok: true; value: string | number } | { ok: false; error: string };

const ok = (value: string | number): Coerced => ({ ok: true, value });
const fail = (error: string): Coerced => ({ ok: false, error });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Prüft einen Rohwert und wandelt ihn in den Typ um, den die API erwartet. */
export function coerce(type: FieldType, raw: string): Coerced {
  const v = raw.trim();
  switch (type) {
    case "string":
      return ok(v);
    case "email":
      return EMAIL.test(v) ? ok(v.toLowerCase()) : fail("Kein gültiges E-Mail-Format");
    case "phone": {
      const digits = v.replace(/\D/g, "");
      return /^\+?[\d\s()/-]+$/.test(v) && digits.length >= 6 && digits.length <= 15
        ? ok(v)
        : fail("Telefonnummer: nur Ziffern, Leerzeichen, + ( ) / -, 6–15 Ziffern");
    }
    case "postal_code":
      return /^\d{5}$/.test(v) ? ok(v) : fail("PLZ muss aus 5 Ziffern bestehen");
    case "integer":
      return /^-?\d+$/.test(v) ? ok(Number(v)) : fail("Ganzzahl erwartet");
    case "decimal": {
      const n = parseDecimal(v);
      return n === null ? fail("Zahl erwartet, z. B. 1.234,56") : ok(n);
    }
    case "date": {
      const iso = parseDate(v);
      return iso ? ok(iso) : fail("Datum ungültig, erwartet TT.MM.JJJJ oder JJJJ-MM-TT");
    }
  }
}

/**
 * Akzeptiert 1234.56, 1234,56, 1.234,56, 1,234.56 und ein Euro-Zeichen.
 * Kommen Punkt und Komma vor, ist das letzte das Dezimaltrennzeichen.
 * Nur Komma: Dezimalkomma (deutsche Quelldaten).
 */
export function parseDecimal(raw: string): number | null {
  let s = raw.replace(/[\s€]/g, "");
  if (!s) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const dec = lastDot > lastComma ? "." : ",";
    const thousands = dec === "." ? "," : ".";
    s = s.split(thousands).join("").replace(dec, ".");
  } else if (lastComma >= 0) {
    if (s.indexOf(",") !== lastComma) return null;
    s = s.replace(",", ".");
  } else if (lastDot >= 0 && s.indexOf(".") !== lastDot) {
    // 1.234.567 = Tausenderpunkte
    if (!/^-?\d{1,3}(\.\d{3})+$/.test(s)) return null;
    s = s.split(".").join("");
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

export function parseDate(raw: string): string | null {
  let y: number, m: number, d: number;
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else {
    match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function validateRecords(records: MappedRecord[], fields: TargetField[], offset = 0): ValidationReport {
  const issuesByField: Record<string, number> = {};
  const seen: Record<string, Set<string>> = {};
  let issueCount = 0;
  let invalidCount = 0;

  const rows = records.map((record, i) => {
    const issues: CellIssue[] = [];
    for (const f of fields) {
      const value = record[f.key] ?? "";
      if (value === "") {
        if (f.required) issues.push({ field: f.key, message: "Pflichtfeld fehlt" });
        continue;
      }
      const c = coerce(f.type, value);
      if (!c.ok) issues.push({ field: f.key, message: c.error });
      if (f.unique) {
        const set = (seen[f.key] ??= new Set());
        const key = value.toLowerCase();
        if (set.has(key)) issues.push({ field: f.key, message: `Doppelt: „${value}“ kommt bereits weiter oben vor` });
        set.add(key);
      }
    }
    for (const issue of issues) issuesByField[issue.field] = (issuesByField[issue.field] ?? 0) + 1;
    issueCount += issues.length;
    if (issues.length) invalidCount++;
    return { index: offset + i, record, issues };
  });

  return { rows, validCount: rows.length - invalidCount, invalidCount, issueCount, issuesByField };
}

/** Gültiger Datensatz → typisiertes Objekt für die API. Leere optionale Felder entfallen. */
export function toPayload(record: MappedRecord, fields: TargetField[]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const f of fields) {
    const value = record[f.key];
    if (!value) continue;
    const c = coerce(f.type, value);
    if (c.ok) out[f.key] = c.value;
  }
  return out;
}
