import { CUSTOMER_SCHEMA } from "@/lib/schema";
import { validateRecords } from "@/lib/validate";

/**
 * Simuliertes Zielsystem. Nimmt ein Paket Kunden an, prüft es gegen dasselbe Schema
 * wie der Browser und antwortet je Zeile. Es wird nichts gespeichert.
 */

const MAX_RECORDS = 500;
const MAX_BYTES = 1024 * 1024;

/** Einfache Bremse je Instanz: öffentlich erreichbar, soll aber kein Rechenknecht für Fremde werden. */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const hits = new Map<string, { count: number; since: number }>();

function limited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.since > WINDOW_MS) {
    if (hits.size > 5000) hits.clear();
    hits.set(ip, { count: 1, since: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_REQUESTS;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "lokal";
  if (limited(ip)) return Response.json({ error: "Zu viele Anfragen, bitte kurz warten" }, { status: 429 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return Response.json({ error: "Paket größer als 1 MB" }, { status: 413 });
  }

  if (request.headers.get("x-simulate-outage") === "1") {
    return Response.json({ error: "Service vorübergehend nicht erreichbar (simuliert)" }, { status: 503 });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return Response.json({ error: "Paket größer als 1 MB" }, { status: 413 });
    body = JSON.parse(text);
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
