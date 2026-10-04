import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import Invest from "@/pages/Invest"

export default function InvestOpportunities() {
  return (
    <InvestPortalLayout
      title="Browse Opportunities"
      subtitle="Co-invest in active export shipments, strategic imports, and expanding infrastructure."
    >
      <Invest embedded />
    </InvestPortalLayout>
  )
}
