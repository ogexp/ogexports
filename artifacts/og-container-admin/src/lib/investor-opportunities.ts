import { api, unwrapPage } from "@/lib/api"
import { mapInvestProject, type AdminInvestProject } from "@/lib/admin-data"

export type OpportunitySource = "public" | "investor"

export async function fetchInvestorOpportunities(
  source: OpportunitySource,
): Promise<AdminInvestProject[]> {
  const endpoint = source === "investor" ? "/api/investor/projects" : "/api/investments"

  const loadPage = async (page: number) => {
    const options = { per_page: 100, page }
    const payload = source === "investor"
      ? await api.get(endpoint, options)
      : await api.publicGet(endpoint, options)

    const hasListEnvelope = Array.isArray(payload)
      || Array.isArray((payload as any)?.data)
      || Array.isArray((payload as any)?.data?.data)
      || Array.isArray((payload as any)?.items)
    if (!hasListEnvelope) {
      throw new Error("The opportunities response was not a list.")
    }

    return unwrapPage<any>(payload)
  }

  const firstPage = await loadPage(1)
  const lastPage = Number.isFinite(firstPage.meta.last_page)
    ? Math.max(1, firstPage.meta.last_page)
    : 1
  const laterPages = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, index) => loadPage(index + 2)),
  )

  return [...firstPage.data, ...laterPages.flatMap(page => page.data)]
    .map(mapInvestProject)
}
