"use client";

import { baseName, download, toCsv } from "@/lib/export";
import { useMapper } from "@/lib/state/mapper-store";
import { toPayload } from "@/lib/validate";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Stat } from "../ui/stat";
import { Switch } from "../ui/switch";
import { ProtocolLog } from "./protocol-log";

export function PushPanel() {
  const { state, schema, report, startPush, abortPush, setSimulateOutage, goTo } = useMapper();
  const { push, file } = state;
  const running = push.status === "running";
  const summary = push.summary;
  const progress = push.total ? Math.round((push.done / push.total) * 100) : 0;
  const name = baseName(file?.name ?? "export");

  const exportJson = () => {
    const valid = report.rows.filter((r) => !r.issues.length).map((r) => toPayload(r.record, schema.fields));
    download(`${name}-api.json`, JSON.stringify(valid, null, 2), "application/json");
  };

  const exportCsv = () => {
    const keys = schema.fields.map((f) => f.key);
    download(`${name}-gemappt.csv`, toCsv(["zeile", "status", ...keys], report.rows.map((r) => ({
      zeile: r.index + 1,
      status: r.issues.length ? "fehlerhaft" : "gültig",
      ...r.record,
    }))), "text/csv;charset=utf-8");
  };

  const exportErrors = () => {
    if (!summary) return;
    download(
      `${name}-fehlerbericht.csv`,
      toCsv(["zeile", "stufe", "gruende"], summary.rejectedRows.map((r) => ({ zeile: r.row, stufe: r.stage, gruende: r.reasons.join(" | ") }))),
      "text/csv;charset=utf-8",
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card
          title="In Ziel-System einspeisen"
          description="Gültige Zeilen gehen paketweise an den Endpunkt. Der Endpunkt prüft jedes Paket noch einmal und meldet je Zeile zurück."
        >
          <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-[auto_1fr]">
            <dt className="text-muted">Ziel</dt>
            <dd className="font-mono">
              <span className="mr-2 rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">{schema.method}</span>
              {schema.endpoint}
            </dd>
            <dt className="text-muted">Paketgröße</dt>
            <dd>{schema.batchSize} Einträge, bis zu 3 Versuche je Paket</dd>
            <dt className="text-muted">Zu senden</dt>
            <dd>
              {report.validCount} gültige Einträge
              {report.invalidCount > 0 && <span className="text-danger"> · {report.invalidCount} fehlerhafte bleiben lokal</span>}
            </dd>
          </dl>

          <div className="mt-5 border-t border-line pt-5">
            <Switch
              checked={state.simulateOutage}
              onChange={setSimulateOutage}
              disabled={running}
              label="Ausfall simulieren"
              description="Der Endpunkt antwortet beim ersten Versuch jedes Pakets mit 503. Zeigt die automatische Wiederholung."
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {running ? (
              <Button variant="danger" size="lg" onClick={abortPush}>Abbrechen</Button>
            ) : (
              <Button size="lg" disabled={report.validCount === 0} onClick={() => void startPush()}>
                {summary ? "Erneut einspeisen" : "In Ziel-System einspeisen"}
              </Button>
            )}
            <Button variant="secondary" disabled={running} onClick={() => goTo("review")}>Zurück zur Prüfung</Button>
          </div>

          {(running || summary) && (
            <div className="mt-6">
              <div className="mb-1.5 flex justify-between text-[12px] text-muted">
                <span>{running ? "Übertragung läuft …" : summary?.aborted ? "Abgebrochen" : "Abgeschlossen"}</span>
                <span className="tabular-nums">{push.done} / {push.total} · {progress} %</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </Card>

        <Card title="Export" description="Ohne Übertragung herunterladen.">
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={exportJson} disabled={report.validCount === 0}>API-JSON (nur gültige)</Button>
            <Button variant="secondary" onClick={exportCsv}>Gemappte CSV (alle, mit Status)</Button>
            <Button variant="secondary" onClick={exportErrors} disabled={!summary || summary.rejected === 0}>Fehlerbericht CSV</Button>
          </div>
        </Card>
      </div>

      {summary && (
        <div aria-live="polite" className="space-y-3">
          <p className="text-[15px] font-semibold">
            {summary.processed} Einträge verarbeitet, {summary.rejected} Fehler.
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Verarbeitet" value={summary.processed} />
            <Stat label="Übernommen" value={summary.accepted} tone="ok" />
            <Stat label="Fehler" value={summary.rejected} tone={summary.rejected ? "danger" : "neutral"} />
            <Stat
              label="Dauer"
              value={`${(summary.durationMs / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} s`}
              sub={`${summary.batches} Paket(e), ${summary.retries} Wiederholung(en)`}
            />
          </div>
        </div>
      )}

      <Card title="Protokoll" flush>
        <div className="p-3">
          <ProtocolLog entries={push.log} running={running} />
        </div>
      </Card>

      {summary && summary.rejectedRows.length > 0 && (
        <Card title="Abgewiesene Einträge" description="Lokal = vor dem Senden aussortiert. Server = vom Endpunkt abgelehnt." flush>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-surface-2">
                <tr className="border-b border-line text-left text-[12px] text-muted">
                  <th className="px-5 py-2 font-medium">Zeile</th>
                  <th className="px-3 py-2 font-medium">Stufe</th>
                  <th className="px-5 py-2 font-medium">Grund</th>
                </tr>
              </thead>
              <tbody>
                {summary.rejectedRows.map((r) => (
                  <tr key={`${r.stage}-${r.row}`} className="border-b border-line last:border-0">
                    <td className="px-5 py-2 tabular-nums">{r.row}</td>
                    <td className="px-3 py-2 text-muted">{r.stage}</td>
                    <td className="px-5 py-2 text-danger">{r.reasons.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
