import { ImageResponse } from "next/og";

/** Vorschaubild beim Teilen: Name, die drei Schritte, Hinweis auf die Demo. Wird beim Bauen erzeugt. */
export const runtime = "nodejs";
export const alt = "Datenmapper: CSV- und JSON-Dateien zuordnen, prüfen und in ein anderes System übernehmen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const steps = [
  { label: "Zuordnen", value: "Kdnr_01 → customer_id", color: "#2554d6" },
  { label: "Prüfen", value: "7 von 142 rot", color: "#c52626" },
  { label: "Einspeisen", value: "in Paketen", color: "#157a3d" },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f4f6f9",
          color: "#0f172a",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#2554d6", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, padding: "0 13px" }}>
            <div style={{ width: 30, height: 4, borderRadius: 2, background: "#fff" }} />
            <div style={{ width: 22, height: 4, borderRadius: 2, background: "#fff" }} />
            <div style={{ width: 30, height: 4, borderRadius: 2, background: "#fff" }} />
          </div>
          <div style={{ fontSize: 30, fontWeight: 600 }}>Datenmapper</div>
          <div style={{ marginLeft: "auto", fontSize: 22, color: "#5b6577" }}>Demo · Beispieldaten</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>Alte Daten sauber ins neue System.</div>
          <div style={{ marginTop: 20, fontSize: 30, color: "#5b6577" }}>CSV oder JSON hochladen, Felder zuordnen, Fehler vor dem Import sehen.</div>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {steps.map((s) => (
            <div
              key={s.label}
              style={{ display: "flex", flexDirection: "column", flex: 1, background: "#fff", borderRadius: 18, padding: "22px 26px", border: "1px solid #e3e8ef" }}
            >
              <div style={{ fontSize: 22, color: "#5b6577" }}>{s.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, fontSize: 30, fontWeight: 600 }}>
                <div style={{ width: 14, height: 14, borderRadius: 999, background: s.color }} />
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
