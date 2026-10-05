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
    text: '#283934',
    tint: '#31634C',
    background: '#F7F6F2',
    foreground: '#283934',
    card: '#FDFDFC',
    cardForeground: '#283934',
    primary: '#31634C',
    primaryForeground: '#F9F8F6',
    secondary: '#EFEDE6',
    secondaryForeground: '#283934',
    muted: '#EFEDE6',
    mutedForeground: '#687D76',
    lightGreen: '#E6EFE9',
    balanceCardStart: '#174B34',
    balanceCardEnd: '#2F7650',
    balanceCardText: '#F8FBF8',
    glow: 'rgba(49, 99, 76, 0.04)',
    accent: '#BB9C63',
    accentForeground: '#24332F',
    statusSuccessBackground: '#E6EFE9',
    statusSuccess: '#31634C',
    statusPendingBackground: '#F3EFE4',
    statusPending: '#806B45',
    destructive: '#DC2828',
    destructiveForeground: '#FFFFFF',
    border: '#E0DDD7',
    input: '#EAE7E1',
    shadow: 'rgba(40, 57, 52, 0.045)',
    shadowColor: '#283934',
  },
  dark: {
    text: '#F0F0EB',
    tint: '#479E4C',
    background: '#0F151A',
    foreground: '#F0F0EB',
    card: '#151D23',
    cardForeground: '#F0F0EB',
    primary: '#479E4C',
    primaryForeground: '#0F151A',
    secondary: '#202A32',
    secondaryForeground: '#F0F0EB',
    muted: '#202A32',
    mutedForeground: '#8595A3',
    lightGreen: '#20372D',
    balanceCardStart: '#123A2A',
    balanceCardEnd: '#255C3C',
    balanceCardText: '#F1F6F2',
    glow: 'rgba(71, 158, 76, 0.10)',
    accent: '#CBB076',
    accentForeground: '#0F151A',
    statusSuccessBackground: '#20372D',
    statusSuccess: '#9BC7A2',
    statusPendingBackground: '#38342A',
    statusPending: '#CFB982',
    destructive: '#E63737',
    destructiveForeground: '#FFFFFF',
    border: '#252F37',
    input: '#1D242B',
    shadow: 'rgba(0, 0, 0, 0.22)',
    shadowColor: '#000000',
  },
  radius: 16,
};

export default colors;
