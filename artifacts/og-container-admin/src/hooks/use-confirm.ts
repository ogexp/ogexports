/**
 * useConfirm — hook for promise-based confirm dialogs.
 * The actual dialog UI lives in ConfirmDialog.tsx (provider).
 *
 * Usage:
 *   const { confirm } = useConfirm()
 *   const ok = await confirm({ title: "Delete?", variant: "danger", confirmLabel: "Delete" })
 *   if (ok) deleteItem()
 */
import { createContext, useContext } from "react"

export type ConfirmVariant = "danger" | "warning" | "info" | "default"

export interface ConfirmOptions {
  title: string
  description?: string
  variant?: ConfirmVariant
  confirmLabel?: string
  cancelLabel?: string
}

export interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

export const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: async () => false,
})

export function useConfirm() {
  return useContext(ConfirmContext)
}
