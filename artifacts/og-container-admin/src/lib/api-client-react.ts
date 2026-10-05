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
  entityType?: "individual" | "company"
  kycStatus: "unsubmitted" | "pending" | "verified" | "rejected"
}

export interface KycSubmission {
  id: string
  status: "pending" | "review" | "approved" | "rejected"
  type: string
  submittedAt: string
  reviewerNotes?: string
}

export interface KycStatusResponse {
  latestSubmission: KycSubmission | null
}

export interface Testimonial {
  id: string
  name: string
  role: string
  content: string
  avatar?: string
  rating?: number
  quote?: string
  authorName?: string
  company?: string
  country?: string
}

export interface Faq {
  id: string
  question: string
  answer: string
  category: string
}

export interface NewsArticle {
  id: string
  title: string
  summary: string
  content: string
  publishedAt: string
  imageUrl?: string
  category?: string
  excerpt?: string
}

export interface BuyerAnalytics {
  orders_total: number
  spend_total: number
  rfqs_total: number
  quotations_accepted: number
  spend_by_month: Array<{ month: string; total: number }>
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
      const latestKyc = u.latestKycApplication || null
      const kycType = latestKyc?.type
      const kycRawStatus = String(latestKyc?.status || "").toLowerCase()
      return {
        id: String(u.id),
        email: u.email,
        fullName: u.fullName || u.name,
        accountType: u.accountType || u.account_type,
        phone: u.phone,
        entityType: kycType === "individual" || kycType === "company" ? kycType : undefined,
        kycStatus:
          kycRawStatus === "approved" ? "verified"
          : kycRawStatus === "pending" || kycRawStatus === "review" ? "pending"
          : kycRawStatus === "rejected" ? "rejected"
          : "unsubmitted",
      } as Me
    },
    retry: false,
  })
}

export function useGetKycStatus(options?: { query?: { enabled?: boolean; queryKey?: readonly unknown[] } }) {
  return useQuery({
    queryKey: options?.query?.queryKey || ["kyc-status"],
    enabled: options?.query?.enabled ?? true,
    queryFn: async () => {
      try {
        const res = await api.get<any>("/api/investor/kyc")
        const row = unwrapList(res)[0] || null
        if (!row) return { latestSubmission: null } satisfies KycStatusResponse
        return {
          latestSubmission: {
            id: String(row.id),
            status: row.status === "approved" || row.status === "rejected" || row.status === "review"
              ? row.status
              : "pending",
            type: String(row.type || ""),
            submittedAt: row.submitted_at || row.submittedAt || "",
            reviewerNotes: row.reviewer_notes || row.reviewerNotes || undefined,
          },
        } satisfies KycStatusResponse
      } catch {
        return { latestSubmission: null } satisfies KycStatusResponse
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
        category: f.category || "General",
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
      const response = await api.get<{ data: BuyerAnalytics }>("/api/buyer/analytics")
      return response?.data ?? null
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
  return useUnsupportedMutation<{ data: { accountType: string; entityType: string } }>()
}
export function useStartIndividualKyc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { data: {
      dateOfBirth: string
      nationality: string
      residentialAddress: string
      proofOfAddressObjectPath: string
    } }) => {
      const { proofOfAddressObjectPath, ...payload } = vars.data
      return api.post("/api/investor/kyc", {
        type: "individual",
        payload,
        documents: [{ doc_type: "proof_of_address", path: proofOfAddressObjectPath }],
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] })
      await queryClient.invalidateQueries({ queryKey: ["kyc-status"] })
    },
  })
}
export function useSubmitCompanyKyc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { data: Record<string, string> }) => {
      const {
        registrationCertObjectPath,
        taxCertObjectPath,
        businessLicenseObjectPath,
        importExportLicenseObjectPath,
        ...payload
      } = vars.data
      const documents = [
        { doc_type: "registration_certificate", path: registrationCertObjectPath },
        { doc_type: "tax_registration_certificate", path: taxCertObjectPath },
        { doc_type: "business_license", path: businessLicenseObjectPath },
        { doc_type: "import_export_license", path: importExportLicenseObjectPath },
      ].filter((document) => Boolean(document.path))

      return api.post("/api/investor/kyc", {
        type: "company",
        country: vars.data.country,
        payload,
        documents,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] })
      await queryClient.invalidateQueries({ queryKey: ["kyc-status"] })
    },
  })
}
export function useCreateContract() {
  return useUnsupportedMutation<{ data: { orderId: number; title: string; documentObjectPath?: string } }>()
}
export function useUpdateContractStatus() {
  return useUnsupportedMutation<{ id: number; data: { status: string } }>()
}
export function useCreateInvoice() {
  return useUnsupportedMutation<{ data: { orderId: number; invoiceNumber: string; amount: number; currency: string } }>()
}
export function usePayInvoice() {
  return useUnsupportedMutation<{ id: number; data: { method: string; reference: string } }>()
}
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
export function useUpdateOrderStatus() {
  return useUnsupportedMutation<{ id: number; data: { status: string } }>()
}
export function useCreateShipment() { return useUnsupportedMutation<{ data: Record<string, unknown> }>() }
export function useUpdateShipment() {
  return useUnsupportedMutation<{ id: number; data: Record<string, unknown> }>()
}
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

function useUnsupportedMutation<TVariables>() {
  return useMutation<never, Error, TVariables>({
    mutationFn: async (_variables: TVariables): Promise<never> => {
      throw new Error("This operation is not available on the connected API.")
    },
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
