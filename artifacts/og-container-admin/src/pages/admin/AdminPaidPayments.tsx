import { useEffect } from "react"
import { useLocation } from "wouter"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Loader2 } from "lucide-react"

/** Legacy route — buyer payments now live under Finance → Buyer Deposits. */
export default function AdminPaidPayments() {
  const [, setLocation] = useLocation()

  useEffect(() => {
    setLocation("/admin/finance?tab=buyer-deposits")
  }, [setLocation])

  return (
    <AdminLayout title="Buyer Deposits" subtitle="Redirecting to Financial Management…">
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" /> Redirecting to Buyer Deposits…
      </div>
    </AdminLayout>
  )
}
