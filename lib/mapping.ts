import type { SourceRow } from "./parse";
import type { TargetField } from "./schema";

/** Zielfeld → Quellspalte (null = nicht zugeordnet). */
export type Mapping = Record<string, string | null>;

export type MappedRecord = Record<string, string>;

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function score(column: string, field: TargetField): number {
  const col = normalizeName(column);
  const colNoDigits = col.replace(/\d+$/, "");
  // Bei Punkt-Pfaden aus JSON (adresse.plz) zählt auch das letzte Segment.
  const last = normalizeName(column.split(".").pop() ?? column);
  const names = [field.key, field.label, ...field.aliases].map(normalizeName);

  if (names.includes(col)) return 3;
  if (names.includes(colNoDigits) || names.includes(last)) return 2;
  if (names.some((n) => n.length >= 4 && (col.includes(n) || n.includes(colNoDigits) && colNoDigits.length >= 4))) return 1;
  return 0;
}

/** Vorschlag: jedes Zielfeld bekommt die bestpassende, noch freie Quellspalte. */
export function suggestMapping(columns: string[], fields: TargetField[]): Mapping {
  const candidates: { field: string; column: string; score: number }[] = [];
  for (const field of fields)
    for (const column of columns) {
      const s = score(column, field);
      if (s > 0) candidates.push({ field: field.key, column, score: s });
    }
  candidates.sort((a, b) => b.score - a.score);

  const mapping: Mapping = Object.fromEntries(fields.map((f) => [f.key, null]));
  const used = new Set<string>();
  for (const c of candidates) {
    if (mapping[c.field] !== null || used.has(c.column)) continue;
    mapping[c.field] = c.column;
    used.add(c.column);
  }
  return mapping;
}

export function emptyMapping(fields: TargetField[]): Mapping {
  return Object.fromEntries(fields.map((f) => [f.key, null]));
}

/** Korrekturen aus der Vorschau: Zeilenindex → Zielfeld → Wert. */
export type Edits = Record<number, Record<string, string>>;

export function applyMapping(rows: SourceRow[], mapping: Mapping, fields: TargetField[], edits: Edits = {}): MappedRecord[] {
  return rows.map((row, i) => {
    const record: MappedRecord = {};
    for (const f of fields) {
      const source = mapping[f.key];
      const edited = edits[i]?.[f.key];
      record[f.key] = (edited ?? (source ? row[source] ?? "" : "")).trim();
    }
    return record;
  });
}
