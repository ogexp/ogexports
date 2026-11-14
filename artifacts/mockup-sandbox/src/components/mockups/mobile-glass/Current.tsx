import React from 'react';
import './_group.css';

// Extracted from mobile/components/InvestorUI.tsx before the glass update.
// View/Platform are browser adapters; the Card's original styles are unchanged.
const Platform = { OS: 'web' };
const colors = {
  background: '#F8F7F3', card: '#FDFDFB', border: '#DFDDD7', radius: 12,
  shadow: 'rgba(40, 56, 51, 0.045)', shadowColor: '#283833',
};
const useColors = () => colors;
const s = { card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 } };

function View({ children, style, testID }: { children: React.ReactNode; style: object[]; testID?: string }) {
  const flattened = Object.assign({}, ...style) as React.CSSProperties;
  // React Native's View defaults, carried over to the DOM adapter.
  return <div data-testid={testID} style={{
    display: 'flex', flexDirection: 'column', position: 'relative',
    boxSizing: 'border-box', borderStyle: 'solid', flexShrink: 0, minWidth: 0, ...flattened,
  }}>{children}</div>;
}

function Card({ children, style, testID }: { children: React.ReactNode; style?: object; testID?: string }) {
  const colors = useColors();
  const cardShadow = Platform.OS === 'web'
    ? { boxShadow: `0 5px 16px ${colors.shadow}` }
    : { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.045, shadowRadius: 10, elevation: 1 };
  return <View testID={testID} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }, cardShadow, style ?? {}]}>{children}</View>;
}

export function Current() {
  return <main className="og-mobile-glass-preview">
    <p style={{ fontSize: 11, color: '#687D76', marginBottom: 10 }}>ORIGINAL SURFACE · BEFORE THE GLASS UPDATE</p>
    <Card>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Account overview</h2>
      <p style={{ fontSize: 13, lineHeight: '20px', margin: 0, color: '#687D76' }}>Account values are not loaded in this isolated surface preview.</p>
    </Card>
    <Card style={{ padding: 20, borderRadius: 22 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Existing rounded card</h2>
      <p style={{ fontSize: 13, lineHeight: '20px', margin: 0, color: '#687D76' }}>The existing spacing, borders and shadow have been preserved.</p>
    </Card>
  </main>;
}
