import { useEffect } from "react"

const BASE = "OG Exports"
const SITE_URL = "https://ogexports.co"

/**
 * Sets the browser tab title and updates all SEO meta tags for the current page.
 * Usage: usePageTitle("Products", "Browse premium Pakistan agricultural exports…")
 * Optionally pass a canonical path: usePageTitle("Products", "…", "/products")
 */
export function usePageTitle(title: string, description?: string, canonicalPath?: string) {
  useEffect(() => {
    const fullTitle = title.includes(BASE) ? title : `${title} | ${BASE}`
    document.title = fullTitle

    // ── Description ────────────────────────────────────────────────────────────
    if (description) {
      const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      if (metaDesc) metaDesc.content = description

      const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]')
      if (ogDesc) ogDesc.content = description

      const twDesc = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')
      if (twDesc) twDesc.content = description
    }

    // ── OG / Twitter title ─────────────────────────────────────────────────────
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
    if (ogTitle) ogTitle.content = fullTitle

    const twTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')
    if (twTitle) twTitle.content = fullTitle

    // ── Canonical + og:url (use provided path or current pathname) ─────────────
    const path = canonicalPath ?? window.location.pathname
    const canonical = `${SITE_URL}${path}`

    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonicalEl) {
      canonicalEl.href = canonical
    } else {
      canonicalEl = document.createElement("link")
      canonicalEl.rel = "canonical"
      canonicalEl.href = canonical
      document.head.appendChild(canonicalEl)
    }

    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]')
    if (ogUrl) ogUrl.content = canonical

    return () => {
      document.title = `${BASE} — Premium Pakistan Agricultural Exports | B2B Trade Platform`
    }
  }, [title, description, canonicalPath])
}
