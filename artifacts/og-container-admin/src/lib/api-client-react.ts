import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  api,
  unwrapList,
  unwrapPage,
  mapProduct,
  resolvePriceCurrencySymbol,
  formatFobRateLabel,
  formatCifPriceLabel,
  formatFobWithCifLabel,
  ensureCsrf,
} from "./api"

export interface Me {
  id: string
  email: string
  fullName: string
  accountType: "buyer" | "supplier" | "investor" | "admin"
  phone?: string
}

export interface KycSubmission {
  id: string
  status: "pending" | "approved" | "rejected"
  type: "individual" | "company"
  submittedAt: string
}

export interface Testimonial {
  id: string
  name: string
  role: string
  content: string
  avatar?: string
}

export interface Faq {
  id: string
  question: string
  answer: string
}

export interface NewsArticle {
  id: string
  title: string
  summary: string
  content: string
  publishedAt: string
  imageUrl?: string
}

export interface Certification {
  id: string
  name: string
  issuer: string
  imageUrl?: string
}

export function getGetMeQueryKey() {
  return ["me"] as const
}

export function useGetMe(options?: { query?: { enabled?: boolean; queryKey?: readonly unknown[] } }) {
  return useQuery({
    queryKey: options?.query?.queryKey || getGetMeQueryKey(),
    enabled: options?.query?.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<any>("/api/me")
      const u = res?.data || res
      return {
        id: String(u.id),
        email: u.email,
        fullName: u.fullName || u.name,
        accountType: u.accountType || u.account_type,
        phone: u.phone,
      } as Me
    },
    retry: false,
  })
}

export function useGetKycStatus(options?: { query?: { enabled?: boolean } }) {
  return useQuery({
    queryKey: ["kyc-status"],
    enabled: options?.query?.enabled ?? true,
    queryFn: async () => {
      try {
        const res = await api.get<any>("/api/investor/kyc")
        const row = unwrapList(res)[0] || res?.data || null
        if (!row) return null
        return {
          id: String(row.id),
          status: row.status === "approved" ? "approved" : row.status === "rejected" ? "rejected" : "pending",
          type: row.type || "individual",
          submittedAt: row.submitted_at || row.submittedAt || "",
        } as KycSubmission
      } catch {
        return null
      }
    },
    retry: false,
  })
}

export function useListFaqs() {
  return useQuery({
    queryKey: ["faqs"],
    queryFn: async () => {
      const res = await api.get<any>("/api/faqs")
      return unwrapList(res).map((f: any) => ({
        id: String(f.id),
        question: f.question,
        answer: f.answer,
      })) as Faq[]
    },
  })
}

export function useListNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/api/investor/notifications")
        return unwrapList(res)
      } catch {
        return []
      }
    },
  })
}

export function useInvestorNotifications() {
  return useQuery({
    queryKey: ["investor", "notifications"],
    queryFn: async () => {
      const res = await api.get<any>("/api/investor/notifications")
      return unwrapPage(res).data
    },
  })
}

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: ["investor", "notifications-unread"],
    queryFn: async () => {
      const res = await api.get<{ data: { unread_count: number } }>("/api/investor/notifications/unread-count")
      return res?.data?.unread_count ?? 0
    },
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.post(`/api/investor/notifications/${id}/read`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investor", "notifications"] })
      void queryClient.invalidateQueries({ queryKey: ["investor", "notifications-unread"] })
      void queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post("/api/investor/notifications/read-all")
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investor", "notifications"] })
      void queryClient.invalidateQueries({ queryKey: ["investor", "notifications-unread"] })
      void queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
    },
  })
}

export function useListOrders() {
  return useQuery({
    queryKey: ["buyer-orders"],
    queryFn: async () => {
      const res = await api.get<any>("/api/buyer/orders")
      return unwrapPage(res).data
    },
  })
}

export function useListContracts() { return useQuery({ queryKey: ["contracts"], queryFn: async () => [] }) }
export function useListInvoices() { return useQuery({ queryKey: ["invoices"], queryFn: async () => [] }) }
export function useListPayments() {
  return useQuery({
    queryKey: ["buyer-payments"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/api/buyer/payments")
        return unwrapList(res)
      } catch { return [] }
    },
  })
}
export function useListShipments() {
  return useQuery({
    queryKey: ["buyer-shipments"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/api/buyer/shipments")
        return unwrapPage(res).data
      } catch { return [] }
    },
  })
}
export function useListMyListings() {
  return useQuery({
    queryKey: ["supplier-offers"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/api/supplier/offers")
        return unwrapPage(res).data
      } catch { return [] }
    },
  })
}
export function useListProductCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get<any>("/api/categories")
      return unwrapList(res)
    },
  })
}
export function useListRfqs() {
  return useQuery({
    queryKey: ["buyer-rfqs"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/api/buyer/rfqs")
        return unwrapPage(res).data
      } catch { return [] }
    },
  })
}
export function useListRfqMessages(_id: string | number) {
  return useQuery({
    queryKey: ["rfq-messages", _id],
    queryFn: async () => {
      try {
        const res = await api.get<any>(`/api/buyer/rfqs/${_id}/messages`)
        return unwrapList(res)
      } catch {
        return []
      }
    },
    enabled: !!_id,
  })
}
export function useAcceptRfq() {
  return useMutation({
    mutationFn: async (vars: { id: string | number; data?: any }) =>
      api.post(`/api/buyer/rfqs/${vars.id}/accept`, vars.data || {}),
  })
}
export function useDeclineRfq() {
  return useMutation({
    mutationFn: async (vars: { id: string | number; data?: any }) =>
      api.post(`/api/buyer/rfqs/${vars.id}/decline`, vars.data || {}),
  })
}
export function useCloseRfq() {
  return useMutation({
    mutationFn: async (vars: { id: string | number; data?: any }) =>
      api.post(`/api/buyer/rfqs/${vars.id}/close`, vars.data || {}),
  })
}
export function useQuoteRfq() {
  return useMutation({
    mutationFn: async (vars: { id: string | number; data?: any }) =>
      api.post(`/api/buyer/rfqs/${vars.id}/quote`, vars.data || {}),
  })
}
export function useCreateRfqMessage() {
  return useMutation({
    mutationFn: async (vars: { id: string | number; data?: any }) =>
      api.post(`/api/buyer/rfqs/${vars.id}/messages`, vars.data || {}),
  })
}
export function useListSupportTickets() {
  return useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/api/support/tickets")
        return unwrapList(res)
      } catch { return [] }
    },
  })
}
export function useListSupportTicketMessages(id: string) {
  return useQuery({
    queryKey: ["support-ticket", id],
    queryFn: async () => {
      const res = await api.get<any>(`/api/support/tickets/${id}`)
      return res?.messages || res?.data?.messages || []
    },
    enabled: !!id,
  })
}

export function useGetPortalAnalytics() {
  return useQuery({
    queryKey: ["buyer-analytics"],
    queryFn: async () => {
      try { return await api.get("/api/buyer/analytics") } catch { return null }
    },
  })
}

export function useCreateContactMessage() {
  return useMutation({
    mutationFn: async (vars: any) => {
      await ensureCsrf()
      return api.post("/api/contact", {
        name: vars.name || vars.fullName,
        email: vars.email,
        phone: vars.phone,
        subject: vars.subject,
        message: vars.message || vars.body,
        type: vars.type || "contact",
        meta: vars.meta,
      })
    },
  })
}

export function useCreatePartnerApplication() {
  return useMutation({
    mutationFn: async (vars: any) => {
      await ensureCsrf()
      return api.post("/api/partner-applications", {
        company: vars.company || vars.companyName,
        contact_name: vars.contactName || vars.name || vars.contact,
        email: vars.email,
        phone: vars.phone,
        type: vars.type,
        payload: vars,
      })
    },
  })
}

export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: async (vars: any) => {
      await ensureCsrf()
      return api.post("/api/newsletter", { email: vars.email || vars })
    },
  })
}

export function useSetAccountType() {
  return useMutation({ mutationFn: async () => ({}) })
}
export function useStartIndividualKyc() {
  return useMutation({
    mutationFn: async (vars: any) => api.post("/api/investor/kyc", { type: "individual", ...vars }),
  })
}
export function useSubmitCompanyKyc() {
  return useMutation({
    mutationFn: async (vars: any) => api.post("/api/investor/kyc", { type: "company", ...vars }),
  })
}
export function useCreateContract() { return useMutation({ mutationFn: async () => ({}) }) }
export function useUpdateContractStatus() { return useMutation({ mutationFn: async () => ({}) }) }
export function useCreateInvoice() { return useMutation({ mutationFn: async () => ({}) }) }
export function usePayInvoice() { return useMutation({ mutationFn: async () => ({}) }) }
export function useCreateListing() {
  return useMutation({
    mutationFn: async (vars: any) => api.post("/api/supplier/offers", vars),
  })
}
export function useUpdateListing() {
  return useMutation({
    mutationFn: async (vars: any) => api.put(`/api/supplier/offers/${vars.id}`, vars),
  })
}
export function useUpdateOrderStatus() { return useMutation({ mutationFn: async () => ({}) }) }
export function useCreateShipment() { return useMutation({ mutationFn: async () => ({}) }) }
export function useUpdateShipment() { return useMutation({ mutationFn: async () => ({}) }) }
export function useCreateSupportTicket() {
  return useMutation({
    mutationFn: async (vars: any) => api.post("/api/support/tickets", vars?.data || vars),
  })
}
export function useUpdateSupportTicketStatus() {
  return useMutation({
    mutationFn: async (vars: { id: string | number; data?: any }) =>
      api.patch(`/api/support/tickets/${vars.id}`, vars.data || {}),
  })
}
export function useCreateSupportTicketMessage() {
  return useMutation({
    mutationFn: async (vars: { id: string | number; data?: any }) =>
      api.post(`/api/support/tickets/${vars.id}/reply`, {
        body: vars.data?.message || vars.data?.body || vars.data,
      }),
  })
}
export function useReplySupportTicket() {
  return useMutation({
    mutationFn: async (vars: any) => api.post(`/api/support/tickets/${vars.id}/reply`, { body: vars.body || vars.message }),
  })
}

// Extra helpers used by dynamic pages
export function useProducts(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const res = await api.get<any>("/api/products", params)
      const page = unwrapPage(res)
      return { ...page, data: page.data.map(mapProduct).filter(Boolean) }
    },
  })
}

export function useProduct(slug?: string) {
  return useQuery({
    queryKey: ["product", slug],
    enabled: !!slug,
    queryFn: async () => {
      const res = await api.get<any>(`/api/products/${slug}`)
      return mapProduct(res?.data || res)
    },
  })
}

export function useCmsSettings() {
  return useQuery({
    queryKey: ["cms-settings"],
    queryFn: async () => api.get<any>("/api/settings"),
  })
}

export {
  mapProduct,
  resolvePriceCurrencySymbol,
  formatFobRateLabel,
  formatCifPriceLabel,
  formatFobWithCifLabel,
  unwrapList,
  unwrapPage,
  api,
  useQueryClient,
}
