import { useLocation } from "wouter"
import AdminInvestments from "./AdminInvestments"

const FACILITY_ROUTES = {
  "/admin/processing-plant": {
    facilityType: "plant",
    title: "Processing Plant Management",
  },
  "/admin/rice-mill": {
    facilityType: "ricemill",
    title: "Rice Mill Management",
  },
  "/admin/feed-mill": {
    facilityType: "feed",
    title: "Feed Mill Management",
  },
} as const

export default function AdminFacilityProjects() {
  const [location] = useLocation()
  const route = FACILITY_ROUTES[location.split("?")[0] as keyof typeof FACILITY_ROUTES]

  if (!route) return null

  return (
    <AdminInvestments
      facilityType={route.facilityType}
      title={route.title}
    />
  )
}