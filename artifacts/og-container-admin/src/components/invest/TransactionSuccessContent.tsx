import { motion, useReducedMotion } from "framer-motion"
import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"

export type TransactionSuccessTone = "confirmed" | "approved" | "submitted" | "attention"

type TransactionSuccessContentProps = {
  title: string
  description: string
  tone: TransactionSuccessTone
  status?: string | null
  reference?: string | null
  context?: string
}

const toneStyles: Record<TransactionSuccessTone, {
  icon: typeof CheckCircle2
  mark: string
  ripple: string
  status: string
}> = {
  confirmed: {
    icon: CheckCircle2,
    mark: "border-emerald-600/15 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
    ripple: "border-emerald-600/35",
    status: "border-emerald-600/20 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
  },
  approved: {
    icon: CheckCircle2,
    mark: "border-amber-600/20 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    ripple: "border-amber-600/35",
    status: "border-amber-600/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  submitted: {
    icon: Clock3,
    mark: "border-accent/25 bg-accent/15 text-foreground",
    ripple: "border-accent/40",
    status: "border-accent/30 bg-accent/15 text-foreground",
  },
  attention: {
    icon: AlertCircle,
    mark: "border-destructive/15 bg-destructive/10 text-destructive",
    ripple: "border-destructive/30",
    status: "border-destructive/20 bg-destructive/10 text-destructive",
  },
}

export function TransactionSuccessContent({
  title,
  description,
  tone,
  status,
  reference,
  context,
}: TransactionSuccessContentProps) {
  const reduceMotion = useReducedMotion() === true
  const style = toneStyles[tone]
  const Icon = style.icon
  const cleanStatus = status?.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
  const cleanReference = reference?.trim()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
      className="flex flex-col items-center text-center"
      aria-live="polite"
    >
      <div className="relative mb-5 flex h-[76px] w-[76px] items-center justify-center">
        <motion.span
          aria-hidden="true"
          initial={reduceMotion ? false : { opacity: 0.42, scale: 0.78 }}
          animate={reduceMotion ? { opacity: 0, scale: 1 } : { opacity: 0, scale: 1.42 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: "easeOut" }}
          className={`absolute h-[58px] w-[58px] rounded-full border ${style.ripple}`}
        />
        <motion.span
          initial={reduceMotion ? false : { opacity: 0, scale: 0.78 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 20 }}
          className={`relative flex h-[54px] w-[54px] items-center justify-center rounded-[20px] border shadow-sm ${style.mark}`}
        >
          <Icon className="h-7 w-7" strokeWidth={1.8} />
        </motion.span>
      </div>

      {context ? (
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {context}
        </p>
      ) : null}
      <DialogTitle className="font-heading text-xl font-semibold leading-tight tracking-[-0.02em]">
        {title}
      </DialogTitle>
      <DialogDescription className="mx-auto mt-2 max-w-sm text-[13px] leading-5">
        {description}
      </DialogDescription>

      {cleanStatus || cleanReference ? (
        <div className="mt-5 w-full rounded-2xl border border-border/80 bg-background/75 px-4 text-left">
          {cleanStatus ? (
            <div className={`flex min-h-11 items-center justify-between gap-3 ${cleanReference ? "border-b border-border/70" : ""}`}>
              <span className="text-xs text-muted-foreground">Server status</span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.status}`}>
                {cleanStatus}
              </span>
            </div>
          ) : null}
          {cleanReference ? (
            <div className="flex min-h-11 items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Reference</span>
              <span className="break-all text-right font-mono text-xs font-semibold text-foreground">
                {cleanReference}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  )
}
