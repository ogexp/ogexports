import React, { useState } from 'react';
import './_group.css';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  Home,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  PieChart,
  Wallet,
} from 'lucide-react';

const ink = '#173e31';
const muted = '#718078';
const border = '#e2eae4';
const pale = '#edf4ef';

const sections = [
  { label: 'Home', icon: Home },
  { label: 'Explore', icon: TrendingUp },
  { label: 'Portfolio', icon: PieChart },
  { label: 'Wallet', icon: Wallet },
];

const actions = [
  { label: 'Invest', icon: TrendingUp, kind: 'opportunities' },
  { label: 'Add funds', icon: Plus, kind: 'wallet deposit' },
  { label: 'Withdraw', icon: ArrowUpRight, kind: 'wallet withdrawal' },
  { label: 'Transactions', icon: FileText, kind: 'transactions' },
];

function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="p5-section-heading">
      <h2>{title}</h2>
      {action ? <button className="p5-text-action" onClick={onAction}>{action}<ArrowRight size={14} /></button> : null}
    </div>
  );
}

function UnavailableCard({ icon: Icon, title, copy, action, onAction }: {
  icon: typeof BriefcaseBusiness;
  title: string;
  copy: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="p5-unavailable">
      <div className="p5-empty-icon"><Icon size={18} strokeWidth={1.7} /></div>
      <div className="p5-empty-copy">
        <strong>{title}</strong>
        <span>{copy}</span>
      </div>
      {action ? <button aria-label={action} className="p5-chevron" onClick={onAction}><ArrowRight size={16} /></button> : null}
    </div>
  );
}

export function Phase5() {
  const [hidden, setHidden] = useState(false);
  const [range, setRange] = useState('1M');
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('Home');
  const [showNotifications, setShowNotifications] = useState(false);

  const inform = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(current => current === message ? '' : current), 2600);
  };

  return (
    <main className="p5-shell">
      <div className="p5-scroll">
        <header className="p5-header">
          <div className="p5-brand">
            <div className="p5-mark" aria-hidden="true"><span>OG</span><i /></div>
            <div>
              <div className="p5-eyebrow">OG EXPORTS</div>
              <div className="p5-greeting">Good Morning, Investor</div>
            </div>
          </div>
          <div className="p5-header-actions">
            <button aria-label="Open notifications" className="p5-icon-button" onClick={() => setShowNotifications(!showNotifications)}><Bell size={18} /></button>
            <button aria-label="Open profile" className="p5-avatar" onClick={() => inform('Profile details opened.')}>OG</button>
          </div>
        </header>
        {showNotifications ? <div className="p5-notice-panel"><Bell size={15} /><span>Notifications are currently unavailable.</span><button onClick={() => setShowNotifications(false)}>Dismiss</button></div> : null}

        <button className="p5-portfolio-select" onClick={() => inform('You are viewing your investor portfolio.')}>
          <span className="p5-mini-icon"><PieChart size={14} /></span>
          <span>My portfolio</span>
          <ChevronDown size={14} className="p5-select-chevron" />
        </button>

        <section className="p5-balance" aria-label="Portfolio overview">
          <div className="p5-balance-top">
            <div className="p5-balance-label"><span className="p5-live-dot" />PORTFOLIO OVERVIEW</div>
            <button className="p5-privacy" aria-label={hidden ? 'Show account values' : 'Hide account values'} onClick={() => setHidden(!hidden)}>
              {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="p5-value-label">Total portfolio value</div>
          <div className="p5-total">{hidden ? '••••••' : '—'}</div>
          <div className="p5-reported"><ShieldCheck size={13} /> Reported by OG Exports</div>
          <div className="p5-balance-rule" />
          <div className="p5-metrics">
            {[
              ['Total invested', '—'],
               ['Net returns / distributions', '—'],
               ['ROI', '—'],
              ['Available balance', '—'],
            ].map(([label, value]) => (
              <div className="p5-metric" key={label}>
                <span>{label}</span>
                <strong>{hidden ? '••••' : value}</strong>
              </div>
            ))}
          </div>
          <button className="p5-card-link" onClick={() => { setActiveTab('Portfolio'); inform('Portfolio details are not available in this preview.'); }}>
            View portfolio <ArrowRight size={14} />
          </button>
          <div className="p5-orbit p5-orbit-one" />
          <div className="p5-orbit p5-orbit-two" />
        </section>

        <div className="p5-actions" aria-label="Quick actions">
          {actions.map(({ label, icon: Icon, kind }, index) => (
            <button className="p5-action" key={label} onClick={() => inform(`${label} opens ${kind}.`)}>
              <span className={`p5-action-icon ${index === 0 ? 'p5-action-primary' : ''}`}><Icon size={17} strokeWidth={1.8} /></span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <button className="p5-search" onClick={() => inform('Search trades, investments and transactions.')}>
          <Search size={17} /><span>Search trades, investments or transactions</span><ArrowRight size={15} />
        </button>

        <SectionHeading title="My active trades" action="Portfolio" onAction={() => { setActiveTab('Portfolio'); inform('Portfolio details are not available in this preview.'); }} />
        <UnavailableCard icon={BriefcaseBusiness} title="No active trades" copy="Trade details will appear here when provided by OG Exports." action="Open portfolio" onAction={() => { setActiveTab('Portfolio'); inform('Portfolio details are not available in this preview.'); }} />

        <SectionHeading title="Featured opportunities" action="See all" onAction={() => { setActiveTab('Explore'); inform('Opportunities are not available in this preview.'); }} />
        <UnavailableCard icon={TrendingUp} title="No available opportunities" copy="New trade opportunities will appear here when provided." action="See opportunities" onAction={() => { setActiveTab('Explore'); inform('Opportunities are not available in this preview.'); }} />

        <SectionHeading title="Recent activity" action="See all" onAction={() => inform('Transaction history is not available in this preview.')} />
        <UnavailableCard icon={ArrowDownLeft} title="No recent activity" copy="Investments, deposits, withdrawals, distributions and trade status updates will appear here when returned by OG Exports." action="View transactions" onAction={() => inform('Transaction history is not available in this preview.')} />

        <SectionHeading title="Portfolio performance" action="Portfolio" onAction={() => { setActiveTab('Portfolio'); inform('Portfolio details are not available in this preview.'); }} />
        <section className="p5-performance">
          <div className="p5-performance-head">
            <div><strong>Portfolio value</strong><span>History reported by OG Exports</span></div>
            <span className="p5-performance-value">{hidden ? '••••' : '—'}</span>
          </div>
          <div className="p5-ranges" role="group" aria-label="Portfolio history range">
            {['1M', '3M', '6M', '1Y', 'All'].map(item => (
              <button key={item} className={range === item ? 'selected' : ''} aria-pressed={range === item} onClick={() => setRange(item)}>{item}</button>
            ))}
          </div>
          <div className="p5-chart-empty">
            <div className="p5-chart-grid"><i /><i /><i /></div>
            <span>History for this period is not available</span>
          </div>
          <div className="p5-chart-foot">Historical values only; this chart does not forecast returns.</div>
        </section>

        <SectionHeading title="Upcoming payouts" />
        <UnavailableCard icon={CalendarDays} title="Payout schedule" copy="Upcoming payout details are not available from the server." />
        <div className="p5-bottom-note"><ShieldCheck size={14} /> Your account information is securely provided by OG Exports.</div>
      </div>

      {notice ? <div className="p5-toast" role="status">{notice}</div> : null}
      <nav className="p5-tabbar" aria-label="Main navigation">
        {sections.map(({ label, icon: Icon }) => (
          <button key={label} className={`p5-tab ${activeTab === label ? 'active' : ''}`} onClick={() => { setActiveTab(label); if (label !== 'Home') inform(`${label} section selected.`); }}>
            <span className="p5-tab-icon"><Icon size={19} strokeWidth={activeTab === label ? 2.1 : 1.7} /></span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <style>{`
        .p5-shell{--p5-ink:${ink};--p5-muted:${muted};--p5-border:${border};--p5-pale:${pale};position:relative;width:100%;max-width:402px;min-height:100dvh;margin:0 auto;overflow:hidden;background:#f5f8f5;color:#1f3028;font-family:'DM Sans','Plus Jakarta Sans',-apple-system,sans-serif;letter-spacing:-.01em}
        .p5-scroll{height:100dvh;overflow-y:auto;overscroll-behavior:contain;padding:calc(env(safe-area-inset-top,0px) + 15px) 19px calc(env(safe-area-inset-bottom,0px) + 104px);scrollbar-width:none}.p5-scroll::-webkit-scrollbar{display:none}
        .p5-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}
        .p5-brand{display:flex;align-items:center;gap:11px;min-width:0}.p5-mark{position:relative;display:grid;place-items:center;width:43px;height:43px;border-radius:14px;background:${ink};color:#f5f4e8;font-family:Georgia,serif;font-size:14px;letter-spacing:.02em}.p5-mark i{position:absolute;right:7px;top:7px;width:5px;height:5px;background:#d1b876;border-radius:50%}
        .p5-eyebrow{font-size:9px;font-weight:800;letter-spacing:1.45px;color:${ink}}.p5-greeting{margin-top:3px;font-size:13px;font-weight:700;letter-spacing:-.2px}
        .p5-header-actions{display:flex;gap:8px}.p5-icon-button,.p5-avatar{border:1px solid ${border};display:grid;place-items:center;background:#fffefa;color:${ink};width:39px;height:39px;border-radius:50%;cursor:pointer}.p5-avatar{background:#e9f1eb;font-size:11px;font-weight:800}
        .p5-notice-panel{margin:-3px 0 12px;padding:11px 12px;border:1px solid ${border};border-radius:13px;background:#fffefa;display:flex;align-items:center;gap:8px;color:${ink};font-size:11px}.p5-notice-panel span{flex:1}.p5-notice-panel button{border:0;background:none;color:${ink};font-size:10px;font-weight:700}
        .p5-portfolio-select{height:33px;display:flex;align-items:center;gap:7px;margin:0 auto 12px;padding:0 11px;border-radius:18px;border:1px solid ${border};background:#fffefa;color:#263c31;font-size:11px;font-weight:700;cursor:pointer}.p5-mini-icon{display:grid;place-items:center;color:${ink}}.p5-select-chevron{margin-left:1px;color:#78877e}
        .p5-balance{position:relative;isolation:isolate;overflow:hidden;min-height:275px;padding:20px 19px 16px;border-radius:24px;background:linear-gradient(145deg,#174533 0%,#103b2d 65%,#0d3429 100%);color:#f6f7ee;box-shadow:0 13px 26px rgba(19,63,45,.16)}
        .p5-balance-top,.p5-balance-label{display:flex;align-items:center}.p5-balance-top{justify-content:space-between}.p5-balance-label{gap:7px;color:rgba(242,246,237,.78);font-size:9px;font-weight:800;letter-spacing:1.3px}.p5-live-dot{width:6px;height:6px;border-radius:50%;background:#c4b16f;box-shadow:0 0 0 3px rgba(196,177,111,.15)}
        .p5-privacy{z-index:2;display:grid;place-items:center;width:29px;height:29px;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:rgba(255,255,255,.07);color:#f4f5e9;cursor:pointer}
        .p5-value-label{position:relative;z-index:1;margin-top:14px;color:rgba(243,246,237,.71);font-size:11px}.p5-total{position:relative;z-index:1;margin-top:1px;font-family:'DM Sans','Plus Jakarta Sans',sans-serif;font-size:41px;line-height:1.2;font-weight:650;letter-spacing:-1.8px}.p5-reported{position:relative;z-index:1;display:flex;align-items:center;gap:5px;color:rgba(243,246,237,.64);font-size:10px;margin-top:3px}.p5-reported svg{color:#d4c284}
        .p5-balance-rule{position:relative;z-index:1;height:1px;margin:15px 0 12px;background:rgba(255,255,255,.18)}
        .p5-metrics{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;row-gap:12px}.p5-metric{display:flex;flex-direction:column;gap:3px}.p5-metric:nth-child(even){padding-left:12px;border-left:1px solid rgba(255,255,255,.16)}.p5-metric span{color:rgba(243,246,237,.67);font-size:10px}.p5-metric strong{font-size:14px;line-height:1.2;font-weight:700;letter-spacing:.1px}
        .p5-card-link{position:relative;z-index:1;display:flex;align-items:center;gap:7px;margin-top:14px;padding:0;border:0;background:none;color:#e2d39c;font-size:11px;font-weight:700;cursor:pointer}
        .p5-orbit{position:absolute;z-index:-1;border:1px solid rgba(220,229,202,.09);border-radius:50%;pointer-events:none}.p5-orbit-one{width:212px;height:212px;right:-86px;top:-78px}.p5-orbit-two{width:154px;height:154px;right:-56px;top:-49px}
        .p5-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:12px 0 11px;padding:9px 5px;background:#fffefa;border:1px solid ${border};border-radius:19px;box-shadow:0 6px 18px rgba(26,65,48,.04)}
        .p5-action{min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;padding:2px 0;border:0;background:none;color:#34463c;font-size:9px;font-weight:700;white-space:nowrap;cursor:pointer}.p5-action-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:13px;background:#edf4ef;color:${ink}}.p5-action-primary{background:${ink};color:#f8f8ee}
        .p5-search{width:100%;height:47px;display:flex;align-items:center;gap:10px;padding:0 13px;border-radius:15px;border:1px solid ${border};background:#fffefa;color:${ink};text-align:left;cursor:pointer}.p5-search span{flex:1;color:#8a968f;font-size:11px}.p5-search svg:last-child{color:#839087}
        .p5-summary-row{position:relative;display:flex;align-items:center;margin:12px 1px 19px;padding:11px 11px;border:1px solid #e6ece6;border-radius:14px;background:#eef4ef}.p5-summary-row>div{display:flex;flex:1;flex-direction:column;gap:5px}.p5-summary-label{color:#7d8981;font-size:9px}.p5-summary-row strong{display:flex;align-items:center;gap:5px;color:${ink};font-size:11px}.p5-summary-row strong i{display:block;width:6px;height:6px;border-radius:50%;background:#9dba8e}.p5-summary-divider{width:1px;height:28px;background:#dbe4dc;margin:0 13px 0 5px}.p5-summary-row>button{display:grid;place-items:center;width:21px;height:21px;border:0;background:transparent;color:#819087}
        .p5-section-heading{display:flex;align-items:center;justify-content:space-between;margin:21px 1px 10px}.p5-section-heading h2{margin:0;color:${ink};font-size:15px;font-weight:750;letter-spacing:-.35px}.p5-text-action{display:flex;align-items:center;gap:4px;padding:4px 0;border:0;background:none;color:${ink};font-size:10px;font-weight:750;cursor:pointer}
        .p5-unavailable{display:flex;align-items:center;gap:11px;padding:14px 13px;${''}border:1px solid ${border};border-radius:18px;background:#fffefa;box-shadow:0 5px 17px rgba(26,65,48,.035)}
        .p5-empty-icon{flex:none;display:grid;place-items:center;width:39px;height:39px;border-radius:14px;background:#edf4ef;color:${ink}}.p5-empty-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}.p5-empty-copy strong{color:#253a30;font-size:11px;font-weight:750}.p5-empty-copy span{color:#829087;font-size:10px;line-height:1.45}.p5-chevron{display:grid;place-items:center;flex:none;width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:#829087;cursor:pointer}
        .p5-performance{padding:15px 14px 13px;border:1px solid ${border};border-radius:20px;background:#fffefa;box-shadow:0 6px 20px rgba(26,65,48,.04)}.p5-performance-head{display:flex;align-items:flex-start;justify-content:space-between}.p5-performance-head>div{display:flex;flex-direction:column;gap:4px}.p5-performance-head strong{color:#243b30;font-size:13px}.p5-performance-head span{color:#829087;font-size:10px}.p5-performance-value{color:${ink};font-size:14px;font-weight:750}
        .p5-ranges{display:flex;gap:5px;margin-top:14px}.p5-ranges button{min-width:40px;padding:6px 9px;border:0;border-radius:14px;background:#f0f4f0;color:#7a887f;font-size:10px;font-weight:700;cursor:pointer}.p5-ranges button.selected{background:${ink};color:#f8f8ee}
        .p5-chart-empty{position:relative;display:grid;place-items:center;height:114px;margin-top:10px;overflow:hidden;border-radius:12px;background:#fbfcfa}.p5-chart-grid{position:absolute;inset:12px 0;display:flex;flex-direction:column;justify-content:space-between}.p5-chart-grid i{display:block;width:100%;border-top:1px dashed #e8eee9}.p5-chart-empty>span{position:relative;padding:7px 10px;background:rgba(251,252,250,.91);color:#89948d;font-size:10px;text-align:center}
        .p5-chart-foot{margin-top:9px;color:#8b968f;font-size:9px;line-height:1.5}
        .p5-bottom-note{display:flex;align-items:center;justify-content:center;gap:6px;margin:18px 0 0;color:#89958d;font-size:9px}.p5-bottom-note svg{color:${ink}}
        .p5-tabbar{position:fixed;z-index:5;bottom:0;left:50%;transform:translateX(-50%);width:min(100%,402px);display:grid;grid-template-columns:repeat(4,1fr);padding:9px 9px calc(env(safe-area-inset-bottom,0px) + 8px);border-top:1px solid #e5ebe5;background:rgba(255,254,250,.96);backdrop-filter:blur(16px);box-shadow:0 -5px 20px rgba(28,59,44,.035)}.p5-tab{display:flex;flex-direction:column;align-items:center;gap:4px;border:0;background:none;color:#87938b;font-size:9px;font-weight:650;cursor:pointer}.p5-tab-icon{height:21px;display:grid;place-items:center}.p5-tab.active{color:${ink}}.p5-tab.active .p5-tab-icon{position:relative}.p5-tab.active .p5-tab-icon:after{content:'';position:absolute;width:22px;height:22px;border-radius:9px;background:#eaf2eb;z-index:-1}
        .p5-toast{position:fixed;z-index:10;bottom:calc(env(safe-area-inset-bottom,0px) + 75px);left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100% - 36px);padding:11px 15px;border-radius:14px;background:#173e31;color:#f6f7ee;font-size:11px;box-shadow:0 7px 20px rgba(14,47,35,.2);text-align:center}
        @media(max-width:360px){.p5-shell{max-width:100%}.p5-scroll{padding-left:15px;padding-right:15px}.p5-balance{padding-left:16px;padding-right:16px}.p5-action{font-size:8px}.p5-actions{padding-left:2px;padding-right:2px}}
        @media(prefers-reduced-motion:no-preference){.p5-shell{animation:p5-in .48s ease-out both}@keyframes p5-in{from{opacity:.65;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}}
      `}</style>
    </main>
  );
}