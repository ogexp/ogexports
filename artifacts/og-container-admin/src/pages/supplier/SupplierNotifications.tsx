import { SupplierPortalLayout } from "@/components/supplier/SupplierPortalLayout"
import { PortalNotificationsPage } from "@/components/portal/PortalNotificationsPage"

export default function SupplierNotifications() {
  return (
    <SupplierPortalLayout title="Notifications" subtitle="Approvals, offers, and account alerts">
      <PortalNotificationsPage
        apiBase="/api/notifications"
        queryKey={["supplier", "notifications"]}
        title="Supplier notifications"
      />
    </SupplierPortalLayout>
  )
}
