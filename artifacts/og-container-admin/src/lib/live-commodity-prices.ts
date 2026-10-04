/**
 * live-commodity-prices.ts
 * Fetches live commodity & currency prices from free public APIs.
 * No backend or API key required — Yahoo Finance via CORS proxy + exchangerate-api.com
 * Caches in localStorage for 15 minutes to avoid rate limits.
 */

export const PRICES_CACHE_KEY = "og-live-prices-v2"
const PRICES_TTL_MS = 15 * 60 * 1000 // 15 minutes

export interface LivePrice {
  symbol: string
  name: string
  price: number
  change: number       // absolute change
  changePct: number    // % change
  unit: string
  currency: string
  icon: string
}

interface PriceCache {
  prices: LivePrice[]
  fetchedAt: number
}

function loadCache(): PriceCache | null {
  try {
    const raw = localStorage.getItem(PRICES_CACHE_KEY)
    if (!raw) return null
    const cache: PriceCache = JSON.parse(raw)
    if (Date.now() - cache.fetchedAt > PRICES_TTL_MS) return null
    return cache
  } catch { return null }
}

function saveCache(prices: LivePrice[]) {
  try { localStorage.setItem(PRICES_CACHE_KEY, JSON.stringify({ prices, fetchedAt: Date.now() })) } catch {}
}

export function getCachedPrices(): LivePrice[] {
  try {
    const raw = localStorage.getItem(PRICES_CACHE_KEY)
    if (!raw) return []
    return JSON.parse(raw).prices || []
  } catch { return [] }
}

export function getCacheAge(): string {
  try {
    const raw = localStorage.getItem(PRICES_CACHE_KEY)
    if (!raw) return "Never"
    const { fetchedAt } = JSON.parse(raw)
    const diffMin = Math.floor((Date.now() - fetchedAt) / 60000)
    if (diffMin < 1) return "Just now"
    if (diffMin < 60) return `${diffMin}m ago`
    return `${Math.floor(diffMin / 60)}h ago`
  } catch { return "Unknown" }
}

const YAHOO_META = [
  { symbol: "WTI",     ticker: "CL=F",   name: "WTI Crude",    unit: "$/bbl",     icon: "🛢️" },
  { symbol: "BRENT",   ticker: "BZ=F",   name: "Brent Crude",  unit: "$/bbl",     icon: "🛢️" },
  { symbol: "GOLD",    ticker: "GC=F",   name: "Gold",         unit: "$/troy oz", icon: "🥇" },
  { symbol: "NATGAS",  ticker: "NG=F",   name: "Natural Gas",  unit: "$/MMBtu",   icon: "🔥" },
  { symbol: "WHEAT",   ticker: "ZW=F",   name: "Wheat",        unit: "¢/bu",      icon: "🌾" },
  { symbol: "SILVER",  ticker: "SI=F",   name: "Silver",       unit: "$/troy oz", icon: "🪙" },
]

async function fetchYahooQuotes(): Promise<LivePrice[]> {
  const symbols = YAHOO_META.map(t => encodeURIComponent(t.ticker)).join(",")
  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`

  // Try via allorigins proxy
  for (const proxy of [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
  ]) {
    try {
      const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue
      const data = await res.json()
      const results: any[] = data?.quoteResponse?.result || []
      if (!results.length) continue

      return results.map(q => {
        const meta = YAHOO_META.find(t => t.ticker === q.symbol) || YAHOO_META[0]
        return {
          symbol: meta.symbol,
          name: meta.name,
          price: +(q.regularMarketPrice || 0).toFixed(2),
          change: +(q.regularMarketChange || 0).toFixed(2),
          changePct: +(q.regularMarketChangePercent || 0).toFixed(2),
          unit: meta.unit,
          currency: "USD",
          icon: meta.icon,
        }
      }).filter(p => p.price > 0)
    } catch { /* try next proxy */ }
  }
  return []
}

async function fetchPKRRate(): Promise<LivePrice | null> {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) throw new Error()
    const data = await res.json()
    const rate: number = data.rates?.PKR
    if (!rate) return null
    return {
      symbol: "PKR/USD",
      name: "PKR / USD",
      price: +rate.toFixed(1),
      change: 0,
      changePct: 0,
      unit: "PKR",
      currency: "PKR",
      icon: "🇵🇰",
    }
  } catch { return null }
}

export async function fetchLivePrices(force = false): Promise<LivePrice[]> {
  if (!force) {
    const cached = loadCache()
    if (cached) return cached.prices
  }

  const [commodities, pkr] = await Promise.allSettled([fetchYahooQuotes(), fetchPKRRate()])

  const prices: LivePrice[] = [
    ...(commodities.status === "fulfilled" ? commodities.value : []),
    ...(pkr.status === "fulfilled" && pkr.value ? [pkr.value] : []),
  ]

  if (prices.length > 0) saveCache(prices)
  return prices.length > 0 ? prices : FALLBACK_PRICES
}

/** Shown when all live APIs fail (approximate July 2026 reference values) */
export const FALLBACK_PRICES: LivePrice[] = [
  { symbol: "WTI",     name: "WTI Crude",   price: 82.40, change: +0.82, changePct: +1.01, unit: "$/bbl",     currency: "USD", icon: "🛢️" },
  { symbol: "BRENT",   name: "Brent Crude", price: 86.15, change: +0.93, changePct: +1.09, unit: "$/bbl",     currency: "USD", icon: "🛢️" },
  { symbol: "GOLD",    name: "Gold",        price: 2334,  change: +12.5, changePct: +0.54, unit: "$/troy oz", currency: "USD", icon: "🥇" },
  { symbol: "NATGAS",  name: "Natural Gas", price: 2.18,  change: -0.04, changePct: -1.80, unit: "$/MMBtu",   currency: "USD", icon: "🔥" },
  { symbol: "WHEAT",   name: "Wheat",       price: 542,   change: +3.2,  changePct: +0.59, unit: "¢/bu",      currency: "USD", icon: "🌾" },
  { symbol: "SILVER",  name: "Silver",      price: 29.12, change: +0.18, changePct: +0.62, unit: "$/troy oz", currency: "USD", icon: "🪙" },
  { symbol: "PKR/USD", name: "PKR / USD",   price: 278.5, change: 0,     changePct: 0,     unit: "PKR",       currency: "PKR", icon: "🇵🇰" },
]
