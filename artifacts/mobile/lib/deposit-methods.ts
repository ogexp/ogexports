export const DEPOSIT_PAYMENT_METHODS = [
  {
    id: 'bank',
    label: 'Bank Transfer',
    icon: 'home',
    description: 'Direct bank transfer via local or international banking.',
    minMax: '$500.00 / $500,000.00',
    processing: '1–2 Business Days',
    currency: 'PKR',
    fees: '0%',
  },
  {
    id: 'wire',
    label: 'Wire Transfer',
    icon: 'wifi',
    description: 'International wire transfer for larger institutional deposits.',
    minMax: '$1,000.00 / $1,000,000.00',
    processing: '1–3 Business Days',
    currency: 'PKR',
    fees: '0%',
  },
  {
    id: 'swift',
    label: 'SWIFT Transfer',
    icon: 'globe',
    description: 'Global SWIFT payment network for cross-border transfers.',
    minMax: '$2,000.00 / $5,000,000.00',
    processing: '2–5 Business Days',
    currency: 'PKR',
    fees: '0%',
  },
  {
    id: 'online',
    label: 'Online Banking',
    icon: 'credit-card',
    description: 'Transfer securely from your online banking portal to an OG Exports account.',
    minMax: '$100.00 / $50,000.00',
    processing: 'Same Day',
    currency: 'PKR',
    fees: '0%',
  },
] as const;

export type DepositPaymentMethodId = (typeof DEPOSIT_PAYMENT_METHODS)[number]['id'];
