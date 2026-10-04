import { SupplierPortalLayout } from "@/components/supplier/SupplierPortalLayout"
import { SupplierOffersTab } from "@/components/portal/tabs/SupplierOffersTab"
import { Button } from "@/components/ui/button"
import { Link } from "wouter"
import { PlusCircle } from "lucide-react"

export default function SupplierMyOffers() {
  return (
    <SupplierPortalLayout title="My Offers" subtitle="Track the status of your submitted product offers">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-end">
          <Button asChild style={{ background: "linear-gradient(135deg, #0F3D2E, #1a5a40)" }} className="text-white border-0">
            <Link href="/supplier/submit-offer">
              <PlusCircle className="w-4 h-4 mr-2" /> Submit New Offer
            </Link>
          </Button>
        </div>
        <SupplierOffersTab />
      </div>
    </SupplierPortalLayout>
  )
}
