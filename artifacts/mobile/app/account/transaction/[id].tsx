import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetInvestorWalletTransaction } from '@workspace/api-client-react';
import { Card, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { amount, first, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const unavailable = '—';

function formatDateTime(value: string) {
  if (!value) return unavailable;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

function DetailLine({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border }}>
    <Text style={{ color: colors.mutedForeground, fontSize: 12, flex: 0.8 }}>{label}</Text>
    <Text selectable style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right', flex: 1.2 }}>{value || unavailable}</Text>
  </View>;
}

export default function TransactionDetails() {
  const { token } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' && /^\d+$/.test(params.id) ? params.id : '';
  const query = useGetInvestorWalletTransaction(Number(id), {
    query: {
      queryKey: ['investor-wallet-transaction', id],
      enabled: Boolean(token && id),
      staleTime: 20_000,
    },
  });
  const transaction = unwrap(query.data);
  const meta = record(transaction.meta);
  const withdrawalBreakdown = record(transaction.withdrawal_breakdown);
  const hasWithdrawalBreakdown = Object.keys(withdrawalBreakdown).length > 0;
  const transactionId = first(transaction, ['id', 'transaction_id'], id);
  const title = first(transaction, ['description', 'title'], first(transaction, ['type', 'transaction_type'], 'Transaction'));
  const currency = first(transaction, ['currency'], first(meta, ['currency', 'wallet_currency']));
  const breakdownCurrency = first(withdrawalBreakdown, ['currency'], currency);
  const reportedAmount = amount(transaction, ['amount']);
  const amountLabel = money(
    reportedAmount,
    (hasWithdrawalBreakdown ? breakdownCurrency : currency) || 'USD',
    { preserveSource: hasWithdrawalBreakdown },
  );
  const status = first(transaction, ['status', 'state'], unavailable);
  const formatRecordedAmount = (key: string) => {
    const value = amount(withdrawalBreakdown, [key]);
    if (value === null) return 'Not recorded';
    return breakdownCurrency
      ? money(value, breakdownCurrency, { preserveSource: true })
      : value.toFixed(2);
  };
  const exchangeRate = amount(withdrawalBreakdown, ['exchange_rate']);
  const exchangeRateLabel = exchangeRate === null
    ? 'Not recorded'
    : `1 USD = ${exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${breakdownCurrency || 'PKR'}`;

  return <Screen title="Transaction details" subtitle="Transaction information reported by OG Exports">
    {query.isLoading ? <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 10 }}>Loading transaction details…</Text>
    </Card> : null}
    {query.isError ? <ErrorState message="Transaction details could not be loaded." error={query.error} onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError && transactionId ? <>
      <Card style={{ padding: 18 }}>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <Text selectable style={{ color: colors.primary, fontSize: 24, fontWeight: '700', marginTop: 10 }}>{amountLabel}</Text>
        <View style={{ marginTop: 12 }}><Status value={status} /></View>
      </Card>
      <Section title="Transaction record" />
      <Card>
        <DetailLine label="Transaction ID" value={transactionId} />
        <DetailLine label="Type" value={first(transaction, ['type', 'transaction_type'], unavailable)} />
        <DetailLine label="Status" value={status} />
        <DetailLine label="Amount" value={amountLabel} />
        <DetailLine label="Date / time" value={formatDateTime(first(transaction, ['created_at', 'occurred_at', 'date']))} />
        <DetailLine label="Reference" value={first(transaction, ['reference', 'transaction_reference'], unavailable)} />
        <DetailLine label="Payment method" value={first(transaction, ['payment_method', 'method'], first(meta, ['payment_method', 'method'], unavailable))} />
        {first(meta, ['investment_id']) ? <DetailLine label="Investment ID" value={first(meta, ['investment_id'])} /> : null}
        {first(meta, ['trade_id', 'trade_reference']) ? <DetailLine label="Trade ID" value={first(meta, ['trade_id', 'trade_reference'])} /> : null}
      </Card>
      {hasWithdrawalBreakdown ? <>
        <Section title="Withdrawal breakdown" />
        <Card>
          <DetailLine label="Requested bank payout" value={formatRecordedAmount('payout_amount')} />
          <DetailLine label="Withdrawal fee" value={formatRecordedAmount('fee')} />
          <DetailLine label="Total wallet debit" value={formatRecordedAmount('total_debit')} />
          <DetailLine label="Currency" value={breakdownCurrency || 'Not recorded'} />
          <DetailLine label="Saved exchange rate" value={exchangeRateLabel} />
        </Card>
      </> : null}
    </> : null}
    {!query.isLoading && !query.isError && !id ? <ErrorState message="This transaction link is invalid." /> : null}
    {!query.isLoading && query.isError && query.error && String(query.error).includes('404') ? <Text accessibilityRole="alert" style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 8 }}>This transaction was not found in your account.</Text> : null}
    <Pressable accessibilityRole="button" onPress={() => router.replace('/account/transactions')} style={{ alignSelf: 'flex-start', paddingVertical: 14 }}>
      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Open transaction history</Text>
    </Pressable>
  </Screen>;
}
