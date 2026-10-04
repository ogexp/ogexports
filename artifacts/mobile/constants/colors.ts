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
    text: '#15251d',
    tint: '#1f6d4c',
    background: '#f7f7f1',
    foreground: '#15251d',
    card: '#ffffff',
    cardForeground: '#15251d',
    primary: '#1f6d4c',
    primaryForeground: '#ffffff',
    secondary: '#edf2ec',
    secondaryForeground: '#244635',
    muted: '#eff1eb',
    mutedForeground: '#718077',
    accent: '#f4e8c7',
    accentForeground: '#725b1d',
    destructive: '#b4483f',
    destructiveForeground: '#ffffff',
    border: '#e5e8df',
    input: '#e3e7de',
  },
  dark: {
    text: '#f1f4ec',
    tint: '#7dbe98',
    background: '#111a15',
    foreground: '#f1f4ec',
    card: '#1a2820',
    cardForeground: '#f1f4ec',
    primary: '#73b58e',
    primaryForeground: '#102018',
    secondary: '#23342a',
    secondaryForeground: '#dbece0',
    muted: '#1d2a22',
    mutedForeground: '#a0b0a4',
    accent: '#483d21',
    accentForeground: '#f2d88d',
    destructive: '#d06f65',
    destructiveForeground: '#ffffff',
    border: '#2c3b31',
    input: '#34443a',
  },
  radius: 8,
};

export default colors;
