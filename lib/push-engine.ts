import type { TargetSchema } from "./schema";
import { toPayload, type RowResult } from "./validate";

export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEntry {
  at: number;
  level: LogLevel;
  message: string;
}

export interface RejectedRow {
  row: number;
  stage: "lokal" | "server";
  reasons: string[];
}

export interface PushSummary {
  processed: number;
  accepted: number;
  rejected: number;
  batches: number;
  retries: number;
  durationMs: number;
  rejectedRows: RejectedRow[];
  aborted: boolean;
}

export interface IngestResponse {
  received: number;
  accepted: number;
  rejected: { row: number; reasons: string[] }[];
}

export interface PushOptions {
  schema: TargetSchema;
  rows: RowResult[];
  /** Endpunkt antwortet bei jedem ersten Versuch eines Pakets mit 503 (Test der Wiederholung). */
  simulateOutage: boolean;
  signal: AbortSignal;
  onLog: (level: LogLevel, message: string) => void;
  onProgress: (done: number, total: number) => void;
}

const MAX_ATTEMPTS = 3;

/**
 * Sendet gültige Zeilen paketweise an den Endpunkt. Ungültige Zeilen verlassen den Browser nie,
 * sie zählen als lokal abgewiesen. Der Server prüft jedes Paket noch einmal selbst.
 */
export async function pushRecords(opts: PushOptions): Promise<PushSummary> {
  const { schema, rows, signal, onLog, onProgress } = opts;
  const started = performance.now();

  const rejectedRows: RejectedRow[] = [];
  const valid = rows.filter((r) => {
    if (r.issues.length === 0) return true;
    rejectedRows.push({
      row: r.index + 1,
      stage: "lokal",
      reasons: r.issues.map((i) => `${i.field}: ${i.message}`),
    });
    return false;
  });

  const batches: RowResult[][] = [];
  for (let i = 0; i < valid.length; i += schema.batchSize) batches.push(valid.slice(i, i + schema.batchSize));

  onLog("info", `${rows.length} Einträge, ${valid.length} gültig, ${rows.length - valid.length} lokal abgewiesen.`);
  onLog("info", `${batches.length} Paket(e) à max. ${schema.batchSize} an ${schema.method} ${schema.endpoint}.`);

  let accepted = 0;
  let retries = 0;
  let done = 0;
  let aborted = false;
  onProgress(0, valid.length);

  for (const [b, batch] of batches.entries()) {
    if (signal.aborted) {
      aborted = true;
      break;
    }
    const label = `Paket ${b + 1}/${batches.length}`;
    const body = JSON.stringify({
      records: batch.map((r) => ({ _row: r.index + 1, ...toPayload(r.record, schema.fields) })),
    });

    let response: IngestResponse | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(schema.endpoint, {
          method: schema.method,
          headers: {
            "content-type": "application/json",
            ...(opts.simulateOutage && attempt === 1 ? { "x-simulate-outage": "1" } : {}),
          },
          body,
          signal,
        });
        if (res.ok) {
          response = (await res.json()) as IngestResponse;
          break;
        }
        const transient = res.status >= 500 || res.status === 429;
        onLog(transient ? "warn" : "error", `${label}: HTTP ${res.status}${transient && attempt < MAX_ATTEMPTS ? ", neuer Versuch" : ""}`);
        if (!transient) break;
      } catch (e) {
        if (signal.aborted) break;
        onLog("warn", `${label}: Netzwerkfehler (${(e as Error).message})`);
      }
      if (attempt < MAX_ATTEMPTS) {
        retries++;
        await wait(300 * 2 ** (attempt - 1), signal);
      }
    }

    if (signal.aborted) {
      aborted = true;
      break;
    }

    if (!response) {
      onLog("error", `${label}: endgültig fehlgeschlagen, ${batch.length} Einträge nicht übertragen.`);
      for (const r of batch) rejectedRows.push({ row: r.index + 1, stage: "server", reasons: ["Paket nicht zugestellt"] });
    } else {
      accepted += response.accepted;
      for (const r of response.rejected) rejectedRows.push({ row: r.row, stage: "server", reasons: r.reasons });
      onLog(
        response.rejected.length ? "warn" : "success",
        `${label}: ${response.accepted} angenommen${response.rejected.length ? `, ${response.rejected.length} abgewiesen` : ""}.`,
      );
    }
    done += batch.length;
    onProgress(done, valid.length);
  }

  if (aborted) onLog("warn", "Übertragung abgebrochen. Bereits angenommene Pakete bleiben im Zielsystem.");

  rejectedRows.sort((a, b) => a.row - b.row);
  return {
    processed: rows.length,
    accepted,
    rejected: rejectedRows.length,
    batches: batches.length,
    retries,
    durationMs: Math.round(performance.now() - started),
    rejectedRows,
    aborted,
  };
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
}
