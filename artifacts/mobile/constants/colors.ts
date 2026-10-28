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
    text: '#283833',
    tint: '#31634C',
    background: '#F8F7F3',
    foreground: '#283833',
    card: '#FDFDFB',
    cardForeground: '#283833',
    primary: '#31634C',
    primaryForeground: '#F9F8F6',
    secondary: '#EFEDE6',
    secondaryForeground: '#283833',
    muted: '#EFEDE6',
    mutedForeground: '#687D76',
    lightGreen: '#E7EFEA',
    balanceCardStart: '#174B34',
    balanceCardEnd: '#2F7650',
    balanceCardText: '#F8FBF8',
    glow: 'rgba(49, 99, 76, 0.04)',
    accent: '#B99A64',
    accentForeground: '#24332F',
    statusSuccessBackground: '#E7EFEA',
    statusSuccess: '#31634C',
    statusPendingBackground: '#F3EFE4',
    statusPending: '#806B45',
    allocationBalance: '#31634C',
    allocationWithdrawals: '#C96F59',
    allocationInvestments: '#4C8192',
    allocationProfits: '#B99A64',
    allocationPending: '#8874A8',
    destructive: '#DC2828',
    destructiveForeground: '#FFFFFF',
    border: '#DFDDD7',
    input: '#EAE7E1',
    shadow: 'rgba(40, 56, 51, 0.045)',
    shadowColor: '#283833',
  },
  dark: {
    text: '#F0F0EB',
    tint: '#4F9F47',
    background: '#0F151A',
    foreground: '#F0F0EB',
    card: '#151D23',
    cardForeground: '#F0F0EB',
    primary: '#4F9F47',
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
    accent: '#D0B47A',
    accentForeground: '#0F151A',
    statusSuccessBackground: '#20372D',
    statusSuccess: '#9BC7A2',
    statusPendingBackground: '#38342A',
    statusPending: '#CFB982',
    allocationBalance: '#6DB18A',
    allocationWithdrawals: '#E18A74',
    allocationInvestments: '#78B4C3',
    allocationProfits: '#D0B47A',
    allocationPending: '#B8A0D2',
    destructive: '#E63737',
    destructiveForeground: '#FFFFFF',
    border: '#252F37',
    input: '#1D242B',
    shadow: 'rgba(0, 0, 0, 0.22)',
    shadowColor: '#000000',
  },
  radius: 12,
};

export default colors;
