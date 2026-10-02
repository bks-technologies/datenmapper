<!--
Abschnitt für github.com/bks-technologies (Repo bks-technologies/bks-technologies, lokal ~/BKS/github-portfolio).
Einfügen vor der letzten Zeile „Sie möchten so etwas …“, die Bilder aus docs/screenshots/
(zuordnung, pruefung, einspeisen) nach assets/datenmapper/ kopieren.
Erst veröffentlichen, wenn die Demo unter der Adresse erreichbar ist, sonst zeigt der Link ins Leere.
-->

### Datenmapper: Dateien sauber in andere Systeme übernehmen

*Eigenentwicklung, Demo*

Eine Kundenliste aus Excel soll ins neue System, aber die Spalten heißen anders, E-Mails sind kaputt, Nummern doppelt. Der Datenmapper ordnet die Spalten zu, zeigt jeden Fehler vor dem Import und überträgt nur, was passt.

**[→ Demo ausprobieren](https://datenmapper.bkstechnologies.de)**: ohne Anmeldung, mit Beispieldatei. Die Datei bleibt im Browser.

| Zuordnung | Prüfung | Übertragung |
|:---:|:---:|:---:|
| <img src="./assets/datenmapper/zuordnung.png" width="270" alt="Zuordnung: je API-Feld ein Dropdown mit der passenden Spalte aus der Datei"> | <img src="./assets/datenmapper/pruefung.png" width="270" alt="Prüfung: fehlerhafte Zellen rot markiert, mit Grund"> | <img src="./assets/datenmapper/einspeisen.png" width="270" alt="Übertragung: 142 Einträge verarbeitet, 135 übernommen, 7 Fehler, mit Protokoll"> |

**Was die Demo kann**

- CSV und JSON per Drag-and-drop. Trennzeichen und verschachtelte Felder werden erkannt.
- Spalten den Feldern des Zielsystems zuordnen, mit Vorschlag nach Spaltennamen (`Kdnr_01` → `customer_id`).
- Prüfung vor dem Import: Pflichtfelder, E-Mail, PLZ, Datum, Beträge, Dubletten. Fehler lassen sich direkt in der Tabelle korrigieren.
- Übertragung in Paketen an eine Schnittstelle, mit automatischer Wiederholung bei Ausfällen, Protokoll und Fehlerbericht.

**Technik:** Next.js, TypeScript, Tailwind CSS. Das Zielsystem ist in der Demo simuliert und speichert nichts. Gehostet in Frankfurt (Vercel).
