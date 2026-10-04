/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#1D2A23',
    tint: '#34785A',
    background: '#F8FAF8',
    foreground: '#1D2A23',
    card: '#FFFFFF',
    cardForeground: '#1D2A23',
    primary: '#0D4B37',
    primaryForeground: '#FFFFFF',
    secondary: '#F1F5F2',
    secondaryForeground: '#26372E',
    muted: '#F3F6F3',
    mutedForeground: '#65736B',
    lightGreen: '#EAF3ED',
    glow: 'rgba(13, 75, 55, 0.045)',
    accent: '#4F8064',
    accentForeground: '#FFFFFF',
    statusSuccessBackground: '#EAF3ED',
    statusSuccess: '#0D4B37',
    statusPendingBackground: '#F2F0EA',
    statusPending: '#71664E',
    destructive: '#B3473D',
    destructiveForeground: '#FFFFFF',
    border: '#E1E8E2',
    input: '#D6E0D9',
    shadow: 'rgba(18, 48, 34, 0.06)',
    shadowColor: '#123022',
  },
  dark: {
    text: '#EFF4F0',
    tint: '#74B38E',
    background: '#101D18',
    foreground: '#EFF4F0',
    card: '#16251E',
    cardForeground: '#EFF4F0',
    primary: '#74B38E',
    primaryForeground: '#102018',
    secondary: '#21332A',
    secondaryForeground: '#DDE9E0',
    muted: '#1B2B23',
    mutedForeground: '#A0B3A6',
    lightGreen: '#20382A',
    glow: 'rgba(116, 179, 142, 0.12)',
    accent: '#83B796',
    accentForeground: '#102018',
    statusSuccessBackground: '#20382A',
    statusSuccess: '#9BD0AA',
    statusPendingBackground: '#393528',
    statusPending: '#D0C094',
    destructive: '#D07B70',
    destructiveForeground: '#FFFFFF',
    border: '#2B3B31',
    input: '#39483F',
    shadow: 'rgba(0, 0, 0, 0.22)',
    shadowColor: '#000000',
  },
  radius: 18,
};

export default colors;
