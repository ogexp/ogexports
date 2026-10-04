// ─── CMS Data Store — Laravel API backed (in-memory cache) ───────────────────
import { api, unwrapList, unwrapPage } from "@/lib/api"

export interface SiteSettings {
  hero: {
    headline: string
    subheadline: string
    badge: string
    ctaLabel: string
    ctaSecondaryLabel: string
  }
  stats: {
    countries: string
    commodities: string
    years: string
    buyers: string
    shipments: string
    certifications: string
    partners: string
    marketCoverage: string
  }
  contact: {
    address: string
    city: string
    phone: string
    whatsapp: string
    email: string
    emailSales: string
  }
  social: {
    linkedin: string
    twitter: string
    whatsapp: string
    instagram: string
  }
  footer: {
    tagline: string
    copyright: string
    quickLinks: string[]
  }
  company: {
    description: string
    ceoMessage: string
    vision: string
    mission: string
  }
  registrations: {
    secp: string
    ntn: string
    strn: string
    psw: string
    weboc: string
    chamber: string
  }
}

export interface NewsArticle {
  id: string
  title: string
  slug: string
  category: string
  content: string
  excerpt: string
  imageUrl: string
  author: string
  publishedAt: string
  published: boolean
  tags: string[]
  type?: string
  source?: string
  sourceUrl?: string
  region?: string
}

export interface MediaItem {
  id: string
  url: string
  type: "image" | "video"
  title: string
  tags: string[]
  uploadedAt: string
}

function defaultSiteSettings(): SiteSettings {
  return {
    hero: {
      headline: "Connecting the World to Pakistan's Finest Produce",
      subheadline:
        "OG Exports bridges premium Pakistani agricultural commodities with global buyers across 40+ countries — trusted, certified, and shipment-ready.",
      badge: "Global Agricultural Trade Leader",
      ctaLabel: "Request a Quote",
      ctaSecondaryLabel: "Explore Products",
    },
    stats: {
      countries: "40+",
      commodities: "30+",
      years: "5+",
      buyers: "200+",
      shipments: "500+",
      certifications: "12",
      partners: "80+",
      marketCoverage: "65%",
    },
    contact: {
      address: "Plot 45, Block 7, SITE Area",
      city: "Karachi, Pakistan",
      phone: "+92-21-3456-7890",
      whatsapp: "+92-303-256-9000",
      email: "info@ogexports.co",
      emailSales: "sales@ogexports.co",
    },
    social: {
      linkedin: "https://linkedin.com/company/ogexports",
      twitter: "https://twitter.com/OGExports",
      whatsapp: "https://wa.me/923032569000",
      instagram: "https://instagram.com/ogexports",
    },
    footer: {
      tagline: "From Pakistan to The World — Premium Agricultural Exports",
      copyright: `© ${new Date().getFullYear()} OG Exports. All rights reserved.`,
      quickLinks: ["Home", "Products", "About", "Invest", "Contact"],
    },
    company: {
      description:
        "OG Exports is a Karachi-based international agricultural trading company specializing in the export of premium Pakistani commodities including Basmati rice, fresh fruits, vegetables, spices, and pulses to buyers across the Middle East, Europe, and Asia.",
      ceoMessage:
        "Our vision has always been simple — connect Pakistan's world-class agricultural bounty with buyers who value quality and reliability. We have built OG Exports on trust, transparency, and a relentless commitment to excellence in every shipment we dispatch.",
      vision:
        "To be the most trusted agricultural export company from Pakistan, recognized globally for quality, reliability, and sustainable trade practices.",
      mission:
        "To deliver premium Pakistani agricultural products to international markets with integrity, efficiency, and end-to-end trade support — empowering both our farmers and our global buyers.",
    },
    registrations: {
      secp: "0327442",
      ntn: "I563098",
      strn: "32778-7638246-2",
      psw: "PSW-I563098",
      weboc: "WEB-KHI-20240115",
      chamber: "1755-C",
    },
  }
}

let siteCache: SiteSettings = defaultSiteSettings()
let newsCache: NewsArticle[] = []
let mediaCache: MediaItem[] = []
let settingsLoaded = false
let newsLoaded = false
let mediaLoaded = false
let publicInitPromise: Promise<void> | null = null
let adminInitPromise: Promise<void> | null = null

function mergeSite(site: Record<string, any> | null | undefined): SiteSettings {
  const base = defaultSiteSettings()
  if (!site || typeof site !== "object") return base
  return {
    hero: { ...base.hero, ...(site.hero || {}) },
    stats: { ...base.stats, ...(site.stats || {}) },
    contact: { ...base.contact, ...(site.contact || {}) },
    social: { ...base.social, ...(site.social || {}) },
    footer: { ...base.footer, ...(site.footer || {}) },
    company: { ...base.company, ...(site.company || {}) },
    registrations: { ...base.registrations, ...(site.registrations || {}) },
  }
}

function mapNews(raw: any): NewsArticle {
  const publishedAt = raw.published_at || raw.publishedAt || ""
  return {
    id: String(raw.id),
    title: raw.title || "",
    slug: raw.slug || "",
    category: raw.category || "",
    content: raw.content || "",
    excerpt: raw.excerpt || "",
    imageUrl: raw.image_url || raw.imageUrl || "",
    author: raw.author || "",
    publishedAt: typeof publishedAt === "string" ? publishedAt.slice(0, 10) : "",
    published: Boolean(raw.published),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    type: raw.type || undefined,
    source: raw.source || undefined,
    sourceUrl: raw.source_url || raw.sourceUrl || undefined,
    region: raw.region || undefined,
  }
}

function mapMedia(raw: any): MediaItem {
  const uploaded = raw.created_at || raw.uploaded_at || raw.uploadedAt || ""
  const typeRaw = String(raw.type || "image").toLowerCase()
  return {
    id: String(raw.id),
    url: raw.url || "",
    type: typeRaw.includes("video") ? "video" : "image",
    title: raw.title || "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    uploadedAt: typeof uploaded === "string" ? uploaded.slice(0, 10) : "",
  }
}

function newsToApi(a: NewsArticle) {
  return {
    title: a.title,
    slug: a.slug || undefined,
    category: a.category || undefined,
    content: a.content || undefined,
    excerpt: a.excerpt || undefined,
    image_url: a.imageUrl || undefined,
    author: a.author || undefined,
    published_at: a.publishedAt || undefined,
    published: a.published,
    tags: a.tags || [],
    type: a.type || "trade",
    source: a.source || undefined,
    source_url: a.sourceUrl || undefined,
    region: a.region || undefined,
  }
}

export async function initCmsData(): Promise<void> {
  if (publicInitPromise) return publicInitPromise
  publicInitPromise = (async () => {
    await Promise.allSettled([
      api.publicGet("/api/settings").then((res: any) => {
        const data = res?.data ?? res
        siteCache = mergeSite(data?.site)
        settingsLoaded = true
      }),
      api.publicGet("/api/news").then((res: any) => {
        newsCache = unwrapList(res).map(mapNews)
        newsLoaded = true
      }),
    ])
  })().finally(() => { publicInitPromise = null })
  return publicInitPromise
}

export async function initAdminCmsData(): Promise<void> {
  if (adminInitPromise) return adminInitPromise
  adminInitPromise = (async () => {
    await initCmsData()
    await Promise.allSettled([
      api.get("/api/admin/cms/news").then((res: any) => {
        newsCache = unwrapPage(res).data.map(mapNews)
        newsLoaded = true
      }),
      api.get("/api/admin/cms/media").then((res: any) => {
        mediaCache = unwrapPage(res).data.map(mapMedia)
        mediaLoaded = true
      }),
    ])
  })().finally(() => { adminInitPromise = null })
  return adminInitPromise
}

export function getSiteSettings(): SiteSettings {
  if (!settingsLoaded) void initCmsData()
  return siteCache
}

export function saveSiteSettings(settings: SiteSettings): void {
  siteCache = settings
  void api.put("/api/admin/cms/site-settings", { settings })
    .then(() => { settingsLoaded = true })
    .catch(() => { void initCmsData() })
}

export function getNewsArticles(): NewsArticle[] {
  if (!newsLoaded) void initCmsData()
  return newsCache
}

function isServerId(id: string) {
  return /^\d+$/.test(String(id))
}

export function saveNewsArticles(articles: NewsArticle[]): void {
  const prev = newsCache
  newsCache = articles

  void (async () => {
    try {
      const prevById = new Map(prev.map(a => [a.id, a]))
      const nextIds = new Set(articles.map(a => a.id))

      for (const a of articles) {
        const before = prevById.get(a.id)
        if (!before || !isServerId(a.id)) {
          const res: any = await api.post("/api/admin/cms/news", newsToApi(a))
          const mapped = mapNews(res?.data ?? res)
          newsCache = newsCache.map(n => (n.id === a.id ? mapped : n))
          continue
        }
        if (JSON.stringify(before) !== JSON.stringify(a)) {
          await api.put(`/api/admin/cms/news/${a.id}`, newsToApi(a))
        }
      }

      for (const p of prev) {
        if (!nextIds.has(p.id) && isServerId(p.id)) {
          await api.delete(`/api/admin/cms/news/${p.id}`)
        }
      }
    } catch {
      void initAdminCmsData()
    }
  })()
}

export function getMediaItems(): MediaItem[] {
  if (!mediaLoaded) void initAdminCmsData()
  return mediaCache
}

export function saveMediaItems(items: MediaItem[]): void {
  const prev = mediaCache
  mediaCache = items

  void (async () => {
    try {
      const prevIds = new Set(prev.map(m => m.id))
      for (const item of items) {
        if (!prevIds.has(item.id) || String(item.id).startsWith("item-") || String(item.id).startsWith("media-")) {
          if (!/^\d+$/.test(String(item.id))) {
            const res: any = await api.post("/api/admin/cms/media", {
              url: item.url,
              type: item.type,
              title: item.title,
              tags: item.tags,
            })
            const mapped = mapMedia(res?.data ?? res)
            mediaCache = mediaCache.map(m => (m.id === item.id ? mapped : m))
          }
        }
      }
      // No delete endpoint for media in API — cache-only removal
    } catch {
      void initAdminCmsData()
    }
  })()
}
