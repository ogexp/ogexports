export interface SearchableOption {
  value: string
  label: string
  /** Extra terms included in search (e.g. UN/LOCODE, ISO code, country aliases) */
  keywords?: string | string[]
}

/**
 * Match quality, best first. An exact hit on the label or one of the keywords outranks a
 * label prefix, so typing "UK" finds United Kingdom rather than Ukraine, and a contiguous
 * phrase outranks terms merely scattered across the haystack.
 */
const RANK = {
  exact: 0,
  labelPrefix: 1,
  labelSubstring: 2,
  phrase: 3,
  allTerms: 4,
} as const

/** Lowercase, strip accents and reduce punctuation to spaces so "Türkiye" matches "turkiye". */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

function keywordList(keywords?: string | string[]): string[] {
  if (!keywords) return []

  return (Array.isArray(keywords) ? keywords : [keywords]).map(normalizeSearchText).filter(Boolean)
}

/**
 * Filter options by a free-text query. Every whitespace-separated term must appear
 * somewhere in the option's label, keywords or value, so "united emirates" matches
 * regardless of word order. Results are then ordered by match quality (see `RANK`).
 */
export function filterOptionsByQuery<T extends SearchableOption>(options: T[], query: string): T[] {
  const q = normalizeSearchText(query)
  if (!q) return options

  const terms = q.split(" ").filter(Boolean)
  const scored: { option: T; rank: number }[] = []

  for (const option of options) {
    const label = normalizeSearchText(option.label)
    const keywords = keywordList(option.keywords)
    const haystack = [label, ...keywords, normalizeSearchText(option.value)].join(" ")
    if (!terms.every(term => haystack.includes(term))) continue

    let rank: number
    if (label === q || keywords.includes(q)) rank = RANK.exact
    else if (label.startsWith(q)) rank = RANK.labelPrefix
    else if (label.includes(q)) rank = RANK.labelSubstring
    else if (keywords.some(k => k.includes(q))) rank = RANK.phrase
    else rank = RANK.allTerms

    scored.push({ option, rank })
  }

  // Stable sort keeps the caller's ordering (usually alphabetical) within each rank.
  scored.sort((a, b) => a.rank - b.rank)

  return scored.map(s => s.option)
}
