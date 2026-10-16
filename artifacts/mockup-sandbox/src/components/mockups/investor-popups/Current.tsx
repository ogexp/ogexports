import "./_group.css";
import { Check } from "lucide-react";

export function Current() {
  return (
    <main className="investor-popup popup-scene">
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
      <section aria-label="Deposit request received" role="alert" className="current-sheet">
        <div className="current-mark" aria-hidden="true"><Check strokeWidth={2.2} /></div>
        <h1 className="current-title">Deposit request received</h1>
        <p className="current-copy">
          Your deposit request is under review. Your wallet balance will update when the deposit is credited.
        </p>
        <div className="current-details" aria-label="Request details">
          <div className="current-row">
            <span className="current-row-label">Status</span>
            <span className="current-row-value">Under review</span>
          </div>
        </div>
        <button type="button" className="current-button" aria-label="Continue">Continue</button>
      </section>
    </main>
  );
}
