import "./_group.css";
import { Check } from "lucide-react";

export function Current() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6 text-foreground">
      <div aria-hidden="true" className="absolute inset-0 flex items-start justify-center px-5 pt-24">
        <div className="w-full max-w-sm space-y-4 opacity-55">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">OG Exports · Wallet</p>
          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Available balance</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">••••••</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Recent activity</p>
            <p className="mt-3 text-xs text-muted-foreground">Deposit requests and wallet records</p>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(8,18,13,0.32)]" />
      <section
        aria-label="Deposit request submitted"
        className="relative flex w-full max-w-[390px] flex-col items-center rounded-[24px] border border-border bg-card p-[23px] text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#E6EFE9] text-[#31634C]">
          <Check size={23} strokeWidth={2.2} />
        </div>
        <h1 className="mt-[15px] text-[19px] font-bold leading-6">Deposit request submitted</h1>
        <p className="mt-[7px] text-[13px] leading-5 text-muted-foreground">
          Your deposit request was received. Its server status and wallet credit are shown on the confirmation screen.
        </p>
        <button type="button" className="mt-5 min-h-12 w-full rounded-[14px] bg-primary text-sm font-bold text-primary-foreground">
          Continue
        </button>
      </section>
    </main>
  );
}
