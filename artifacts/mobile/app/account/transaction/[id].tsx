import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useGetInvestorDeposit,
  useGetInvestorWalletTransactions,
  useGetInvestorWithdrawal,
} from '@workspace/api-client-react';
import { Card, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { amount, first, list, messageOf, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { createTransactionReceipt, saveTransactionReceipt } from '@/lib/transaction-receipt';
import { resolveTransactionPaymentMethod } from '@/lib/transaction-payment-method';
import { savedUsdEquivalentForRecordedAmount } from '@/lib/withdrawal-history';

const unavailable = '—';

function validRelatedId(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const id = String(value).trim();
    if (/^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))) return id;
  }
  return '';
}

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
  const params = useLocalSearchParams<{ id?: string; kind?: string; page?: string }>();
  const id = typeof params.id === 'string' && /^\d+$/.test(params.id) ? params.id : '';
  const sourcePage = typeof params.page === 'string' && /^\d+$/.test(params.page)
    ? Math.max(1, Number(params.page))
    : 1;
  const requestedKind = typeof params.kind === 'string' ? params.kind : 'wallet';
  const kind = requestedKind === 'deposit' || requestedKind === 'withdrawal' ? requestedKind : 'wallet';
  const queryOptions = (sourceKind: 'deposit' | 'withdrawal', enabled: boolean) => ({
    query: {
      queryKey: ['investor-transaction-detail', sourceKind, id],
      enabled: Boolean(token && id && enabled),
      staleTime: 20_000,
    },
  });
  const walletQuery = useGetInvestorWalletTransactions({ page: sourcePage, per_page: 100 }, {
    query: {
      queryKey: ['investor-wallet-transactions', sourcePage, 100],
      enabled: Boolean(token && id && (kind === 'wallet' || kind === 'withdrawal')),
      staleTime: 20_000,
    },
  });
  const depositQuery = useGetInvestorDeposit(Number(id), queryOptions('deposit', kind === 'deposit'));
  const withdrawalQuery = useGetInvestorWithdrawal(Number(id), queryOptions('withdrawal', kind === 'withdrawal'));
  const query = kind === 'deposit' ? depositQuery : kind === 'withdrawal' ? withdrawalQuery : walletQuery;
  const walletTransaction = kind === 'wallet'
    ? list(walletQuery.data).find(item => first(item, ['id', 'transaction_id']) === id)
    : undefined;
  const transaction = kind === 'wallet' ? walletTransaction ?? {} : record(unwrap(query.data));
  const hasRecord = Object.keys(transaction).length > 0;
  const meta = record(transaction.meta);
  const bankDetails = record(transaction.bank_details);
  const walletType = first(transaction, ['type', 'transaction_type']).toLowerCase();
  const isWithdrawalTransaction = kind === 'withdrawal'
    || (kind === 'wallet' && /withdraw|payout/.test(walletType));
  const withdrawalReference = first(transaction, ['reference', 'withdraw_id']);
  const withdrawalWalletTransaction = kind === 'wallet'
    ? walletTransaction
    : kind === 'withdrawal'
      ? list(walletQuery.data).find(item => {
        const itemMeta = record(item.meta);
        return first(itemMeta, ['withdrawal_id']) === id
          || Boolean(withdrawalReference && first(item, ['reference', 'transaction_reference']) === withdrawalReference);
      })
      : undefined;
  const withdrawalLedgerMeta = record(withdrawalWalletTransaction?.meta);
  const withdrawalLedgerBreakdown = record(withdrawalWalletTransaction?.withdrawal_breakdown);
  const withdrawalLedgerMetaBreakdown = record(withdrawalLedgerMeta.withdrawal_breakdown);
  const paymentMethod = isWithdrawalTransaction
    ? resolveTransactionPaymentMethod(
      [transaction, bankDetails, meta, withdrawalLedgerMeta],
      true,
    )
    : first(
      transaction,
      ['payment_method', 'method'],
      first(bankDetails, ['payment_method', 'method'], first(meta, ['payment_method', 'method'], unavailable)),
    );
  const relatedInvestmentId = validRelatedId(transaction.investment_id, meta.investment_id);
  const relatedTradeId = validRelatedId(transaction.trade_id, meta.trade_id);
  const primaryWithdrawalBreakdown = isWithdrawalTransaction
    ? {
      ...withdrawalLedgerMeta,
      ...withdrawalLedgerMetaBreakdown,
      ...withdrawalLedgerBreakdown,
      ...meta,
      ...record(meta.withdrawal_breakdown),
      ...record(transaction.withdrawal_breakdown),
      ...(kind === 'withdrawal' ? transaction : {}),
    }
    : {};
  const withdrawalBreakdown = isWithdrawalTransaction
    ? {
      ...primaryWithdrawalBreakdown,
      payout_amount: amount(primaryWithdrawalBreakdown, ['payout_amount'])
        ?? (kind === 'withdrawal' ? amount(transaction, ['amount']) : null)
        ?? amount(withdrawalLedgerMetaBreakdown, ['payout_amount', 'amount'])
        ?? amount(withdrawalLedgerMeta, ['payout_amount']),
      payout_amount_usd: amount(primaryWithdrawalBreakdown, ['payout_amount_usd', 'amount_usd'])
        ?? amount(withdrawalLedgerMetaBreakdown, ['payout_amount_usd', 'amount_usd'])
        ?? amount(withdrawalLedgerMeta, ['payout_amount_usd', 'amount_usd']),
      fee: amount(primaryWithdrawalBreakdown, ['fee', 'withdrawal_fee'])
        ?? amount(withdrawalLedgerMetaBreakdown, ['fee', 'withdrawal_fee'])
        ?? amount(withdrawalLedgerMeta, ['fee', 'withdrawal_fee']),
      fee_usd: amount(primaryWithdrawalBreakdown, ['fee_usd', 'withdrawal_fee_usd'])
        ?? amount(withdrawalLedgerMetaBreakdown, ['fee_usd', 'withdrawal_fee_usd'])
        ?? amount(withdrawalLedgerMeta, ['fee_usd', 'withdrawal_fee_usd']),
      total_debit: amount(primaryWithdrawalBreakdown, ['total_debit'])
        ?? amount(withdrawalLedgerMetaBreakdown, ['total_debit'])
        ?? amount(withdrawalLedgerMeta, ['total_debit'])
        ?? amount(withdrawalWalletTransaction ?? {}, ['amount']),
      total_debit_usd: amount(primaryWithdrawalBreakdown, ['total_debit_usd'])
        ?? amount(withdrawalLedgerMetaBreakdown, ['total_debit_usd'])
        ?? amount(withdrawalLedgerMeta, ['total_debit_usd']),
      exchange_rate: amount(primaryWithdrawalBreakdown, ['exchange_rate'])
        ?? amount(withdrawalLedgerMetaBreakdown, ['exchange_rate'])
        ?? amount(withdrawalLedgerMeta, ['exchange_rate']),
      currency: first(
        primaryWithdrawalBreakdown,
        ['wallet_currency', 'currency', 'fee_currency', 'total_debit_currency'],
        first(
          withdrawalLedgerMetaBreakdown,
          ['wallet_currency', 'currency'],
          first(withdrawalLedgerMeta, ['wallet_currency', 'currency'],
            first(withdrawalWalletTransaction ?? {}, ['wallet_currency', 'currency'])),
        ),
      ),
      payment_method: first(
        primaryWithdrawalBreakdown,
        ['payment_method', 'method'],
        first(withdrawalLedgerMetaBreakdown, ['payment_method', 'method'],
          first(withdrawalLedgerMeta, ['payment_method', 'method'])),
      ),
    }
    : primaryWithdrawalBreakdown;
  const hasWithdrawalBreakdown = Object.keys(withdrawalBreakdown).length > 0;
  const transactionId = first(transaction, ['id', 'transaction_id'], id);
  const title = kind === 'deposit'
    ? 'Deposit'
    : kind === 'withdrawal'
      ? 'Withdrawal'
      : first(transaction, ['description', 'title'], first(transaction, ['type', 'transaction_type'], 'Transaction'));
  const currency = first(
    transaction,
    ['currency', 'amount_currency'],
    first(meta, ['currency', 'wallet_currency'], first(withdrawalLedgerMeta, ['currency', 'wallet_currency'])),
  );
  const breakdownCurrency = first(
    withdrawalBreakdown,
    ['currency', 'wallet_currency', 'fee_currency', 'total_debit_currency'],
    currency,
  );
  const reportedAmount = amount(transaction, ['amount'])
    ?? (kind === 'withdrawal' ? amount(withdrawalBreakdown, ['payout_amount']) : null);
  const amountLabel = reportedAmount === null
    ? 'Not recorded'
    : money(
      reportedAmount,
      (hasWithdrawalBreakdown ? breakdownCurrency : currency) || 'USD',
      { preserveSource: kind === 'withdrawal' || hasWithdrawalBreakdown },
    );
  const status = first(transaction, ['review_status', 'status', 'state'], unavailable);
  const formatRecordedAmount = (keys: string[], usdKeys: string[] = []) => {
    const value = amount(withdrawalBreakdown, keys);
    const storedUsdAmount = amount(withdrawalBreakdown, usdKeys);
    if (value === null) {
      return storedUsdAmount === null
        ? 'Not recorded'
        : money(storedUsdAmount, 'USD', { preserveSource: true });
    }
    const usdAmount = savedUsdEquivalentForRecordedAmount(
      value,
      breakdownCurrency,
      storedUsdAmount,
      exchangeRate,
    );
    const sourceAmount = breakdownCurrency
      ? money(value, breakdownCurrency, { preserveSource: true })
      : value.toFixed(2);
    return breakdownCurrency.trim().toUpperCase() !== 'USD' && usdAmount !== null
      ? `${sourceAmount} (${money(usdAmount, 'USD', { preserveSource: true })} USD equivalent)`
      : sourceAmount;
  };
  const exchangeRate = amount(withdrawalBreakdown, ['exchange_rate']);
  const exchangeRateLabel = exchangeRate === null
    ? breakdownCurrency.trim().toUpperCase() === 'USD' ? 'Not applicable (USD)' : 'Not recorded'
    : `1 USD = ${exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${breakdownCurrency || 'PKR'}`;
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState('');

  async function saveReceipt() {
    setReceiptBusy(true);
    setReceiptError('');
    try {
      const receiptKind = isWithdrawalTransaction
        ? 'withdrawal'
        : kind === 'wallet'
          ? 'transaction'
          : kind;
      await saveTransactionReceipt(createTransactionReceipt(receiptKind, transaction));
    } catch (error) {
      setReceiptError(messageOf(error));
    } finally {
      setReceiptBusy(false);
    }
  }

  return <Screen title="Transaction details" subtitle="Transaction information reported by OG Exports">
    {query.isLoading ? <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 10 }}>Loading transaction details…</Text>
    </Card> : null}
    {query.isError ? <ErrorState message="Transaction details could not be loaded." error={query.error} onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError && hasRecord && transactionId ? <>
      <Card style={{ padding: 18 }}>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <Text selectable style={{ color: colors.primary, fontSize: 24, fontWeight: '700', marginTop: 10 }}>{amountLabel}</Text>
        <View style={{ marginTop: 12 }}><Status value={status} /></View>
      </Card>
      <Section title="Transaction record" />
      <Card>
        <DetailLine label="Transaction ID" value={transactionId} />
        <DetailLine label="Type" value={kind === 'wallet' ? first(transaction, ['type', 'transaction_type'], unavailable) : title} />
        <DetailLine label="Status" value={status} />
        <DetailLine label="Amount" value={amountLabel} />
        <DetailLine label="Date / time" value={formatDateTime(first(transaction, ['created_at', 'occurred_at', 'date']))} />
        <DetailLine label="Reference" value={first(transaction, ['reference', 'transaction_reference', 'deposit_reference', 'withdraw_id'], unavailable)} />
        <DetailLine label="Payment method" value={paymentMethod} />
        {first(meta, ['investment_id']) ? <DetailLine label="Investment ID" value={first(meta, ['investment_id'])} /> : null}
        {first(meta, ['trade_id', 'trade_reference']) ? <DetailLine label="Trade ID" value={first(meta, ['trade_id', 'trade_reference'])} /> : null}
      </Card>
      {relatedInvestmentId || relatedTradeId ? <>
        <Section title="Related records" />
        <Card style={{ gap: 8 }}>
          {relatedInvestmentId ? <Pressable
            testID="transaction-related-investment"
            accessibilityRole="link"
            accessibilityLabel={`View investment ${relatedInvestmentId}`}
            onPress={() => router.push({ pathname: '/position/[id]', params: { id: relatedInvestmentId } })}
            style={({ pressed }) => ({ alignSelf: 'flex-start', paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>View investment {relatedInvestmentId}</Text>
          </Pressable> : null}
          {relatedTradeId ? <Pressable
            testID="transaction-related-trade"
            accessibilityRole="link"
            accessibilityLabel={`View trade ${relatedTradeId}`}
            onPress={() => router.push({ pathname: '/project/[id]', params: { id: relatedTradeId } })}
            style={({ pressed }) => ({ alignSelf: 'flex-start', paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>View trade {relatedTradeId}</Text>
          </Pressable> : null}
        </Card>
      </> : null}
      {hasWithdrawalBreakdown ? <>
        <Section title="Withdrawal breakdown" />
        <Card>
          <DetailLine label="Requested bank payout" value={formatRecordedAmount(['payout_amount', 'amount'], ['payout_amount_usd', 'amount_usd'])} />
          <DetailLine label="Withdrawal fee" value={formatRecordedAmount(['fee', 'withdrawal_fee'], ['fee_usd', 'withdrawal_fee_usd'])} />
          <DetailLine label="Total wallet debit" value={formatRecordedAmount(['total_debit'], ['total_debit_usd'])} />
          <DetailLine label="Currency" value={breakdownCurrency || 'Not recorded'} />
          <DetailLine label="Saved exchange rate" value={exchangeRateLabel} />
        </Card>
      </> : null}
      {receiptError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, marginTop: 8 }}>{receiptError}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: receiptBusy }}
        disabled={receiptBusy}
        onPress={() => void saveReceipt()}
        style={{ alignSelf: 'flex-start', paddingVertical: 12 }}
      >
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
          {receiptBusy ? 'Preparing receipt…' : 'Save / share receipt'}
        </Text>
      </Pressable>
    </> : null}
    {!query.isLoading && !query.isError && !id ? <ErrorState message="This transaction link is invalid." /> : null}
    {!query.isLoading && !query.isError && Boolean(id) && !hasRecord ? <ErrorState message="This transaction was not found in your account." /> : null}
    {!query.isLoading && query.isError && query.error && String(query.error).includes('404') ? <Text accessibilityRole="alert" style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 8 }}>This transaction was not found in your account.</Text> : null}
    <Pressable accessibilityRole="button" onPress={() => router.replace('/account/transactions')} style={{ alignSelf: 'flex-start', paddingVertical: 14 }}>
      <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Open transaction history</Text>
    </Pressable>
  </Screen>;
}
