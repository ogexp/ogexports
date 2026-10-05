import React from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import './_group.css';

const card: React.CSSProperties = {
  background: 'var(--og-card)',
  border: '1px solid var(--og-border)',
  borderRadius: 20,
  boxShadow: '0 8px 24px rgba(40, 57, 52, .055)',
};

export function Current() {
  return (
    <main className="investor-container-preview" style={{ width: '100%', maxWidth: 402, margin: '0 auto', padding: '50px 17px 80px' }}>
      <header style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 5px', color: 'var(--og-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>OG EXPORTS · PORTFOLIO</p>
        <h1 style={{ margin: 0, color: 'var(--og-foreground)', fontSize: 26, letterSpacing: -.7 }}>My Portfolio</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--og-muted)', fontSize: 13 }}>Your active investment positions</p>
      </header>

      <section style={{ ...card, padding: 17 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <p style={{ margin: 0, color: 'var(--og-primary)', fontSize: 10, fontWeight: 800, letterSpacing: .8 }}>TRADE #OGX-26041</p>
            <h2 style={{ margin: '8px 0 0', fontSize: 18, lineHeight: 1.3 }}>Yellow maize export</h2>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '7px 0 0', color: 'var(--og-muted)', fontSize: 12 }}>
              <MapPin size={13} /> Port Qasim → Bejaia
            </p>
          </div>
          <span style={{ flexShrink: 0, borderRadius: 20, padding: '5px 9px', background: 'var(--og-success-bg)', color: 'var(--og-primary)', fontSize: 10, fontWeight: 800 }}>Active</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 17, paddingTop: 14, borderTop: '1px solid var(--og-border)' }}>
          <div>
            <p style={{ margin: 0, color: 'var(--og-muted)', fontSize: 10 }}>Investment amount</p>
            <strong style={{ display: 'block', marginTop: 5, fontSize: 17 }}>$200.00</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, color: 'var(--og-muted)', fontSize: 10 }}>Target distribution</p>
            <strong style={{ display: 'block', marginTop: 5, fontSize: 14 }}>$10.00</strong>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 14 }}>
          <span style={{ color: 'var(--og-muted)', fontSize: 10 }}>Trade status <b style={{ display: 'block', marginTop: 4, color: 'var(--og-foreground)', fontSize: 11 }}>In transit</b></span>
          <span style={{ color: 'var(--og-muted)', fontSize: 10, textAlign: 'right' }}>Container status <b style={{ display: 'block', marginTop: 4, color: 'var(--og-foreground)', fontSize: 11 }}>At sea</b></span>
        </div>
        <div style={{ marginTop: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: 'var(--og-muted)', fontSize: 10 }}>
            <span>Trade progress</span><b style={{ color: 'var(--og-primary)' }}>0.00%</b>
          </div>
          <div style={{ height: 6, borderRadius: 5, background: 'var(--og-secondary)' }} />
        </div>
        <button style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16, minHeight: 44, border: 0, borderRadius: 12, background: 'var(--og-success-bg)', color: 'var(--og-primary)', font: '700 12px Inter, sans-serif' }}>
          View Details <ArrowRight size={14} />
        </button>
      </section>

      <p style={{ margin: '13px 3px', color: 'var(--og-muted)', fontSize: 10, lineHeight: 1.5 }}>Current mobile card structure · illustrative preview only</p>
    </main>
  );
}
