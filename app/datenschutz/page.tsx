import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { company as c } from "@/lib/legal";

export const metadata: Metadata = { title: "Datenschutz · Datenmapper" };

/**
 * ENTWURF, von Sami zu prüfen. Aufbau wie in stunden/…/datenschutz. Der Datenmapper hat keine
 * Datenbank, keine Konten und keine Cookies; Dateien werden im Browser gelesen, nur die zum
 * Senden gewählten Zeilen gehen an /api/ingest und werden dort im Speicher geprüft, nicht abgelegt.
 */
export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutz">
      <p className="rounded-lg border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-warn">Entwurf, noch nicht rechtlich geprüft.</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        {c.legalName}, {c.street}, {c.zip} {c.city}, vertreten durch {c.representative}. E-Mail:{" "}
        <a href={`mailto:${c.email}`}>{c.email}</a>, Telefon: {c.phone}.
      </p>

      <h2>2. Was diese Anwendung ist</h2>
      <p>
        Der Datenmapper ist ein Vorführprojekt von BKS Technologies. Er zeigt, wie Dateien einem Datenformat zugeordnet, geprüft
        und an eine Schnittstelle übergeben werden. Das Zielsystem ist simuliert. Es gibt keine Anmeldung, keine Konten und keine Datenbank.
      </p>

      <h2>3. Hochgeladene Dateien</h2>
      <p>
        Eine ausgewählte Datei wird ausschließlich in Ihrem Browser gelesen und geprüft; sie wird dabei nicht übertragen. Erst wenn Sie
        „In Ziel-System einspeisen“ wählen, gehen die gültigen Zeilen paketweise an unseren Server. Dort werden sie im Arbeitsspeicher
        geprüft und sofort verworfen, nicht gespeichert und nicht weitergegeben. Bitte verwenden Sie die mitgelieferten Beispieldateien
        oder Daten ohne Personenbezug.
      </p>

      <h2>4. Hosting</h2>
      <p>
        Die Anwendung läuft bei Vercel Inc. in der Region Frankfurt am Main. Mit dem Anbieter besteht ein Auftragsverarbeitungsvertrag nach
        Art. 28 DSGVO. Beim Aufruf verarbeitet der Hosting-Anbieter technisch notwendige Verbindungsdaten (IP-Adresse, Zeitpunkt,
        aufgerufene Adresse) zur Auslieferung und Absicherung (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      <h2>5. Cookies und Analyse</h2>
      <p>Keine Cookies, keine Speicherung im Browser, keine Nutzungsanalyse, keine Inhalte von Drittanbietern.</p>

      <h2>6. Rechte der Betroffenen</h2>
      <p>
        Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch nach Art. 15 bis 21 DSGVO.
        Anfragen an <a href={`mailto:${c.email}`}>{c.email}</a>. Beschwerden nimmt die zuständige Aufsichtsbehörde entgegen:{" "}
        {c.authority.name}, {c.authority.street}, {c.authority.city}, <a href={c.authority.url}>{c.authority.url}</a>.
      </p>
    </LegalPage>
  );
}
