import { useLocation } from "wouter"
import AdminInvestments, { type InvestmentSectionType } from "./AdminInvestments"

const SECTION_ROUTES = {
  "/admin/fresh-produce": {
    section: "produce" as InvestmentSectionType,
    title: "Fresh Produce Management",
    subtitle: "Manage fresh produce investment opportunities",
  },
  "/admin/pending-withdrawals": {
    section: "withdrawals" as InvestmentSectionType,
    title: "Pending Withdrawals",
    subtitle: "Review and approve investor withdrawal requests",
  },
} as const

export default function AdminInvestmentSections() {
  const [location] = useLocation()
  const route = SECTION_ROUTES[location.split("?")[0] as keyof typeof SECTION_ROUTES]

  if (!route) return null

  return (
    <AdminInvestments
      initialSection={route.section}
      title={route.title}
      subtitle={route.subtitle}
    />
  )
}
