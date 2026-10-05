import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Package,
  Ship,
  TrendingUp,
} from 'lucide-react';
import './_group.css';

const steps = [
  ['Funding', 'Complete'],
  ['Investment confirmed', 'Complete'],
  ['Cargo loaded', 'In progress'],
  ['In transit', 'Upcoming'],
  ['Customs clearance', 'Upcoming'],
  ['Settled', 'Upcoming'],
];

const metrics = [
  ['Amount invested', '$200.00', 'USD'],
  ['Expected profit', '$10.00', 'USD'],
  ['ROI', '5.00%', 'Reported'],
  ['Days remaining', '25 days', 'Day 20 of 45'],
  ['Next payout date', 'Oct 31, 2026', 'Reported schedule'],
  ['Total return', '$210.00', 'Reported estimate'],
];

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '21px 0 10px' }}>
    <h2 style={{ margin: 0, fontSize: 15, color: 'var(--og-foreground)' }}>{children}</h2>
    {aside ? <span style={{ color: 'var(--og-muted)', fontSize: 10 }}>{aside}</span> : null}
  </div>;
}

export function InvestmentDetails() {
  return (
    <main className="investor-container-preview" style={{ width: '100%', maxWidth: 402, margin: '0 auto', padding: '44px 16px 72px' }}>
      <button style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 18px', padding: 0, border: 0, background: 'transparent', color: 'var(--og-primary)', font: '700 12px Inter, sans-serif' }}>
        <ArrowLeft size={15} /> My portfolio
      </button>
      <header style={{ marginBottom: 15 }}>
        <p style={{ margin: '0 0 5px', color: 'var(--og-muted)', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>INVESTMENT DETAILS · OGX-26041</p>
        <h1 style={{ margin: 0, fontSize: 25, letterSpacing: -.6 }}>Yellow maize export</h1>
      </header>

      <section style={{ overflow: 'hidden', border: '1px solid var(--og-border)', borderRadius: 20, background: 'var(--og-card)', boxShadow: '0 8px 24px rgba(40, 57, 52, .055)' }}>
        <div style={{ padding: '16px 17px', background: 'var(--og-primary)', color: 'var(--og-primary-foreground)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}><Package size={14} /> REPORTED SHIPMENT</span>
            <span style={{ padding: '5px 9px', borderRadius: 20, background: 'rgba(255,255,255,.16)', fontSize: 10, fontWeight: 700 }}>In transit</span>
          </div>
          <strong style={{ display: 'block', marginTop: 17, fontSize: 20, letterSpacing: .2 }}>OGXU 573536-0 <span style={{ opacity: .78, fontSize: 12 }}>· 20 ft</span></strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12, opacity: .88 }}><Ship size={14} /> MSC VGDV23</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, fontSize: 12, opacity: .88 }}><MapPin size={14} /> Port Qasim → Bejaia</div>
        </div>
        <div style={{ padding: '2px 16px 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 0 13px', borderBottom: '1px solid var(--og-border)' }}>
            <div><span style={{ color: 'var(--og-muted)', fontSize: 10 }}>INVESTED</span><b style={{ display: 'block', marginTop: 4, fontSize: 11 }}>Oct 06, 2026</b></div>
            <div><span style={{ color: 'var(--og-muted)', fontSize: 10 }}>ETD / ETA</span><b style={{ display: 'block', marginTop: 4, fontSize: 11 }}>Oct 10 / Oct 31</b></div>
          </div>
          <SectionTitle aside="Day 20 of 45">Trade progress</SectionTitle>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, color: 'var(--og-muted)', fontSize: 10 }}>
            <span>Investment period</span><b style={{ color: 'var(--og-primary)' }}>44%</b>
          </div>
          <div style={{ height: 6, overflow: 'hidden', borderRadius: 6, background: 'var(--og-secondary)' }}>
            <div style={{ width: '44%', height: '100%', borderRadius: 6, background: 'var(--og-accent)' }} />
          </div>
          <div style={{ marginTop: 15 }}>
            {steps.map(([label, state], index) => {
              const complete = state === 'Complete';
              const active = state === 'In progress';
              return <div key={label} style={{ position: 'relative', display: 'flex', gap: 10, minHeight: 34 }}>
                {index < steps.length - 1 ? <span style={{ position: 'absolute', left: 8, top: 19, bottom: 0, width: 1, background: complete ? 'var(--og-primary)' : 'var(--og-border)' }} /> : null}
                <span style={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center', width: 17, height: 17, flexShrink: 0, borderRadius: '50%', background: complete ? 'var(--og-primary)' : active ? 'var(--og-accent)' : 'var(--og-secondary)', color: complete || active ? 'white' : 'var(--og-muted)' }}>
                  {complete ? <Check size={10} /> : <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />}
                </span>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 6, flex: 1, paddingBottom: 11 }}>
                  <b style={{ fontSize: 11, color: active ? 'var(--og-primary)' : 'var(--og-foreground)' }}>{label}</b>
                  <span style={{ fontSize: 9, color: 'var(--og-muted)' }}>{state}</span>
                </span>
              </div>;
            })}
          </div>
        </div>
      </section>

      <SectionTitle aside="Server-reported amounts">Investment summary</SectionTitle>
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {metrics.map(([label, value, note], index) => (
          <div key={label} style={{ minHeight: 78, padding: '12px 12px 10px', border: '1px solid var(--og-border)', borderRadius: 14, background: 'var(--og-card)' }}>
            <span style={{ color: 'var(--og-muted)', fontSize: 10 }}>{label}</span>
            <strong style={{ display: 'block', marginTop: 5, color: index === 1 ? 'var(--og-primary)' : 'var(--og-foreground)', fontSize: 15 }}>{value}</strong>
            <span style={{ display: 'block', marginTop: 3, color: 'var(--og-muted)', fontSize: 9 }}>{note}</span>
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14, padding: 12, borderRadius: 13, background: 'var(--og-secondary)', color: 'var(--og-muted)' }}>
        <CalendarDays size={15} color="var(--og-primary)" />
        <span style={{ fontSize: 10, lineHeight: 1.45 }}>Milestones, dates, and financial values appear only when reported by OG Exports.</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 17, padding: '13px 2px', borderTop: '1px solid var(--og-border)', color: 'var(--og-muted)', fontSize: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock3 size={13} /> Last update: Oct 06, 2026</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--og-primary)', fontWeight: 700 }}>Documents <TrendingUp size={13} /><ArrowRight size={13} /></span>
      </div>
      <p style={{ margin: '8px 2px', color: 'var(--og-muted)', fontSize: 9 }}>Illustrative preview data — not a live investor record.</p>
    </main>
  );
}
