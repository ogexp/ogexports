/**
 * Laravel Sanctum SPA API client
 *
 * Empty VITE_API_URL in local dev = same-origin requests (Vite proxies to Laravel).
 * Production builds set VITE_API_URL to the API host (see .env.production).
 */
const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, "")
export const API_URL =
  configuredApiUrl !== undefined
    ? configuredApiUrl
    : import.meta.env.PROD
      ? "https://api.ogexports.co"
      : ""

/** Origin used for absolute URL parsing when API_URL is empty (same-origin / Vite proxy). */
export function apiOrigin(): string {
  if (API_URL) {
    try {
      return new URL(API_URL).origin
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== "undefined") return window.location.origin
  return "http://127.0.0.1:8000"
}

let csrfReady = false
let csrfRequest: Promise<void> | null = null

function getXsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function ensureCsrf(): Promise<void> {
  if (csrfReady && getXsrfToken()) return
  if (csrfRequest) return csrfRequest

  csrfRequest = (async () => {
    // Avoid custom headers so browsers skip OPTIONS preflight.
    // Hostinger CDN intermittently returns 405/500 on OPTIONS without CORS.
    const csrfPath = API_URL
      ? `${API_URL}/sanctum/csrf-cookie`
      : `${import.meta.env.BASE_URL.replace(/\/$/, "")}/sanctum/csrf-cookie`
    const response = await fetch(csrfPath, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      csrfReady = false
      throw new Error(`Unable to initialize CSRF protection (${response.status})`)
    }

    if (!getXsrfToken()) {
      csrfReady = false
      throw new Error("CSRF cookie was not set for this site")
    }

    csrfReady = true
  })().finally(() => {
    csrfRequest = null
  })

  return csrfRequest
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>
  payload?: Record<string, unknown>

  constructor(message: string, status: number, errors?: Record<string, string[]>, payload?: Record<string, unknown>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
    this.payload = payload
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  formData?: FormData
  auth?: boolean
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const joined = path.startsWith("http")
    ? path
    : `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`
  const routed = !API_URL && !path.startsWith("http")
    ? `${import.meta.env.BASE_URL.replace(/\/$/, "")}${joined.startsWith("/") ? "" : "/"}${joined}`
    : joined
  // Relative paths need a base when API_URL is empty (same-origin / Vite proxy).
  const url = routed.startsWith("http")
    ? new URL(routed)
    : new URL(routed || "/", apiOrigin())
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v))
    })
  }
  return url.toString()
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, formData, auth = true } = options

  if (auth && method !== "GET" && method !== "HEAD") {
    await ensureCsrf()
  }

  // Prefer CORS-safelisted headers on GET to avoid OPTIONS preflight
  // (Hostinger hcdn some edges return 405/500 without Access-Control-*).
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  const xsrf = getXsrfToken()
  if (xsrf && method !== "GET" && method !== "HEAD") {
    headers["X-XSRF-TOKEN"] = xsrf
  }

  let payload: BodyInit | undefined
  if (formData) {
    payload = formData
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    payload = JSON.stringify(body)
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    credentials: auth ? "include" : "omit",
    headers,
    body: payload,
  })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }

  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed (${res.status})`
    throw new ApiError(message, res.status, data?.errors, data && typeof data === "object" ? data : undefined)
  }

  return data as T
}

export const api = {
  get: <T = unknown>(path: string, query?: RequestOptions["query"]) =>
    apiRequest<T>(path, { method: "GET", query }),
  publicGet: <T = unknown>(path: string, query?: RequestOptions["query"]) =>
    apiRequest<T>(path, { method: "GET", query, auth: false }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T = unknown>(path: string) =>
    apiRequest<T>(path, { method: "DELETE" }),
  upload: <T = unknown>(path: string, formData: FormData) =>
    apiRequest<T>(path, { method: "POST", formData }),
}

/** Authenticated file download (streams blob, triggers browser save). */
export async function downloadAuthenticatedFile(path: string, fallbackName = "document"): Promise<void> {
  const { blob, filename } = await fetchAuthenticatedBlob(normalizeApiPath(path), fallbackName)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Authenticated inline view (opens blob in a new tab). */
export async function openAuthenticatedFile(path: string, fallbackName = "document"): Promise<void> {
  // Open immediately on user click — before any await — so the browser keeps the gesture.
  // Do not pass "noopener"; it makes window.open return null in modern browsers.
  const popup = window.open("", "_blank")
  if (popup) {
    popup.document.title = "Loading…"
    popup.document.body.innerHTML =
      "<p style='font-family:system-ui,sans-serif;padding:24px;color:#444'>Loading document…</p>"
  }

  try {
    const { blob, filename } = await fetchAuthenticatedBlob(normalizeApiPath(path), fallbackName)
    const url = URL.createObjectURL(blob)
    const title = filename || fallbackName

    if (popup && !popup.closed) {
      popup.location.href = url
      popup.document.title = title
      setTimeout(() => URL.revokeObjectURL(url), 120_000)
      return
    }

    // Popup unavailable — show an in-page preview instead of failing.
    showBlobPreviewOverlay(url, blob, title)
  } catch (error) {
    popup?.close()
    throw error
  }
}

function normalizeApiPath(path: string): string {
  if (!path.startsWith("http")) return path
  try {
    const parsed = new URL(path)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return path
  }
}

function showBlobPreviewOverlay(url: string, blob: Blob, title: string): void {
  const existing = document.getElementById("og-doc-preview-overlay")
  existing?.remove()

  const overlay = document.createElement("div")
  overlay.id = "og-doc-preview-overlay"
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.92);display:flex;flex-direction:column;padding:12px;box-sizing:border-box;"

  const header = document.createElement("div")
  header.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;gap:12px;color:#fff;margin-bottom:8px;flex-shrink:0;"

  const heading = document.createElement("span")
  heading.textContent = title
  heading.style.cssText = "font:600 14px/1.4 system-ui,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"

  const closeBtn = document.createElement("button")
  closeBtn.type = "button"
  closeBtn.textContent = "Close"
  closeBtn.style.cssText =
    "border:0;border-radius:8px;padding:8px 14px;background:#fff;color:#0f172a;font:600 12px system-ui,sans-serif;cursor:pointer;flex-shrink:0;"
  closeBtn.onclick = () => {
    URL.revokeObjectURL(url)
    overlay.remove()
  }

  header.append(heading, closeBtn)

  const body = document.createElement("div")
  body.style.cssText = "flex:1;min-height:0;border-radius:10px;overflow:hidden;background:#fff;"

  if (blob.type.startsWith("image/")) {
    const img = document.createElement("img")
    img.src = url
    img.alt = title
    img.style.cssText = "width:100%;height:100%;object-fit:contain;display:block;background:#0f172a;"
    body.appendChild(img)
  } else {
    const frame = document.createElement("iframe")
    frame.src = url
    frame.title = title
    frame.style.cssText = "width:100%;height:100%;border:0;display:block;"
    body.appendChild(frame)
  }

  overlay.append(header, body)
  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeBtn.click()
  })
  document.body.appendChild(overlay)
}

async function fetchAuthenticatedBlob(
  path: string,
  fallbackName: string,
): Promise<{ blob: Blob; filename: string }> {
  // Prefer CORS-safelisted headers on GET to avoid OPTIONS preflight
  // (Hostinger CDN intermittently returns 405/500 without Access-Control-*).
  // Session cookie auth is enough for stateful Sanctum reads; CSRF is not required on GET.
  const headers: Record<string, string> = {
    Accept: "*/*",
  }

  const res = await fetch(buildUrl(path), {
    method: "GET",
    credentials: "include",
    headers,
  })

  const contentType = (res.headers.get("Content-Type") || "").toLowerCase()

  if (!res.ok) {
    const text = await res.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = null }
    const message = data?.message || data?.error || `File request failed (${res.status})`
    throw new ApiError(message, res.status, data?.errors, data && typeof data === "object" ? data : undefined)
  }

  // Misconfigured edge/proxy may return JSON with a 200 status.
  if (contentType.includes("application/json")) {
    const text = await res.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = null }
    const message = data?.message || data?.error || "File request returned an unexpected response"
    throw new ApiError(message, res.status, data?.errors, data && typeof data === "object" ? data : undefined)
  }

  const disposition = res.headers.get("Content-Disposition") || ""
  const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)
  const filename = match ? decodeURIComponent(match[1].trim()) : fallbackName

  return { blob: await res.blob(), filename }
}

/** Upload a profile photo and persist avatar_url on the authenticated user. */
export async function uploadProfileAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ApiError("Please choose an image file", 422)
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError("Image must be under 5 MB", 422)
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("folder", "avatars")

  const uploadRes = await api.upload<{ data: { url?: string; path?: string } }>("/api/uploads", formData)
  const stored = toStoredMediaPath(uploadRes.data?.path || uploadRes.data?.url) || uploadRes.data?.path || uploadRes.data?.url
  if (!stored) {
    throw new ApiError("Upload did not return a file URL", 500)
  }

  await api.put("/api/me", { avatar_url: stored })

  return resolveMediaUrl(stored)
}

/** Remove the authenticated user's profile photo. */
export async function removeProfileAvatar(): Promise<void> {
  await api.put("/api/me", { avatar_url: null })
}

export function unwrapList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

export function unwrapPage<T = any>(payload: any): {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
} {
  const data = unwrapList<T>(payload)
  const source = payload?.meta || payload?.data?.meta || payload?.data || payload || {}
  const meta = {
    current_page: Number(source.current_page ?? payload?.current_page ?? 1),
    last_page: Number(source.last_page ?? payload?.last_page ?? 1),
    per_page: Number(source.per_page ?? payload?.per_page ?? data.length),
    total: Number(source.total ?? payload?.total ?? data.length),
  }
  return { data, meta }
}

/**
 * Resolve a stored media path/URL for display.
 * - Absolute URLs (legacy) pass through
 * - product_images/... → {API_URL}/product_images/...
 * - uploads/product-images/... → {API_URL}/uploads/product-images/...
 * - products/... or other storage paths → {API_URL}/storage/...
 * Returns empty string for empty input.
 */
export function resolveMediaUrl(path?: string | null): string {
  if (!path) return ""
  const raw = String(path).trim()
  if (!raw) return ""

  if (raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw
  }

  // Absolute URLs that point at our storage — rewrite via current API_URL
  // so buyers don't hit a stale APP_URL host from when the file was uploaded.
  if (/^https?:\/\//i.test(raw)) {
    const rewritten = toStoredMediaPath(raw)
    if (rewritten && rewritten !== raw && !/^https?:\/\//i.test(rewritten)) {
      return resolveMediaUrl(rewritten)
    }
    return raw
  }

  const cleaned = raw.replace(/^\/+/, "")

  // Product / investment images live under public/
  if (
    cleaned.startsWith("product_images/") ||
    cleaned.startsWith("investment_images/")
  ) {
    return `${API_URL}/${cleaned}`
  }

  // Product reports live under public/downloads/...
  if (cleaned.startsWith("downloads/")) {
    return `${API_URL}/${cleaned}`
  }

  // Current MediaStorage paths live under public/upload/...
  if (cleaned.startsWith("upload/")) {
    return `${API_URL}/${cleaned}`
  }

  // Chat / media uploads live on the public disk → /storage/...
  if (cleaned.startsWith("uploads/")) {
    return `${API_URL}/storage/${cleaned}`
  }

  if (cleaned.startsWith("storage/")) {
    return `${API_URL}/${cleaned}`
  }

  // Seeded files under storage/app/public/products/...
  return `${API_URL}/storage/${cleaned}`
}

/** Prefer relative attachment_path over stale absolute attachment_url. */
export function resolveAttachmentUrl(
  path?: string | null,
  url?: string | null,
): string {
  const normalizedPath = path ? toStoredMediaPath(path) || path : ""
  if (normalizedPath) {
    return resolveMediaUrl(normalizedPath)
  }
  const normalizedUrl = url ? toStoredMediaPath(url) : ""
  return resolveMediaUrl(normalizedUrl || url || "")
}

/** Resolve a stored document to a public URL (prefer API url, fallback to path). */
export function resolveDocumentUrl(doc: {
  path?: string | null
  url?: string | null
}): string {
  if (doc.url) {
    return resolveMediaUrl(doc.url)
  }
  return resolveMediaUrl(doc.path)
}

/** Open a public media URL in a new browser tab. */
export function openPublicFile(url: string): void {
  if (!url) return
  window.open(url, "_blank", "noopener,noreferrer")
}

/** Trigger browser download for a public media URL. */
export function downloadPublicFile(url: string, filename = "document"): void {
  if (!url) return
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.target = "_blank"
  a.rel = "noopener noreferrer"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function isImageMime(mime?: string | null, name?: string | null): boolean {
  const m = (mime || "").toLowerCase()
  if (m.startsWith("image/")) return true
  const n = (name || "").toLowerCase()
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(n)
}

/** Strip API origin so only a relative path (or original absolute external URL) is stored. */
export function toStoredMediaPath(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return ""
  const raw = String(pathOrUrl).trim()
  if (!raw) return ""

  if (raw.startsWith("data:") || raw.startsWith("blob:")) return ""

  // Already a relative path we own
  if (
    raw.startsWith("product_images/") ||
    raw.startsWith("investment_images/") ||
    raw.startsWith("downloads/") ||
    raw.startsWith("upload/") ||
    raw.startsWith("uploads/") ||
    raw.startsWith("products/")
  ) {
    return raw.replace(/^\/+/, "")
  }

  // Absolute URL — extract our storage/upload path when present so display
  // uses current API_URL (avoids stale APP_URL hosts breaking buyer chat).
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      let pathname = u.pathname.replace(/^\/+/, "")
      if (pathname.startsWith("storage/")) {
        pathname = pathname.slice("storage/".length)
      }
      if (
        pathname.startsWith("upload/") ||
        pathname.startsWith("uploads/") ||
        pathname.startsWith("downloads/") ||
        pathname.startsWith("products/") ||
        pathname.startsWith("product_images/") ||
        pathname.startsWith("investment_images/")
      ) {
        return pathname
      }
      const apiHost = new URL(apiOrigin()).host
      if (u.host === apiHost || u.host === "localhost" || u.host === "127.0.0.1") {
        return pathname
      }
    } catch {
      /* fall through */
    }
    // External absolute URL — keep as-is for legacy records
    return raw
  }

  return raw.replace(/^\/+/, "")
}

export async function uploadProductImages(title: string, files: File[]): Promise<string[]> {
  if (!files.length) return []
  const formData = new FormData()
  formData.append("title", title || "product")
  files.forEach((file) => formData.append("images[]", file))

  const res = await api.upload<{ data?: { paths?: string[] }; paths?: string[] }>(
    "/api/admin/products/images",
    formData,
  )
  const paths = res?.data?.paths ?? res?.paths ?? []
  return Array.isArray(paths) ? paths.filter(Boolean) : []
}

export async function uploadInvestmentImage(
  file: File,
  title = "investment",
  projectId?: string | number,
): Promise<{ path: string; url: string }> {
  const formData = new FormData()
  formData.append("image", file)
  formData.append("title", title || "investment")
  if (projectId != null && projectId !== "") {
    formData.append("project_id", String(projectId))
  }

  const res = await api.upload<{ data?: { path?: string; url?: string } }>(
    "/api/admin/investment-projects/images",
    formData,
  )
  const path = res?.data?.path || ""
  const url = res?.data?.url || path
  if (!path) {
    throw new ApiError("Upload did not return a file path", 500)
  }
  return { path, url }
}

export async function uploadSupplierOfferMedia(
  file: File,
  type: "image" | "video" = "image",
): Promise<{ path: string; url: string }> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("type", type)

  const res = await api.upload<{ data?: { path?: string; url?: string } }>(
    "/api/supplier/offers/media",
    formData,
  )
  const path = res?.data?.path || ""
  const url = res?.data?.url || path
  if (!path) {
    throw new ApiError("Upload did not return a file path", 500)
  }
  return { path, url }
}

export interface SupplierOfferSettingsPayload {
  market: "pakistan" | "international"
  certifications: Array<{ id: number | string; label: string; sort_order?: number }>
  packaging_sizes: Array<{ id: number | string; label: string; sort_order?: number }>
  payment_terms: Array<{ id: number | string; label: string; sort_order?: number }>
}

export async function fetchSupplierOfferSettings(): Promise<SupplierOfferSettingsPayload> {
  const res = await api.get<{ data: SupplierOfferSettingsPayload }>("/api/supplier/offer-settings")
  return res?.data || {
    market: "international",
    certifications: [],
    packaging_sizes: [],
    payment_terms: [],
  }
}

/** Normalize currency code / symbol for price labels: `$` or `Rs.` */
export function resolvePriceCurrencySymbol(currency?: unknown, cifRaw?: unknown): string {
  const code = String(currency ?? "").trim().toUpperCase()
  if (code === "PKR" || code === "RS" || code === "RS.") return "Rs."
  if (code === "USD" || code === "$") return "$"

  const cif = String(cifRaw ?? "").trim()
  if (/^rs\.?\s*/i.test(cif) || /^pkr\b/i.test(cif)) return "Rs."
  if (cif.startsWith("$")) return "$"

  return "$"
}

function prefixCurrencyAmount(amount: string, symbol: string): string {
  if (!amount) return ""
  if (/^(\$|rs\.?)/i.test(amount.trim())) return amount.trim()
  return symbol === "Rs." ? `Rs. ${amount}` : `$${amount}`
}

export function formatFobRateLabel(fob: unknown, currencySymbol: string = "$"): string {
  if (fob == null || fob === "") return ""
  const n = Number(fob)
  if (Number.isFinite(n)) return prefixCurrencyAmount(n.toFixed(2), currencySymbol)
  const raw = String(fob).trim()
  if (!raw) return ""
  return prefixCurrencyAmount(raw, currencySymbol)
}

export function formatCifPriceLabel(price: unknown, currencySymbol: string = "$"): string {
  if (price == null || price === "") return ""
  const n = Number(price)
  if (Number.isFinite(n) && n > 0) {
    const amount = n.toLocaleString()
    return currencySymbol === "Rs." ? `Rs. ${amount}/MT` : `$${amount}/MT`
  }
  const raw = String(price).trim()
  if (!raw) return ""
  if (/^(\$|rs\.?)/i.test(raw)) return raw
  return prefixCurrencyAmount(raw.replace(/\/MT$/i, ""), currencySymbol) + (/\/MT$/i.test(raw) ? "/MT" : "")
}

export function formatFobWithCifLabel(
  fob: unknown,
  cifPrice: unknown,
  currencySymbol: string = "$",
): string {
  const fobStr = formatFobRateLabel(fob, currencySymbol)
  const cifStr = formatCifPriceLabel(cifPrice, currencySymbol)
  if (fobStr && cifStr) return `${fobStr} (${cifStr})`
  if (fobStr) return fobStr
  if (cifStr) return cifStr
  return ""
}

export function mapProduct(p: any) {
  if (!p) return null
  const categoryName = typeof p.category === "string" ? p.category : p.category?.name || ""
  const galleryRaw: string[] = Array.isArray(p.media)
    ? p.media.map((m: any) => m.url).filter(Boolean)
    : Array.isArray(p.galleryPaths)
      ? p.galleryPaths.filter(Boolean)
      : Array.isArray(p.galleryUrls)
        ? p.galleryUrls.filter(Boolean)
        : []
  const imagePath = p.image_url || p.imageUrl || p.imagePath || ""
  // Prefer gallery excluding primary duplicate
  const galleryPaths = galleryRaw
    .map((g: string) => toStoredMediaPath(g) || g)
    .filter((g: string) => g && g !== toStoredMediaPath(imagePath) && g !== imagePath)
  const specs = Array.isArray(p.specs)
    ? p.specs.map((s: any) => ({ label: s.label, value: s.value }))
    : []

  const resolvedPrimary = resolveMediaUrl(imagePath)
  const resolvedGallery = galleryPaths.map(resolveMediaUrl).filter(Boolean)

  const categoryId = p.category_id ?? p.categoryId ?? p.category?.id ?? null

  const rawFob = p.fob
  const currencySymbol = resolvePriceCurrencySymbol(p.currency, rawFob)
  const fobRate = formatFobRateLabel(rawFob, currencySymbol)
  // CIF/CFR catalog price is deprecated — listings show FOB only
  const fobDisplay = fobRate

  return {
    id: String(p.id),
    name: p.name,
    category: categoryName,
    categoryId: categoryId != null && categoryId !== "" ? Number(categoryId) : null,
    sku: p.sku || "",
    price: fobDisplay || "",
    currency: p.currency || undefined,
    fobRate: fobRate || undefined,
    cifPrice: undefined,
    fobDisplay: fobDisplay || undefined,
    fob: rawFob != null ? String(rawFob) : undefined,
    minOrder: p.min_order || p.moq || "",
    moq: p.moq || p.min_order || "",
    origin: p.origin || "",
    status: p.status || "approved",
    stock: p.stock ?? "",
    rating: Number(p.rating || 0),
    orders: Number(p.orders || 0),
    description: p.description || "",
    shortDescription: p.short_description || p.shortDescription || "",
    incoterms: p.incoterms || "",
    videoUrl: p.video_url || p.videoUrl || "",
    imagePath: toStoredMediaPath(imagePath) || imagePath || "",
    imageUrl: resolvedPrimary,
    labReportPath: toStoredMediaPath(p.lab_report_path || p.labReportPath) || p.lab_report_path || p.labReportPath || "",
    labReportUrl: resolveMediaUrl(p.lab_report_url || p.lab_report_path || p.labReportUrl || p.labReportPath) || "",
    hasLabReport: Boolean(
      toStoredMediaPath(p.lab_report_path || p.labReportPath)
      || p.lab_report_path
      || p.labReportPath
    ),
    slug: p.slug || "",
    featured: Boolean(p.featured),
    hsCode: p.hs_code || p.hsCode || "",
    leadTime: p.lead_time || p.leadTime || "",
    shelfLife: p.shelf_life || p.shelfLife || "",
    storageInstructions: p.storage_instructions || p.storageInstructions || "",
    specs,
    certifications: p.certifications || [],
    paymentTerms: p.payment_terms || p.paymentTerms || [],
    deliveryTerms: p.delivery_terms || p.deliveryTerms || [],
    packagingOptions: p.packaging_options || p.packagingOptions || [],
    exportMarkets: p.export_markets || p.exportMarkets || [],
    galleryPaths,
    galleryUrls: resolvedGallery.length
      ? resolvedGallery
      : (resolvedPrimary ? [resolvedPrimary] : []),
  }
}
