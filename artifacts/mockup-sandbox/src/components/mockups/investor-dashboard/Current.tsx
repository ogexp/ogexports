import React from 'react';
import './_group.css';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  CreditCard,
  FileText,
  Home,
  PieChart,
  Settings,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--og-border)',
  borderRadius: 22,
  padding: 16,
  boxShadow: '0 6px 20px rgba(15, 61, 46, .055)',
};

const sections = ['Dashboard', 'Opportunities', 'Portfolio', 'Wallet', 'Profile'];

function Metric({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div style={{ ...cardStyle, flex: '1 1 42%', minWidth: 138, padding: 15 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--og-muted)', fontSize: 12 }}>
        {title}
        <span style={{ color: 'var(--og-primary)' }}>{icon}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 9 }}>—</div>
      <div style={{ color: 'var(--og-muted)', fontSize: 10, marginTop: 4 }}>Not provided by server</div>
    </div>
  );
}

function SectionTitle({ children, right }: { children: React.ReactNode; right?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 11px' }}>
      <h2 style={{ color: 'var(--og-primary)', fontSize: 16, margin: 0 }}>{children}</h2>
      {right ? <span style={{ color: 'var(--og-primary)', fontSize: 12, fontWeight: 700 }}>{right}</span> : null}
    </div>
  );
}

export function Current() {
  return (
    <main style={{ minHeight: 874, width: '100%', maxWidth: 402, margin: '0 auto', background: '#fbfcfa', padding: '67px 20px 105px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ color: 'var(--og-primary)', fontSize: 27, letterSpacing: -0.6, margin: 0 }}>Good morning, Investor</h1>
          <p style={{ color: 'var(--og-muted)', fontSize: 14, margin: '5px 0 0' }}>Your investment overview</p>
        </div>
        <div style={{ display: 'flex', gap: 16, color: 'var(--og-primary)', paddingTop: 5 }}>
          <Bell size={19} />
          <UserRound size={19} />
        </div>
      </header>

      <section style={{ ...cardStyle, background: 'var(--og-primary)', borderColor: 'var(--og-primary)', color: 'white', padding: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.82, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--og-accent)' }} />
          OG EXPORTS · INVESTOR WALLET
        </div>
        <div style={{ marginTop: 20, opacity: 0.75, fontSize: 12 }}>Total Portfolio</div>
        <div style={{ fontSize: 34, fontWeight: 700, marginTop: 3 }}>—</div>
        <div style={{ height: 1, background: 'rgba(255,255,255,.2)', margin: '17px 0' }} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ opacity: 0.72, fontSize: 11 }}>Available Balance</div>
            <strong style={{ display: 'block', marginTop: 5 }}>—</strong>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,.2)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ opacity: 0.72, fontSize: 11 }}>Invested Capital</div>
            <strong style={{ display: 'block', marginTop: 5 }}>—</strong>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '12px 0 3px' }}>
        <Metric title="Total Returns" icon={<ChartNoAxesColumnIncreasing size={15} />} />
        <Metric title="Active Investments" icon={<BriefcaseBusiness size={15} />} />
      </div>

      <SectionTitle>Quick Actions</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {[
          ['Invest Now', <TrendingUp size={17} />],
          ['Deposit Funds', <CreditCard size={17} />],
          ['Withdraw Funds', <ArrowUpRight size={17} />],
          ['View Portfolio', <PieChart size={17} />],
        ].map(([label, icon]) => (
          <div key={String(label)} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 9, padding: '15px 12px', borderRadius: 15, fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: 'var(--og-primary)' }}>{icon}</span>{label}
          </div>
        ))}
      </div>

      <SectionTitle right="Portfolio">Portfolio Performance</SectionTitle>
      <div style={{ ...cardStyle, minHeight: 174 }}>
        <strong style={{ fontSize: 16 }}>Portfolio value</strong>
        <p style={{ color: 'var(--og-muted)', fontSize: 11, margin: '4px 0 15px' }}>History reported by OG Exports</p>
        <div style={{ display: 'flex', gap: 6 }}>
          {['1D', '1W', '1M', '3M', '1Y', 'All'].map((range, index) => (
            <span key={range} style={{ padding: '7px 10px', borderRadius: 18, background: index === 2 ? 'var(--og-primary)' : 'var(--og-secondary)', color: index === 2 ? 'white' : 'var(--og-muted)', fontSize: 11, fontWeight: 700 }}>{range}</span>
          ))}
        </div>
        <p style={{ color: 'var(--og-muted)', fontSize: 12, margin: '17px 0 0' }}>Portfolio history for this period is not available.</p>
      </div>

      <SectionTitle right="See all">Investment Opportunities</SectionTitle>
      <div style={{ ...cardStyle, color: 'var(--og-muted)', fontSize: 13 }}>No available opportunities</div>

      <SectionTitle right="See all">Recent Transactions</SectionTitle>
      <div style={{ ...cardStyle, color: 'var(--og-muted)', fontSize: 13 }}>Your activity will appear here when returned by the investor service.</div>

      <SectionTitle>Upcoming Payouts</SectionTitle>
      <div style={{ ...cardStyle, display: 'flex', gap: 11, alignItems: 'center' }}>
        <CalendarDays size={18} color="var(--og-primary)" />
        <div>
          <strong style={{ fontSize: 13 }}>Payout schedule</strong>
          <p style={{ color: 'var(--og-muted)', fontSize: 11, lineHeight: 1.5, margin: '4px 0 0' }}>Upcoming payout details are not available from the server.</p>
        </div>
      </div>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 402, margin: '0 auto', background: 'white', borderTop: '1px solid var(--og-border)', display: 'flex', justifyContent: 'space-around', padding: '12px 5px 25px', color: 'var(--og-muted)', fontSize: 9 }}>
        {[Home, TrendingUp, PieChart, Wallet, UserRound].map((Icon, index) => (
          <div key={sections[index]} style={{ display: 'grid', justifyItems: 'center', gap: 4, color: index === 0 ? 'var(--og-primary)' : undefined }}>
            <Icon size={18} />
            {sections[index]}
          </div>
        ))}
      </nav>
    </main>
  );
}