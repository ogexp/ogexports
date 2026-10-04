/**
 * notify — lightweight global alert helper
 * Works outside React components (no hook call needed).
 * Usage:  import { notify } from "@/lib/notify"
 *         notify.success("Saved!", "Your changes have been applied.")
 *         notify.error("Failed", "Please try again.")
 */
import { toast } from "@/hooks/use-toast"

export const notify = {
  success: (title: string, description?: string) =>
    toast({ title, description, variant: "success" }),

  error: (title: string, description?: string) =>
    toast({ title, description, variant: "error" }),

  warning: (title: string, description?: string) =>
    toast({ title, description, variant: "warning" }),

  info: (title: string, description?: string) =>
    toast({ title, description, variant: "info" }),

  loading: (title: string, description?: string) =>
    toast({ title, description, variant: "loading" }),
}
