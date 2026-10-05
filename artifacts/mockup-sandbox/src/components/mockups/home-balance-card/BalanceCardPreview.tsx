import React from 'react';
import {
  ArrowUpRight,
  CreditCard,
  Eye,
  FileText,
  PieChart,
  Plus,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import './_group.css';

type BalanceCardPreviewProps = { refined: boolean };

const quickActions = [
  { label: 'Add Funds', icon: <Plus size={17} /> },
  { label: 'Invest', icon: <TrendingUp size={17} /> },
  { label: 'Withdraw', icon: <ArrowUpRight size={17} /> },
  { label: 'Transactions', icon: <FileText size={17} /> },
];

export function BalanceCardPreview({ refined }: BalanceCardPreviewProps) {
  const outerCircleAlpha = refined ? 0.06 : 0.12;
  const innerCircleAlpha = refined ? 0.04 : 0.08;

  return (
    <main
      className="og-balance-preview"
      style={{
        width: '100%',
        maxWidth: 402,
        minHeight: 410,
        margin: '0 auto',
        padding: '16px 18px 12px',
        boxSizing: 'border-box',
        background: 'var(--og-balance-background)',
        color: 'var(--og-balance-foreground)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '18px 19px 39px',
          borderRadius: 24,
          color: 'var(--og-balance-text)',
          background: 'linear-gradient(135deg, var(--og-balance-start), var(--og-balance-end))',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -48,
            right: -17,
            width: 134,
            height: 134,
            borderRadius: 67,
            border: `1px solid rgba(248, 251, 248, ${outerCircleAlpha})`,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -26,
            right: 6,
            width: 88,
            height: 88,
            borderRadius: 44,
            border: `1px solid rgba(248, 251, 248, ${innerCircleAlpha})`,
          }}
        />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            style={{
              display: 'grid',
              width: 42,
              height: 42,
              placeItems: 'center',
              flex: '0 0 auto',
              border: '1px solid rgba(248, 251, 248, .36)',
              borderRadius: '50%',
              background: 'rgba(248, 251, 248, .14)',
            }}
          >
            <UserRound size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ overflow: 'hidden', fontSize: 14, fontWeight: 600, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Hello, Investor
            </div>
            <div style={{ marginTop: 2, fontSize: 10, opacity: 0.76 }}>Good morning</div>
          </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginTop: 15 }}>
          <div
            style={{
              display: 'flex',
              minWidth: 0,
              minHeight: 39,
              flex: 1,
              alignItems: 'center',
              gap: 8,
              padding: '0 11px',
              border: '1px solid rgba(248, 251, 248, .16)',
              borderRadius: 20,
              background: 'rgba(248, 251, 248, .13)',
            }}
          >
            <CreditCard size={14} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6 }}>ACCOUNT OVERVIEW</div>
              <div style={{ overflow: 'hidden', marginTop: 1, fontSize: 10, opacity: 0.84, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Account ID unavailable
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              minHeight: 33,
              flex: '0 0 auto',
              alignItems: 'center',
              gap: 6,
              padding: '0 10px',
              borderRadius: 15,
              background: 'rgba(248, 251, 248, .13)',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            <PieChart size={13} />
            Portfolio
            <ArrowUpRight size={12} />
          </div>
        </div>

        <div style={{ position: 'relative', marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 30 }}>
            <div
              style={{
                fontSize: refined ? 11 : 10,
                fontWeight: 700,
                letterSpacing: refined ? 0.25 : 0.9,
                opacity: refined ? 0.9 : 0.8,
              }}
            >
              {refined ? 'Available Balance' : 'AVAILABLE BALANCE'}
            </div>
            <div
              aria-label="Hide balances"
              style={{
                display: 'grid',
                width: 30,
                height: 30,
                flex: '0 0 auto',
                placeItems: 'center',
                borderRadius: '50%',
                background: 'rgba(248, 251, 248, .12)',
              }}
            >
              <Eye size={15} />
            </div>
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: refined ? 40 : 33,
              fontWeight: 700,
              letterSpacing: refined ? -0.9 : -0.7,
              lineHeight: 1.08,
            }}
          >
            $300.00
          </div>
          <div style={{ marginTop: 3, fontSize: 10, opacity: 0.76 }}>USD account</div>
        </div>

        <div style={{ position: 'relative', height: 1, marginTop: 16, background: 'rgba(248, 251, 248, .22)' }} />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginTop: 11,
          }}
        >
          <div style={{ fontSize: refined ? 10.5 : 11, opacity: refined ? 0.72 : 0.78 }}>
            {refined ? 'Portfolio Value' : 'Total portfolio value'}
          </div>
          <div style={{ flexShrink: 1, fontSize: 13, fontWeight: 700, textAlign: 'right' }}>$0.00</div>
        </div>
      </section>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          margin: '-25px 16px 16px',
          padding: '8px 9px',
          border: '1px solid var(--og-balance-border)',
          borderRadius: 25,
          background: 'var(--og-balance-surface)',
          boxShadow: '0 4px 12px rgba(40, 57, 52, .12)',
        }}
      >
        {quickActions.map((action, index) => (
          <div
            key={action.label}
            style={{
              display: 'flex',
              minWidth: 0,
              minHeight: 68,
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderRadius: 16,
            }}
          >
            <div
              style={{
                display: 'grid',
                width: 40,
                height: 40,
                placeItems: 'center',
                borderRadius: '50%',
                background: index === 0 ? 'var(--og-balance-end)' : 'var(--og-balance-start)',
                color: 'var(--og-balance-text)',
              }}
            >
              {action.icon}
            </div>
            <div
              style={{
                overflow: 'hidden',
                maxWidth: '100%',
                color: index === 0 ? 'var(--og-balance-primary)' : 'var(--og-balance-foreground)',
                fontSize: 'clamp(8px, 2.49vw, 10px)',
                fontWeight: 700,
                lineHeight: '12px',
                textAlign: 'center',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {action.label}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
