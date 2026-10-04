import { useEffect, useState } from "react"
import { LayoutGrid, BarChart3 } from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { ContainerProjectsPanel } from "@/components/admin/ContainerProjectsPanel"
import AdminInvestments from "@/pages/admin/AdminInvestments"
import { fetchAdminExchangeRates } from "@/lib/admin-currency"

const EMERALD = "#0F3D2E"

type ContainerView = "projects" | "investments"

const VIEW_CONFIG: Record<ContainerView, { label: string; subtitle: string; icon: typeof LayoutGrid }> = {
  projects: {
    label: "Container Projects",
    subtitle: "Manage container export investment projects and lifecycle status",
    icon: LayoutGrid,
  },
  investments: {
    label: "Container Investments",
    subtitle: "Manage container funding, investors, and deposit approvals",
    icon: BarChart3,
  },
}

function resolveView(): ContainerView {
  const view = new URLSearchParams(window.location.search).get("view")
  return view === "investments" ? "investments" : "projects"
}

export default function AdminContainerInvestments() {
  const [activeView, setActiveView] = useState<ContainerView>(() => resolveView())

  useEffect(() => {
    void fetchAdminExchangeRates()
  }, [])

  function selectView(view: ContainerView) {
    setActiveView(view)
    const url = new URL(window.location.href)
    if (view === "projects") {
      url.searchParams.delete("view")
    } else {
      url.searchParams.set("view", view)
    }
    window.history.replaceState({}, "", url.toString())
  }

  useEffect(() => {
    const syncFromUrl = () => {
      const view = resolveView()
      setActiveView(prev => (prev !== view ? view : prev))
    }
    window.addEventListener("popstate", syncFromUrl)
    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)
    history.pushState = (...args) => { origPush(...args); syncFromUrl() }
    history.replaceState = (...args) => { origReplace(...args); syncFromUrl() }
    return () => {
      window.removeEventListener("popstate", syncFromUrl)
      history.pushState = origPush
      history.replaceState = origReplace
    }
  }, [])

  const current = VIEW_CONFIG[activeView]

  return (
    <AdminLayout
      title="Container Investments"
      subtitle={current.subtitle}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          {(Object.entries(VIEW_CONFIG) as [ContainerView, typeof VIEW_CONFIG.projects][]).map(([view, config]) => {
            const Icon = config.icon
            const selected = activeView === view
            return (
              <button
                key={view}
                type="button"
                title={config.label}
                onClick={() => selectView(view)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all border"
                style={{
                  background: selected ? EMERALD : "transparent",
                  color: selected ? "white" : "#64748b",
                  borderColor: selected ? EMERALD : "#e2e8f0",
                }}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </button>
            )
          })}
        </div>

        {activeView === "projects" ? (
          <ContainerProjectsPanel />
        ) : (
          <AdminInvestments
            embedded
            initialSection="containers"
            title="Container Investments"
            subtitle={current.subtitle}
          />
        )}
      </div>
    </AdminLayout>
  )
}
