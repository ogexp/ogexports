import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { PortalNotificationsPage } from "@/components/portal/PortalNotificationsPage"

export default function BuyerNotifications() {
  return (
    <BuyerPortalLayout title="Notifications" subtitle="Approvals, payments, and account alerts">
      <PortalNotificationsPage
        apiBase="/api/notifications"
        queryKey={["buyer", "notifications"]}
        title="Buyer notifications"
      />
    </BuyerPortalLayout>
  )
}
