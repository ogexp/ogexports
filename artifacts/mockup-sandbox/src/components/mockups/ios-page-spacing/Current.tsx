import './_group.css';

export function Current() {
  return (
    <main style={{ position: 'relative', width: 390, minHeight: 844, overflow: 'hidden', background: 'var(--ios-page-background)' }}>
      <div style={{ position: 'absolute', top: 10, left: 22, right: 22, zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700 }}>
        <span>9:41</span>
        <span style={{ width: 92, height: 30, position: 'absolute', left: '50%', top: -2, transform: 'translateX(-50%)', borderRadius: 20, background: '#101513' }} />
        <span style={{ letterSpacing: 1 }}>● ▮</span>
      </div>

      <div style={{ paddingTop: 59, paddingLeft: 20, paddingRight: 20, paddingBottom: 108 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, lineHeight: '32px', fontWeight: 600, letterSpacing: -0.35 }}>Wallet</h1>
            <p style={{ margin: '5px 0 0', color: 'var(--ios-page-muted)', fontSize: 14, lineHeight: '21px' }}>Your account balance and wallet activity</p>
          </div>
        </header>

        <div style={{ marginTop: 10, marginBottom: 11, color: 'var(--ios-page-foreground)', fontSize: 12, lineHeight: '16px', fontWeight: 700 }}>
          Wallet overview
        </div>
        <section style={{ padding: 16, border: '1px solid var(--ios-page-border)', borderRadius: 16, background: 'var(--ios-page-card)' }}>
          <p style={{ margin: 0, color: 'var(--ios-page-muted)', fontSize: 12 }}>Available balance</p>
          <p style={{ margin: '7px 0 0', color: 'var(--ios-page-muted)', fontSize: 14 }}>Balance shown when supplied by OG Exports</p>
          <div style={{ height: 1, margin: '15px 0', background: 'var(--ios-page-border)' }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Recent wallet activity</p>
          <p style={{ margin: '5px 0 0', color: 'var(--ios-page-muted)', fontSize: 12 }}>Your latest account updates appear here.</p>
        </section>
      </div>

      <nav style={{ position: 'absolute', left: 14, right: 14, bottom: 10, height: 70, display: 'flex', justifyContent: 'space-around', alignItems: 'center', border: '1px solid var(--ios-page-border)', borderRadius: 30, background: 'rgba(253,253,252,.96)', boxShadow: '0 3px 12px rgba(40,57,52,.08)' }}>
        {['Dashboard', 'Opportunities', 'Portfolio', 'Wallet', 'Profile'].map((label, index) => (
          <div key={label} style={{ color: index === 3 ? 'var(--ios-page-primary)' : 'var(--ios-page-muted)', fontSize: 9, fontWeight: index === 3 ? 700 : 500 }}>
            <div style={{ marginBottom: 4, textAlign: 'center', fontSize: 17 }}>{['⌂', '⌕', '◷', '▣', '○'][index]}</div>
            {label}
          </div>
        ))}
      </nav>
    </main>
  );
}
