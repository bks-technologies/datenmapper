/**
 * Zielschema der (simulierten) Kunden-API.
 * Ein anderes Zielsystem = ein anderes Schema; der Rest der Anwendung liest nur dieses Objekt.
 */

export type FieldType =
  | "string"
  | "email"
  | "integer"
  | "decimal"
  | "date"
  | "postal_code"
  | "phone";

export interface TargetField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** Wert darf in einem Import nur einmal vorkommen. */
  unique?: boolean;
  /** Typische Spaltennamen in Quelldateien, für den Zuordnungsvorschlag. */
  aliases: string[];
  hint: string;
}

export interface TargetSchema {
  name: string;
  endpoint: string;
  method: "POST";
  batchSize: number;
  fields: TargetField[];
}

export const CUSTOMER_SCHEMA: TargetSchema = {
  name: "Kunden-API",
  endpoint: "/api/ingest",
  method: "POST",
  batchSize: 50,
  fields: [
    {
      key: "customer_id",
      label: "Kundennummer",
      type: "string",
      required: true,
      unique: true,
      aliases: ["kdnr", "kundennummer", "kundennr", "kunden_nr", "kunde", "customer", "customerid", "id", "nr"],
      hint: "Eindeutig je Import",
    },
    {
      key: "company",
      label: "Firma",
      type: "string",
      required: false,
      aliases: ["firma", "firmenname", "unternehmen", "company", "name1", "organisation"],
      hint: "Text",
    },
    {
      key: "first_name",
      label: "Vorname",
      type: "string",
      required: false,
      aliases: ["vorname", "vname", "firstname", "first", "givenname"],
      hint: "Text",
    },
    {
      key: "last_name",
      label: "Nachname",
      type: "string",
      required: true,
      aliases: ["nachname", "name", "nname", "lastname", "surname", "familienname"],
      hint: "Text",
    },
    {
      key: "email",
      label: "E-Mail",
      type: "email",
      required: true,
      aliases: ["email", "mail", "emailadresse", "e_mail", "mailadresse"],
      hint: "name@domain.de",
    },
    {
      key: "phone",
      label: "Telefon",
      type: "phone",
      required: false,
      aliases: ["telefon", "tel", "telefonnummer", "phone", "mobil", "handy", "rufnummer"],
      hint: "+49 …, Ziffern",
    },
    {
      key: "street",
      label: "Straße",
      type: "string",
      required: false,
      aliases: ["strasse", "straße", "str", "adresse", "street", "anschrift"],
      hint: "Text",
    },
    {
      key: "postal_code",
      label: "PLZ",
      type: "postal_code",
      required: false,
      aliases: ["plz", "postleitzahl", "zip", "zipcode", "postalcode"],
      hint: "5 Ziffern",
    },
    {
      key: "city",
      label: "Ort",
      type: "string",
      required: false,
      aliases: ["ort", "stadt", "city", "wohnort"],
      hint: "Text",
    },
    {
      key: "created_at",
      label: "Kunde seit",
      type: "date",
      required: false,
      aliases: ["kundeseit", "angelegt", "anlagedatum", "erstellt", "createdat", "datum", "seit"],
      hint: "TT.MM.JJJJ oder JJJJ-MM-TT",
    },
    {
      key: "revenue",
      label: "Jahresumsatz",
      type: "decimal",
      required: false,
      aliases: ["umsatz", "jahresumsatz", "revenue", "betrag", "volumen"],
      hint: "Zahl, Komma oder Punkt",
    },
  ],
};
