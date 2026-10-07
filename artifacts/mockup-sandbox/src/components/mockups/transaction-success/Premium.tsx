import "./_group.css";
import { Clock3 } from "lucide-react";

export function Premium() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-8 text-foreground">
      <div aria-hidden="true" className="absolute inset-0 flex justify-center px-5 pt-20">
        <div className="w-full max-w-sm space-y-4 opacity-55 blur-[1px]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">OG Exports · Wallet</p>
          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Available balance</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">••••••</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Recent activity</p>
            <p className="mt-3 text-xs text-muted-foreground">Wallet and withdrawal updates</p>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-[#102019]/40 backdrop-blur-[3px]" />

      <section
        aria-label="Withdrawal request received"
        aria-live="polite"
        className="og-success-motion relative w-full max-w-[410px] overflow-hidden rounded-[28px] border border-border/80 bg-card shadow-[0_28px_90px_rgba(17,38,29,0.24)]"
        style={{ animation: "og-success-enter 340ms cubic-bezier(.2,.75,.25,1) both" }}
      >
        <div aria-hidden="true" className="h-[3px] bg-gradient-to-r from-primary/40 via-accent to-primary/40" />
        <div className="px-7 pb-7 pt-8 text-center sm:px-9">
          <div className="relative mx-auto flex h-[74px] w-[74px] items-center justify-center">
            <div
              aria-hidden="true"
              className="og-success-motion absolute inset-0 rounded-full border border-[#BB9C63]/45"
              style={{ animation: "og-success-ripple 900ms ease-out 100ms both" }}
            />
            <div className="relative flex h-[54px] w-[54px] items-center justify-center rounded-[20px] border border-[#BB9C63]/25 bg-[#F3EFE4] text-[#806B45] shadow-[0_8px_24px_rgba(128,107,69,0.12)]">
              <Clock3 size={25} strokeWidth={1.8} />
            </div>
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Withdrawal update
          </p>
          <h1 className="mt-2 font-heading text-[23px] font-semibold leading-tight tracking-[-0.025em]">
            Withdrawal request received
          </h1>
          <p className="mx-auto mt-3 max-w-[320px] text-[13px] leading-[1.65] text-muted-foreground">
            OG Exports received your request. This does not confirm that funds have been transferred.
          </p>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/75 px-4 py-3.5 text-left">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Request status</p>
              <p className="mt-1 text-sm font-semibold">Submitted</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BB9C63]/30 bg-[#F3EFE4] px-3 py-1.5 text-[11px] font-semibold text-[#705B37]">
              <Clock3 size={13} strokeWidth={2} />
              In progress
            </span>
          </div>

          <button
            type="button"
            className="mt-6 min-h-[50px] w-full rounded-[15px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(49,99,76,0.18)] transition-transform active:scale-[0.985]"
          >
            Continue
          </button>
          <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
            The latest server status remains the source of truth.
          </p>
        </div>
      </section>
    </main>
  );
}
