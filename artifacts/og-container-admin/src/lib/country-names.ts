/**
 * The countries table stores official ISO 3166-1 names ("United Arab Emirates (the)",
 * "Korea, Republic of", "Viet Nam"). Those read poorly in dropdowns and, more importantly,
 * never match what a user actually types ("UAE", "South Korea", "Vietnam").
 *
 * `countryDisplayName` gives the short trade name to show, and `countryNameCandidates`
 * gives the extra search terms so a country is still found by ISO code, official name,
 * or a common alias.
 */

/** Short trade names for ISO entries whose official form is awkward or unsearchable. */
const DISPLAY_NAMES: Record<string, string> = {
  AE: "United Arab Emirates",
  BN: "Brunei",
  BO: "Bolivia",
  CD: "DR Congo",
  CI: "Côte d'Ivoire",
  FK: "Falkland Islands",
  FM: "Micronesia",
  IR: "Iran",
  KP: "North Korea",
  KR: "South Korea",
  LA: "Laos",
  MD: "Moldova",
  MF: "Saint Martin",
  MH: "Marshall Islands",
  MP: "Northern Mariana Islands",
  PH: "Philippines",
  RU: "Russia",
  SD: "Sudan",
  SH: "Saint Helena",
  SY: "Syria",
  TC: "Turks and Caicos Islands",
  TW: "Taiwan",
  TZ: "Tanzania",
  US: "United States",
  VE: "Venezuela",
  VG: "British Virgin Islands",
  VI: "U.S. Virgin Islands",
  VN: "Vietnam",
}

/** Abbreviations, former names and colloquial names users type into search. */
const ALIASES: Record<string, string[]> = {
  AE: ["UAE", "Emirates", "Dubai", "Abu Dhabi", "Sharjah", "Jebel Ali"],
  BA: ["Bosnia", "Herzegovina"],
  BN: ["Brunei Darussalam"],
  CD: ["DRC", "Democratic Republic of the Congo", "Congo Kinshasa", "Zaire"],
  CG: ["Republic of the Congo", "Congo Brazzaville"],
  CH: ["Swiss"],
  CI: ["Ivory Coast"],
  CN: ["PRC", "Mainland China"],
  CV: ["Cabo Verde", "Cape Verde"],
  CZ: ["Czech Republic"],
  DE: ["Deutschland"],
  GB: ["UK", "Britain", "Great Britain", "England", "Scotland", "Wales", "Northern Ireland"],
  HK: ["Hongkong"],
  IR: ["Persia"],
  KP: ["DPRK"],
  KR: ["ROK"],
  MK: ["Macedonia"],
  MM: ["Burma"],
  MO: ["Macau", "Macao"],
  NL: ["Holland", "Dutch"],
  PS: ["Palestine"],
  RU: ["Russian Federation"],
  SA: ["KSA", "Saudi", "Jeddah", "Dammam"],
  SZ: ["Swaziland"],
  TL: ["East Timor"],
  TR: ["Turkey", "Turkiye"],
  US: ["USA", "America", "United States of America"],
  VA: ["Vatican", "Holy See"],
  VN: ["Viet Nam"],
}

function isoCode(code?: string | null): string {
  return String(code || "").trim().toUpperCase()
}

/**
 * Normalise a country string for comparison: drops accents, punctuation and the stray
 * "the" of official ISO names, so "Côte d'Ivoire" matches "Cote dIvoire" and
 * "Sudan (the)" matches "Sudan". Parenthesised text is kept because it is sometimes the
 * only thing distinguishing two entries, e.g. Virgin Islands (British) vs (U.S.).
 */
export function normalizeCountryValue(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\bthe\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Short, human-friendly country name suitable for dropdowns and saved records. */
export function countryDisplayName(code?: string | null, name?: string | null): string {
  const override = DISPLAY_NAMES[isoCode(code)]
  if (override) return override

  return String(name || "")
    .replace(/\s*\(the\)\s*$/i, "")
    .trim()
}

/**
 * Every name a country may be referred to by: ISO code, official name,
 * short trade name and known aliases. Used for search and for resolving
 * country strings saved before this normalisation existed.
 */
export function countryNameCandidates(code?: string | null, name?: string | null): string[] {
  const iso = isoCode(code)
  const candidates = [iso, String(name || "").trim(), DISPLAY_NAMES[iso], ...(ALIASES[iso] || [])]

  return Array.from(new Set(candidates.filter(Boolean)))
}

/**
 * Short forms (ISO codes, "UAE", "USA") are only ever compared exactly. Partial-matching
 * them produces false hits such as "spain" containing Panama's "pa".
 */
const PARTIAL_MATCH_MIN_LENGTH = 5

/**
 * Resolve a free-text country string ("UAE", "Korea, Republic of", "Dubai, UAE") to a
 * country record. Exact matches across all countries are preferred over partial ones, so
 * an unambiguous name is never shadowed by another country that merely contains it.
 */
export function findCountryByName<T extends { code: string; name: string }>(
  countries: T[],
  value?: string | null,
): T | null {
  const needle = normalizeCountryValue(value)
  if (!needle) return null

  const candidatesOf = (c: T) =>
    countryNameCandidates(c.code, c.name).map(normalizeCountryValue).filter(Boolean)

  const exact = countries.find(c => candidatesOf(c).includes(needle))
  if (exact) return exact

  return countries.find(c =>
    candidatesOf(c).some(candidate => {
      if (candidate.length < PARTIAL_MATCH_MIN_LENGTH) return false
      if (needle.includes(candidate)) return true

      return needle.length >= PARTIAL_MATCH_MIN_LENGTH && candidate.includes(needle)
    }),
  ) ?? null
}
