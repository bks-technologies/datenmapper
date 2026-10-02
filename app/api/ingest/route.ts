import { CUSTOMER_SCHEMA } from "@/lib/schema";
import { validateRecords } from "@/lib/validate";

/**
 * Simuliertes Zielsystem. Nimmt ein Paket Kunden an, prüft es gegen dasselbe Schema
 * wie der Browser und antwortet je Zeile. Es wird nichts gespeichert.
 */

const MAX_RECORDS = 500;

export async function POST(request: Request) {
  if (request.headers.get("x-simulate-outage") === "1") {
    return Response.json({ error: "Service vorübergehend nicht erreichbar (simuliert)" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body ist kein JSON" }, { status: 400 });
  }

  const records = (body as { records?: unknown })?.records;
  if (!Array.isArray(records)) return Response.json({ error: "Feld records (Array) fehlt" }, { status: 422 });
  if (records.length > MAX_RECORDS) return Response.json({ error: `Höchstens ${MAX_RECORDS} Einträge je Paket` }, { status: 413 });

  const rows: number[] = [];
  const asStrings = records.map((r, i) => {
    const obj = r && typeof r === "object" ? (r as Record<string, unknown>) : {};
    rows.push(typeof obj._row === "number" ? obj._row : i + 1);
    const out: Record<string, string> = {};
    for (const f of CUSTOMER_SCHEMA.fields) {
      const v = obj[f.key];
      out[f.key] = v === undefined || v === null ? "" : String(v);
    }
    return out;
  });

  const report = validateRecords(asStrings, CUSTOMER_SCHEMA.fields);

  // Netzlaufzeit eines echten Zielsystems andeuten.
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

  return Response.json({
    received: records.length,
    accepted: report.validCount,
    rejected: report.rows
      .filter((r) => r.issues.length)
      .map((r) => ({ row: rows[r.index], reasons: r.issues.map((i) => `${i.field}: ${i.message}`) })),
  });
}
