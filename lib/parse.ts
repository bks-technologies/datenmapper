export type SourceRow = Record<string, string>;

export interface ParsedData {
  format: "csv" | "json";
  columns: string[];
  rows: SourceRow[];
  delimiter?: string;
  warnings: string[];
}

export class ParseError extends Error {}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const DELIMITERS = [";", ",", "\t", "|"] as const;

export function parseText(fileName: string, text: string): ParsedData {
  const clean = text.replace(/^﻿/, "");
  if (!clean.trim()) throw new ParseError("Die Datei ist leer.");

  const isJson = /\.json$/i.test(fileName) || /^\s*[[{]/.test(clean);
  return isJson ? parseJson(clean) : parseCsv(clean);
}

/* ------------------------------------------------------------------ CSV */

export function detectDelimiter(text: string): string {
  const firstLine = splitRecords(text.slice(0, 64 * 1024), "\u0000")[0]?.[0] ?? "";
  let best: string = ";";
  let bestCount = 0;
  for (const d of DELIMITERS) {
    const count = countOutsideQuotes(firstLine, d);
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

function countOutsideQuotes(line: string, char: string): number {
  let inQuotes = false;
  let count = 0;
  for (const c of line) {
    if (c === '"') inQuotes = !inQuotes;
    else if (c === char && !inQuotes) count++;
  }
  return count;
}

/** RFC-4180: Anführungszeichen, "" als Escape, Zeilenumbrüche in Feldern, CRLF. */
function splitRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === delimiter) {
      record.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

export function parseCsv(text: string): ParsedData {
  const delimiter = detectDelimiter(text);
  const records = splitRecords(text, delimiter).filter((r) => r.some((v) => v.trim() !== ""));
  if (records.length === 0) throw new ParseError("Keine Zeilen gefunden.");

  const columns = uniqueHeaders(records[0]);
  const warnings: string[] = [];
  let short = 0;
  let long = 0;

  const rows = records.slice(1).map((values) => {
    if (values.length < columns.length) short++;
    if (values.length > columns.length) long++;
    const row: SourceRow = {};
    columns.forEach((col, i) => (row[col] = values[i] ?? ""));
    return row;
  });

  if (rows.length === 0) throw new ParseError("Nur eine Kopfzeile, keine Datenzeilen.");
  if (short) warnings.push(`${short} Zeile(n) haben weniger Spalten als die Kopfzeile, fehlende Werte sind leer.`);
  if (long) warnings.push(`${long} Zeile(n) haben mehr Spalten als die Kopfzeile, überzählige Werte wurden ignoriert.`);

  return { format: "csv", columns, rows, delimiter, warnings };
}

function uniqueHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    const base = h.trim() || `Spalte ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

/* ----------------------------------------------------------------- JSON */

export function parseJson(text: string): ParsedData {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new ParseError(`Ungültiges JSON: ${(e as Error).message}`);
  }

  const warnings: string[] = [];
  let list: unknown[] | undefined;
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === "object") {
    const entry = Object.entries(data).find(([, v]) => Array.isArray(v));
    if (entry) {
      list = entry[1] as unknown[];
      warnings.push(`Datensätze aus dem Feld „${entry[0]}“ gelesen.`);
    }
  }
  if (!list) throw new ParseError("Erwartet wird ein Array von Objekten oder ein Objekt mit einem solchen Array.");

  const objects = list.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x));
  if (objects.length === 0) throw new ParseError("Das Array enthält keine Objekte.");
  if (objects.length < list.length) warnings.push(`${list.length - objects.length} Einträge sind keine Objekte und wurden übersprungen.`);

  const columns: string[] = [];
  const known = new Set<string>();
  const rows = objects.map((obj) => {
    const row: SourceRow = {};
    flatten(obj, "", row);
    for (const k of Object.keys(row)) {
      if (!known.has(k)) {
        known.add(k);
        columns.push(k);
      }
    }
    return row;
  });
  for (const row of rows) for (const c of columns) row[c] ??= "";

  return { format: "json", columns, rows, warnings };
}

/** Verschachtelte Objekte werden zu Punkt-Pfaden (adresse.plz), Arrays zu JSON-Text. */
function flatten(value: Record<string, unknown>, prefix: string, out: SourceRow) {
  for (const [k, v] of Object.entries(value)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) out[key] = "";
    else if (Array.isArray(v)) out[key] = JSON.stringify(v);
    else if (typeof v === "object") flatten(v as Record<string, unknown>, key, out);
    else out[key] = String(v);
  }
}
