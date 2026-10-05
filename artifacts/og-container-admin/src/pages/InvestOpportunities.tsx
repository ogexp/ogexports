import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import Invest from "@/pages/Invest"

export default function InvestOpportunities() {
  return (
    <InvestPortalLayout
      title="Browse Opportunities"
      subtitle="Review current investment projects, published documents, and terms returned by the investor records."
    >
      <Invest embedded />
    </InvestPortalLayout>
  )
}
