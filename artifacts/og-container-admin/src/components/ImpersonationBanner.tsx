import { Shield, LogOut } from "lucide-react"
import { useLocation } from "wouter"
import { useSafeAuth } from "@/lib/use-safe-auth"

const EMERALD = "#0F3D2E"

export function ImpersonationBanner() {
  const { impersonating, impersonatorName, stopImpersonating } = useSafeAuth()
  const [, setLocation] = useLocation()

  if (!impersonating) return null

  async function handleReturn() {
    const res = await stopImpersonating?.()
    if (res?.success) setLocation(res.redirect || "/admin/dashboard")
  }

  return (
    <div
      className="px-4 py-2.5 flex items-center justify-between gap-3 border-b shrink-0"
      style={{ background: "#fffbeb", borderColor: "#fde68a" }}
    >
      <div className="flex items-center gap-2 text-sm min-w-0">
        <Shield className="w-4 h-4 shrink-0" style={{ color: EMERALD }} />
        <span className="truncate">
          Viewing as user{impersonatorName ? ` · Admin: ${impersonatorName}` : ""}
        </span>
      </div>
      <button
        type="button"
        onClick={handleReturn}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0"
        style={{ background: EMERALD }}
      >
        <LogOut className="w-3.5 h-3.5" /> Return to Admin Panel
      </button>
    </div>
  )
}
