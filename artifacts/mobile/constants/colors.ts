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
    text: '#1F2933',
    tint: '#4CAF50',
    background: '#FFFFFF',
    foreground: '#1F2933',
    card: '#FFFFFF',
    cardForeground: '#1F2933',
    primary: '#0F3D2E',
    primaryForeground: '#FFFFFF',
    secondary: '#F7F7F2',
    secondaryForeground: '#1F2933',
    muted: '#F7F7F2',
    mutedForeground: '#64716A',
    lightGreen: '#EAF4EF',
    glow: 'rgba(76, 175, 80, 0.12)',
    accent: '#C6A969',
    accentForeground: '#1F2933',
    statusSuccessBackground: '#EAF4EF',
    statusSuccess: '#0F3D2E',
    statusPendingBackground: '#F7F0DE',
    statusPending: '#795F21',
    destructive: '#b4483f',
    destructiveForeground: '#FFFFFF',
    border: '#E2E9E4',
    input: '#DDE6E0',
    shadow: 'rgba(15, 61, 46, 0.055)',
    shadowColor: '#0F3D2E',
  },
  dark: {
    text: '#F1F4EC',
    tint: '#4CAF50',
    background: '#102018',
    foreground: '#F1F4EC',
    card: '#18271F',
    cardForeground: '#F1F4EC',
    primary: '#4CAF50',
    primaryForeground: '#0F241A',
    secondary: '#23342A',
    secondaryForeground: '#DBECE0',
    muted: '#1D2A22',
    mutedForeground: '#A0B0A4',
    accent: '#C6A969',
    accentForeground: '#1F2933',
    statusSuccessBackground: '#21392A',
    statusSuccess: '#90D0A0',
    statusPendingBackground: '#3D3522',
    statusPending: '#D9BF77',
    destructive: '#d06f65',
    destructiveForeground: '#ffffff',
    border: '#2C3B31',
    input: '#34443A',
  },
  radius: 22,
};

export default colors;
