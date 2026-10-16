import "./_group.css";
import { Clock3, ShieldCheck } from "lucide-react";

export function Glass() {
  return (
    <main className="investor-popup popup-scene glass-scene">
      <div className="popup-backdrop-content" aria-hidden="true">
        <div className="popup-backdrop-inner">
          <p className="popup-backdrop-kicker">OG Exports · Wallet</p>
          <div className="popup-backdrop-card">
            <p className="popup-backdrop-label">Deposit request</p>
            <p className="popup-backdrop-title">Add funds</p>
            <div className="popup-backdrop-line" />
            <div className="popup-backdrop-line short" />
          </div>
          <div className="popup-backdrop-card">
            <p className="popup-backdrop-label">Recent activity</p>
            <p className="popup-backdrop-title">Deposit requests and wallet records</p>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="popup-dimmer" />
      <section aria-label="Deposit request received" aria-live="polite" className="glass-sheet">
        <div className="glass-topline" />
        <div className="glass-content">
          <div className="glass-brand"><span className="brand-dot" /> OG Exports <span>·</span> Investor account</div>
          <div className="glass-icon" aria-hidden="true"><ShieldCheck strokeWidth={1.8} /></div>
          <p className="glass-eyebrow">Deposit request</p>
          <h1 className="glass-title">We’ve received your request</h1>
          <p className="glass-copy">
            Your deposit is under review. Your wallet balance will update only after the deposit is credited.
          </p>
          <div className="glass-info">
            <div className="glass-info-row">
              <span className="glass-info-label">Request status</span>
              <span className="glass-status"><Clock3 aria-hidden="true" /> Under review</span>
            </div>
            <div className="glass-info-row">
              <span className="glass-info-label">Reference</span>
              <span className="glass-info-value glass-reference">Not provided</span>
            </div>
          </div>
          <div className="glass-actions">
            <button type="button" className="glass-primary">Continue</button>
            <button type="button" className="glass-secondary">View wallet</button>
          </div>
          <p className="glass-footnote">Request received does not mean funds have been credited.</p>
        </div>
      </section>
    </main>
  );
}
