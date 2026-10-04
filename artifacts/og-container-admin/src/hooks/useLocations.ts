import { useQuery } from "@tanstack/react-query"
import { api, unwrapList } from "@/lib/api"
import { countryDisplayName, countryNameCandidates } from "@/lib/country-names"

export interface CountryOption {
  id: number
  code: string
  /** Official ISO 3166-1 name as stored in the database. */
  name: string
  /** Short trade name to display, e.g. "United Arab Emirates" instead of "… (the)". */
  label: string
  /** ISO code, official name and common aliases, for dropdown search. */
  searchTerms: string[]
  ports_count: number
}

export interface PortOption {
  id: number
  country_id: number
  unlocode: string
  name: string
  subdivision?: string | null
}

export interface IncotermOption {
  code: string
  label: string | null
  sort_order?: number
}

export interface PaymentMethodOption {
  id: number
  code: string
  label: string
  description: string | null
  badge: string | null
  fields: string[]
  sort_order?: number
}

export function useCountries(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["locations", "countries"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = unwrapList<any>(await api.publicGet("/api/countries"))

      return rows
        .map((raw): CountryOption => {
          const code = String(raw.code || "")
          const name = String(raw.name || "")

          return {
            id: Number(raw.id),
            code,
            name,
            label: countryDisplayName(code, name) || name,
            searchTerms: countryNameCandidates(code, name),
            ports_count: Number(raw.ports_count ?? 0),
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label))
    },
    staleTime: 24 * 60 * 60 * 1000,
    enabled: options?.enabled !== false,
  })
}

export function usePorts(countryId: string | number | null | undefined) {
  const id = Number(countryId)

  return useQuery({
    queryKey: ["locations", "countries", id, "ports"],
    queryFn: async () => unwrapList<PortOption>(
      await api.publicGet(`/api/countries/${id}/ports`),
    ),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useIncoterms() {
  return useQuery({
    queryKey: ["locations", "incoterms"],
    queryFn: async () => unwrapList<IncotermOption>(
      await api.publicGet("/api/incoterms"),
    ),
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["locations", "payment-methods"],
    queryFn: async () => {
      const rows = unwrapList<any>(await api.publicGet("/api/payment-methods"))
      return rows.map((raw): PaymentMethodOption => ({
        id: Number(raw.id),
        code: String(raw.code || ""),
        label: String(raw.label || ""),
        description: raw.description ?? null,
        badge: raw.badge ?? null,
        fields: Array.isArray(raw.fields)
          ? raw.fields.map((f: any) => String(f || "")).filter(Boolean)
          : [],
        sort_order: Number(raw.sort_order ?? 0),
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}
