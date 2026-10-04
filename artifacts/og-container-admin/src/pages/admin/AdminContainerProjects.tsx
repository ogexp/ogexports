import { AdminLayout } from "@/components/admin/AdminLayout"
import { ContainerProjectsPanel } from "@/components/admin/ContainerProjectsPanel"

export default function AdminContainerProjects() {
  return (
    <AdminLayout
      title="Container Projects"
      subtitle="Manage container export investment projects and lifecycle status"
    >
      <ContainerProjectsPanel />
    </AdminLayout>
  )
}
