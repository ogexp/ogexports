import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  CircleHelp,
  Home,
  Landmark,
  PieChart,
  Plus,
  Settings,
  TrendingUp,
  UserRound,
  Wallet,
  Wifi,
  X,
} from 'lucide-react';
import './_group.css';

type Destination = {
  title: string;
  path: string;
};

const ranges = ['1D', '1W', '1M', '3M', '1Y', 'All'];

const actions = [
  { label: 'Deposit Funds', path: '/wallet/deposit', icon: Plus },
  { label: 'Invest Now', path: '/(tabs)/opportunities', icon: TrendingUp },
  { label: 'Withdraw Funds', path: '/wallet/withdraw', icon: ArrowUpRight },
  { label: 'View Portfolio', path: '/(tabs)/portfolio', icon: PieChart },
];

const tabs = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Opportunities', path: '/(tabs)/opportunities', icon: TrendingUp },
  { label: 'Portfolio', path: '/(tabs)/portfolio', icon: PieChart },
  { label: 'Wallet', path: '/wallet', icon: Wallet },
  { label: 'Profile', path: '/(tabs)/account', icon: UserRound },
];

function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="og-section-heading">
      <h2>{children}</h2>
      {action ? (
        <button className="og-text-action" onClick={action.onClick} type="button">
          {action.label}
          <ArrowRight size={13} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

function UnavailableValue({ detail = 'Not provided by OG Exports' }: { detail?: string }) {
  return (
    <div className="og-unavailable-value">
      <span>Not available</span>
      <small>{detail}</small>
    </div>
  );
}

export function ScreenshotMatch() {
  const [activeRange, setActiveRange] = useState('1M');
  const [destination, setDestination] = useState<Destination | null>(null);

  const openDestination = (title: string, path: string) => {
    setDestination({ title, path });
  };

  return (
    <main className="og-screen">
      <style>{`
        .og-screen {
          --og-green: #0d6548;
          --og-deep: #094c39;
          --og-ink: #18251f;
          --og-muted: #78837d;
          --og-mint: #eaf3ee;
          --og-line: #e8ece8;
          --og-paper: #fbfcfa;
          min-height: 100dvh;
          width: 100%;
          max-width: 402px;
          margin: 0 auto;
          padding: 0 0 112px;
          background: var(--og-paper);
          color: var(--og-ink);
          font-family: 'DM Sans', 'Avenir Next', sans-serif;
          overflow: hidden;
          position: relative;
        }
        .og-screen * { box-sizing: border-box; }
        .og-status {
          height: 34px;
          padding: 0 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--og-deep);
          color: rgba(255,255,255,.96);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .1px;
        }
        .og-status-icons { display: flex; align-items: center; gap: 5px; }
        .og-status-battery {
          width: 16px; height: 8px; border: 1.4px solid rgba(255,255,255,.9);
          border-radius: 2px; position: relative; margin-left: 1px;
        }
        .og-status-battery:before {
          content: ''; position: absolute; inset: 1px 3px 1px 1px;
          background: rgba(255,255,255,.95); border-radius: 1px;
        }
        .og-status-battery:after {
          content: ''; position: absolute; right: -3px; top: 2px;
          width: 2px; height: 3px; background: rgba(255,255,255,.9); border-radius: 0 2px 2px 0;
        }
        .og-wallet-hero {
          min-height: 310px;
          padding: 20px 21px 45px;
          color: #fff;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 87% 13%, rgba(133,181,88,.24), transparent 31%),
            linear-gradient(145deg, #0a6e4d 0%, #0a6045 48%, #084b38 100%);
          border-radius: 0 0 30px 30px;
        }
        .og-wallet-hero:after {
          content: ''; position: absolute; width: 250px; height: 250px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,.075); right: -126px; top: 88px;
          box-shadow: 0 0 0 22px rgba(255,255,255,.018), 0 0 0 48px rgba(255,255,255,.014);
          pointer-events: none;
        }
        .og-topbar, .og-account-trigger, .og-balance, .og-wallet-rule { position: relative; z-index: 1; }
        .og-topbar { display: flex; align-items: center; justify-content: space-between; }
        .og-brand-welcome { display: flex; align-items: center; gap: 11px; }
        .og-brand-mark {
          display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 auto;
          border: 1px solid rgba(255,255,255,.48); border-radius: 50%;
          background: rgba(255,255,255,.11); color: #f3d99e;
        }
        .og-greeting { font-size: 15px; font-weight: 700; letter-spacing: -.1px; line-height: 1.3; }
        .og-subgreeting { font-size: 11px; color: rgba(255,255,255,.72); margin-top: 3px; }
        .og-header-tools { display: flex; gap: 9px; }
        .og-icon-button {
          width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center;
          background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.12);
          color: white; cursor: pointer; transition: transform .18s ease, background .18s ease;
        }
        .og-icon-button:hover { background: rgba(255,255,255,.2); transform: translateY(-1px); }
        .og-account-trigger {
          display: flex; align-items: center; gap: 8px; margin: 19px auto 0; height: 36px;
          padding: 0 13px; border: 1px solid rgba(255,255,255,.2); border-radius: 999px;
          color: rgba(255,255,255,.95); background: rgba(255,255,255,.11);
          font-size: 11px; font-weight: 700; letter-spacing: .12px; cursor: pointer;
        }
        .og-account-trigger:hover { background: rgba(255,255,255,.17); }
        .og-account-trigger .og-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #d5c187;
        }
        .og-balance { text-align: center; margin-top: 20px; }
        .og-balance-label {
          color: rgba(255,255,255,.72); font-size: 12px; display: inline-flex;
          align-items: center; justify-content: center; gap: 6px;
        }
        .og-balance-main {
          font-size: clamp(28px, 8vw, 35px); line-height: 1.12; margin-top: 7px;
          letter-spacing: -1.1px; font-weight: 700;
        }
        .og-balance-note { color: rgba(255,255,255,.67); font-size: 10px; margin-top: 5px; }
        .og-content { padding: 0 20px; position: relative; z-index: 2; }
        .og-action-dock {
          margin: -31px 0 24px;
          padding: 11px 8px 10px;
          display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 2px;
          background: #fff; border: 1px solid rgba(18,57,40,.06); border-radius: 23px;
          box-shadow: 0 9px 25px rgba(25,55,40,.13);
        }
        .og-dock-action {
          min-width: 0; min-height: 67px; border: 0; background: transparent;
          color: var(--og-ink); display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 6px; padding: 3px 1px; border-radius: 15px;
          cursor: pointer; font: inherit; transition: background .18s ease, transform .18s ease;
        }
        .og-dock-action:hover { background: #f3f7f4; transform: translateY(-1px); }
        .og-dock-icon {
          width: 33px; height: 33px; border-radius: 50%; display: grid; place-items: center;
          color: var(--og-green); background: var(--og-mint);
        }
        .og-dock-action:first-child .og-dock-icon {
          color: white; background: var(--og-green); box-shadow: 0 4px 10px rgba(13,101,72,.2);
        }
        .og-dock-label {
          color: #57635c; font-size: 9px; line-height: 1.15; font-weight: 700;
          text-align: center; max-width: 76px;
        }
        .og-section { margin-top: 24px; }
        .og-section:first-of-type { margin-top: 0; }
        .og-section-heading {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          margin-bottom: 11px;
        }
        .og-section-heading h2 {
          margin: 0; color: #1c2b24; font-size: 16px; line-height: 1.3;
          letter-spacing: -.3px; font-weight: 700;
        }
        .og-text-action {
          display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto;
          padding: 5px 0 5px 6px; background: none; border: 0; color: var(--og-green);
          font: inherit; font-size: 11px; font-weight: 700; cursor: pointer;
        }
        .og-text-action:hover { color: #084a35; }
        .og-empty-card, .og-card {
          background: #fff; border: 1px solid var(--og-line); border-radius: 18px;
          box-shadow: 0 4px 14px rgba(26,54,39,.035);
        }
        .og-empty-card {
          min-height: 78px; display: flex; align-items: center; gap: 12px;
          padding: 14px;
        }
        .og-empty-symbol {
          width: 42px; height: 42px; flex: 0 0 auto; border-radius: 15px;
          display: grid; place-items: center; color: var(--og-green); background: #edf5f0;
        }
        .og-empty-title { color: #26352d; font-size: 12px; font-weight: 700; }
        .og-empty-copy { color: var(--og-muted); font-size: 10px; line-height: 1.5; margin-top: 4px; }
        .og-detail-intro {
          color: var(--og-muted); font-size: 11px; line-height: 1.5; margin: -4px 0 12px;
        }
        .og-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
        .og-stat-card { padding: 14px; min-height: 96px; }
        .og-stat-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
        .og-stat-label { color: #65736b; font-size: 10px; font-weight: 600; }
        .og-stat-icon { color: var(--og-green); }
        .og-stat-value { color: #334239; font-size: 14px; font-weight: 700; margin-top: 13px; }
        .og-stat-detail { color: #929b95; font-size: 9px; margin-top: 4px; }
        .og-performance { padding: 16px 15px 14px; }
        .og-performance-title {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
        }
        .og-performance-title strong { font-size: 13px; color: #27372e; }
        .og-performance-title span { color: #9aa39d; font-size: 9px; }
        .og-range-row { display: flex; justify-content: space-between; gap: 3px; margin-top: 16px; }
        .og-range {
          min-width: 37px; padding: 7px 6px; border: 0; border-radius: 999px;
          background: transparent; color: #829087; font: inherit; font-size: 9px;
          font-weight: 700; cursor: pointer;
        }
        .og-range.is-active { background: var(--og-green); color: #fff; }
        .og-chart-empty {
          height: 81px; margin-top: 14px; border-radius: 12px; background:
            linear-gradient(to bottom, rgba(234,243,238,.32), transparent),
            repeating-linear-gradient(to bottom, transparent 0 25px, #f0f3f0 26px 27px);
          display: flex; align-items: center; justify-content: center;
          color: #849188; font-size: 10px; text-align: center;
        }
        .og-opportunities-empty { padding: 16px; display: flex; align-items: center; gap: 12px; }
        .og-opportunities-empty .og-empty-symbol { background: #f3f5eb; color: #78804e; }
        .og-payout-card { padding: 15px; display: flex; align-items: center; gap: 12px; }
        .og-payout-icon {
          width: 40px; height: 40px; flex: 0 0 auto; display: grid; place-items: center;
          border-radius: 14px; background: #f4f2e9; color: #99864a;
        }
        .og-payout-title { font-size: 12px; font-weight: 700; color: #2b3931; }
        .og-payout-copy { font-size: 10px; color: var(--og-muted); line-height: 1.5; margin-top: 4px; }
        .og-bottom-nav {
          position: fixed; z-index: 10; bottom: calc(13px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%);
          width: calc(100% - 36px); max-width: 368px; padding: 8px 7px;
          display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px;
          background: rgba(255,255,255,.97); border: 1px solid #e9ede9; border-radius: 24px;
          box-shadow: 0 10px 28px rgba(34,55,42,.12); backdrop-filter: blur(14px);
        }
        .og-tab {
          min-width: 0; padding: 5px 1px 2px; border: 0; background: transparent;
          color: #929b95; display: flex; flex-direction: column; align-items: center;
          gap: 4px; font: inherit; cursor: pointer;
        }
        .og-tab-label { font-size: 9px; font-weight: 600; white-space: nowrap; }
        .og-tab.is-active { color: var(--og-green); }
        .og-tab.is-active svg { stroke-width: 2.35; }
        .og-sheet-backdrop {
          position: fixed; z-index: 20; inset: 0; background: rgba(12,32,23,.34);
          display: flex; align-items: flex-end; justify-content: center;
        }
        .og-sheet {
          width: 100%; max-width: 402px; padding: 12px 21px calc(25px + env(safe-area-inset-bottom));
          border-radius: 24px 24px 0 0; background: #fbfcfa; box-shadow: 0 -10px 35px rgba(9,43,28,.17);
          animation: og-sheet-in .2s ease-out both;
        }
        @keyframes og-sheet-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .og-sheet-handle { width: 34px; height: 4px; border-radius: 8px; background: #d9dfda; margin: 0 auto 15px; }
        .og-sheet-head { display: flex; justify-content: space-between; align-items: center; }
        .og-sheet-head h3 { margin: 0; font-size: 16px; color: #203128; }
        .og-sheet-close {
          width: 32px; height: 32px; display: grid; place-items: center; border: 0;
          border-radius: 50%; background: #edf2ee; color: #48564e; cursor: pointer;
        }
        .og-sheet-copy { color: #65736b; font-size: 12px; line-height: 1.55; margin: 13px 0; }
        .og-route-pill {
          display: block; padding: 11px 12px; border: 1px solid #e4ebe5; border-radius: 12px;
          background: #f4f7f4; color: #426051; font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 10px; overflow-wrap: anywhere;
        }
        .og-screen button:focus-visible { outline: 2px solid #d8c58d; outline-offset: 2px; }
        @media (max-width: 360px) {
          .og-content { padding: 0 15px; }
          .og-wallet-hero { padding-left: 17px; padding-right: 17px; }
          .og-action-dock { margin-bottom: 20px; }
          .og-dock-label { font-size: 8px; }
          .og-range { min-width: 32px; }
        }
      `}</style>

      <div className="og-status" aria-label="Device status">
        <span>9:41</span>
        <div className="og-status-icons" aria-hidden="true">
          <span style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 10 }}>
            <i style={{ width: 2, height: 4, background: 'currentColor', borderRadius: 1 }} />
            <i style={{ width: 2, height: 6, background: 'currentColor', borderRadius: 1 }} />
            <i style={{ width: 2, height: 8, background: 'currentColor', borderRadius: 1 }} />
            <i style={{ width: 2, height: 10, background: 'currentColor', borderRadius: 1 }} />
          </span>
          <Wifi size={13} strokeWidth={2.4} />
          <span className="og-status-battery" />
        </div>
      </div>

      <section className="og-wallet-hero" aria-label="Investor wallet balance">
        <div className="og-topbar">
          <div className="og-brand-welcome">
            <div className="og-brand-mark" aria-hidden="true"><Landmark size={19} /></div>
            <div>
              <div className="og-greeting">Hi, Investor</div>
              <div className="og-subgreeting">Good morning</div>
            </div>
          </div>
          <div className="og-header-tools">
            <button
              className="og-icon-button"
              type="button"
              aria-label="Open notifications"
              onClick={() => openDestination('Notifications', '/account/notifications')}
            >
              <Bell size={17} />
            </button>
            <button
              className="og-icon-button"
              type="button"
              aria-label="Open settings"
              onClick={() => openDestination('Settings', '/account/settings')}
            >
              <Settings size={17} />
            </button>
          </div>
        </div>

        <button
          className="og-account-trigger"
          type="button"
          onClick={() => openDestination('Investor account', 'Account selection is not available in this preview')}
        >
          <span className="og-dot" />
          <span>Investor account</span>
          <ChevronDown size={14} />
        </button>

        <div className="og-balance">
          <div className="og-balance-label">Available balance <CircleHelp size={13} /></div>
          <div className="og-balance-main">—</div>
          <div className="og-balance-note">Balance details unavailable right now</div>
        </div>
      </section>

      <div className="og-content">
        <div className="og-action-dock" aria-label="Quick actions">
          {actions.map(({ label, path, icon: Icon }) => (
            <button
              className="og-dock-action"
              key={label}
              type="button"
              onClick={() => openDestination(label, path)}
            >
              <span className="og-dock-icon"><Icon size={17} strokeWidth={2} /></span>
              <span className="og-dock-label">{label}</span>
            </button>
          ))}
        </div>

        <section className="og-section" aria-labelledby="og-activity-title">
          <SectionHeading
            action={{ label: 'See all', onClick: () => openDestination('Transactions', '/account/transactions') }}
          >
            <span id="og-activity-title">Recent Transactions</span>
          </SectionHeading>
          <div className="og-empty-card">
            <div className="og-empty-symbol"><ArrowDownLeft size={19} /></div>
            <div>
              <div className="og-empty-title">No recent activity</div>
              <div className="og-empty-copy">Transactions will appear here when wallet activity is available.</div>
            </div>
          </div>
        </section>

        <section className="og-section" aria-labelledby="og-performance-title">
          <SectionHeading
            action={{ label: 'Portfolio', onClick: () => openDestination('Portfolio', '/(tabs)/portfolio') }}
          >
            <span id="og-performance-title">Portfolio Performance</span>
          </SectionHeading>
          <div className="og-card og-performance">
            <div className="og-performance-title">
              <strong>Portfolio value</strong>
              <span>History reported by OG Exports</span>
            </div>
            <div className="og-range-row" aria-label="Performance period">
              {ranges.map((range) => (
                <button
                  className={`og-range${activeRange === range ? ' is-active' : ''}`}
                  key={range}
                  type="button"
                  aria-pressed={activeRange === range}
                  onClick={() => setActiveRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
            <div className="og-chart-empty" role="status">
              Portfolio history for this period is not available.
            </div>
          </div>
        </section>

        <section className="og-section" aria-labelledby="og-opportunities-title">
          <SectionHeading
            action={{ label: 'See all', onClick: () => openDestination('Investment Opportunities', '/(tabs)/opportunities') }}
          >
            <span id="og-opportunities-title">Investment Opportunities</span>
          </SectionHeading>
          <div className="og-card og-opportunities-empty">
            <div className="og-empty-symbol"><TrendingUp size={18} /></div>
            <div>
              <div className="og-empty-title">No available opportunities</div>
              <div className="og-empty-copy">Opportunities will appear here when provided by OG Exports.</div>
            </div>
          </div>
        </section>

        <section className="og-section" aria-labelledby="og-payout-title">
          <SectionHeading>
            <span id="og-payout-title">Upcoming Payouts</span>
          </SectionHeading>
          <div className="og-card og-payout-card">
            <div className="og-payout-icon"><CalendarDays size={18} /></div>
            <div>
              <div className="og-payout-title">Payout schedule</div>
              <div className="og-payout-copy">Upcoming payout details are not available from the server.</div>
            </div>
          </div>
        </section>

        <section className="og-section" aria-labelledby="og-overview-title">
          <SectionHeading>
            <span id="og-overview-title">Portfolio Overview</span>
          </SectionHeading>
          <p className="og-detail-intro">A clear view of your positions, when account data is available.</p>
          <div className="og-stat-grid">
            <div className="og-card og-stat-card">
              <div className="og-stat-top">
                <span className="og-stat-label">Total Portfolio</span>
                <Landmark className="og-stat-icon" size={15} />
              </div>
              <div className="og-stat-value">Not available</div>
              <div className="og-stat-detail">Not provided by OG Exports</div>
            </div>
            <div className="og-card og-stat-card">
              <div className="og-stat-top">
                <span className="og-stat-label">Invested Capital</span>
                <BriefcaseBusiness className="og-stat-icon" size={15} />
              </div>
              <div className="og-stat-value">Not available</div>
              <div className="og-stat-detail">Not provided by OG Exports</div>
            </div>
            <div className="og-card og-stat-card">
              <div className="og-stat-top">
                <span className="og-stat-label">Total Returns</span>
                <ChartNoAxesColumnIncreasing className="og-stat-icon" size={15} />
              </div>
              <div className="og-stat-value">Not available</div>
              <div className="og-stat-detail">No return data provided</div>
            </div>
            <div className="og-card og-stat-card">
              <div className="og-stat-top">
                <span className="og-stat-label">Active Investments</span>
                <PieChart className="og-stat-icon" size={15} />
              </div>
              <div className="og-stat-value">Not available</div>
              <div className="og-stat-detail">Position count not provided</div>
            </div>
          </div>
        </section>

      </div>

      <nav className="og-bottom-nav" aria-label="Main navigation">
        {tabs.map(({ label, path, icon: Icon }) => (
          <button
            className={`og-tab${label === 'Dashboard' ? ' is-active' : ''}`}
            key={label}
            type="button"
            aria-label={label}
            aria-current={label === 'Dashboard' ? 'page' : undefined}
            onClick={() => label !== 'Dashboard' && openDestination(label, path)}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span className="og-tab-label">{label}</span>
          </button>
        ))}
      </nav>

      {destination ? (
        <div className="og-sheet-backdrop" onClick={() => setDestination(null)} role="presentation">
          <section
            className="og-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="og-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="og-sheet-handle" />
            <div className="og-sheet-head">
              <h3 id="og-sheet-title">{destination.title}</h3>
              <button className="og-sheet-close" type="button" onClick={() => setDestination(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p className="og-sheet-copy">This dashboard preview keeps navigation in context. The selected destination is part of the investor app.</p>
            <code className="og-route-pill">{destination.path}</code>
          </section>
        </div>
      ) : null}
    </main>
  );
}