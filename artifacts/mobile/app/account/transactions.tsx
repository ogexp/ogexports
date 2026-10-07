import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useLocalSearchParams } from 'expo-router';
import {
  useGetInvestorDeposits,
  useGetInvestorInvestments,
  useGetInvestorWallet,
  useGetInvestorWalletTransactions,
  useGetInvestorWithdrawals,
} from '@workspace/api-client-react';
import { Card, EmptyState, Field, LoadingCard, Screen, Status } from '@/components/InvestorUI';
import { amount as readAmount, first, Json, list, messageOf, money, record, unwrap } from '@/lib/data';
import { shareInvestorFile } from '@/lib/file-download';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { MOTION, MotionReveal, motionHaptic } from '@/lib/motion';
import { savedUsdEquivalentForRecordedAmount } from '@/lib/withdrawal-history';

type Filter = 'All' | 'Deposits' | 'Investments' | 'Withdrawals' | 'Distributions';
type Category = Exclude<Filter, 'All'> | 'Other';
type TransactionRow = {
  key: string;
  category: Category;
  title: string;
  transactionId: string;
  investmentId: string;
  tradeId: string;
  amount: number | null;
  currency: string;
  occurredAt: string;
  status: string;
  paymentMethod: string;
  reference: string;
  paymentReference: string;
  pdfPath: string;
  searchText: string;
  withdrawalBreakdown?: {
    payout: string;
    fee: string;
    totalDebit: string;
    exchangeRate: string;
  };
};

const filters: Filter[] = ['All', 'Deposits', 'Investments', 'Withdrawals', 'Distributions'];
const unavailable = '—';
const pageSize = 100;
const withdrawalStatuses = [
  { label: 'Any status', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Under review', value: 'review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paid', value: 'paid' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatDateTime(value: string) {
  if (!value) return unavailable;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatLabel(value: string) {
  if (!value) return unavailable;
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatWithdrawalAmount(
  value: number | null,
  currency: string,
  usdAmount: number | null,
  exchangeRate: number | null,
) {
  if (value === null) return 'Not recorded';
  const currencyCode = currency.trim().toUpperCase();
  if (!currencyCode) return `${value.toFixed(2)} (currency not recorded)`;

  const sourceAmount = money(value, currencyCode, { preserveSource: true });
  if (currencyCode === 'USD') return sourceAmount;

  const usdEquivalent = savedUsdEquivalentForRecordedAmount(value, currencyCode, usdAmount, exchangeRate);
  return usdEquivalent === null
    ? sourceAmount
    : `${sourceAmount} (${money(usdEquivalent, 'USD', { preserveSource: true })} USD equivalent)`;
}

function categoryForWalletTransaction(item: Json): Category {
  const type = `${first(item, ['type', 'transaction_type', 'category'])} ${first(item, ['description', 'title'])}`.toLowerCase();
  if (/deposit|top.?up|funding/.test(type)) return 'Deposits';
  if (/withdraw|payout/.test(type)) return 'Withdrawals';
  if (/distribution|profit|dividend|bonus|investment_return/.test(type)) return 'Distributions';
  if (/invest|purchase|participation/.test(type)) return 'Investments';
  return 'Other';
}

function safePdfPath(resource: string, id: string) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) return '';
  return `/api/investor/${resource}/${encodeURIComponent(id)}/pdf`;
}

function tradeIdFor(investment: Json, transaction?: Json) {
  const project = record(investment.project);
  const projectMeta = record(project.meta);
  const container = record(project.container);
  const transactionMeta = record(transaction?.meta);
  return first(investment, ['trade_id', 'trade_reference'],
    first(project, ['trade_id', 'trade_reference'],
      first(projectMeta, ['trade_id', 'trade_reference'],
        first(container, ['trade_id', 'trade_reference'],
          first(transactionMeta, ['trade_id', 'trade_reference'])))));
}

function lastPageFor(data: unknown) {
  const envelope = record(data);
  const meta = record(envelope.meta);
  return readAmount(meta, ['last_page']) ?? readAmount(envelope, ['last_page']);
}

function totalFor(data: unknown) {
  const envelope = record(data);
  const meta = record(envelope.meta);
  return readAmount(meta, ['total']) ?? readAmount(envelope, ['total']);
}

function filterFromRoute(value?: string): Filter | undefined {
  if (value === 'Wallet') return 'All';
  return filters.includes(value as Filter) ? value as Filter : undefined;
}

function isValidDateFilter(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border }}>
    <Text style={{ color: colors.mutedForeground, fontSize: 12, flex: 0.8 }}>{label}</Text>
    <Text selectable style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right', flex: 1.2 }}>{value || unavailable}</Text>
  </View>;
}

export default function Transactions() {
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const params = useLocalSearchParams<{ search?: string; tab?: string; selected?: string }>();
  const [filter, setFilter] = useState<Filter>(filterFromRoute(params.tab) ?? 'All');
  const [search, setSearch] = useState(typeof params.search === 'string' ? params.search : '');
  const [selectedId, setSelectedId] = useState(typeof params.selected === 'string' ? params.selected : '');
  const [page, setPage] = useState(1);
  const [serverReference, setServerReference] = useState('');
  const [withdrawalStatus, setWithdrawalStatus] = useState('');
  const [withdrawalDateFrom, setWithdrawalDateFrom] = useState('');
  const [withdrawalDateTo, setWithdrawalDateTo] = useState('');
  const [busyPdfKey, setBusyPdfKey] = useState('');
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    setFilter(filterFromRoute(typeof params.tab === 'string' ? params.tab : undefined) ?? 'All');
    setSearch(typeof params.search === 'string' ? params.search : '');
    setSelectedId(typeof params.selected === 'string' ? params.selected : '');
    setPage(1);
    setPdfError('');
  }, [params.tab, params.search, params.selected]);
  const invalidWithdrawalDate = filter === 'Withdrawals'
    && (!isValidDateFilter(withdrawalDateFrom) || !isValidDateFilter(withdrawalDateTo));
  const invalidWithdrawalDateRange = filter === 'Withdrawals'
    && !invalidWithdrawalDate
    && Boolean(withdrawalDateFrom && withdrawalDateTo && withdrawalDateTo < withdrawalDateFrom);
  const withdrawalDateError = invalidWithdrawalDate
    ? 'Use dates in YYYY-MM-DD format.'
    : invalidWithdrawalDateRange
      ? 'End date must be on or after the start date.'
      : '';

  useEffect(() => {
    const timeout = setTimeout(() => {
      setServerReference(filter === 'Withdrawals' ? search.trim() : '');
    }, 300);
    return () => clearTimeout(timeout);
  }, [filter, search]);

  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: Boolean(token), staleTime: 30_000 } });
  const walletTransactionsQuery = useGetInvestorWalletTransactions({ page, per_page: pageSize }, {
    query: { queryKey: ['investor-wallet-transactions', page, pageSize], enabled: Boolean(token), staleTime: 20_000 },
  });
  const depositsQuery = useGetInvestorDeposits({ page, per_page: pageSize }, {
    query: { queryKey: ['investor-deposits', page, pageSize], enabled: Boolean(token), staleTime: 20_000 },
  });
  const withdrawalsQuery = useGetInvestorWithdrawals({
    page,
    per_page: pageSize,
    ...(filter === 'Withdrawals' && serverReference ? { reference: serverReference } : {}),
    ...(filter === 'Withdrawals' && withdrawalStatus ? { status: withdrawalStatus } : {}),
    ...(filter === 'Withdrawals' && withdrawalDateFrom && isValidDateFilter(withdrawalDateFrom)
      ? { date_from: withdrawalDateFrom }
      : {}),
    ...(filter === 'Withdrawals' && withdrawalDateTo && isValidDateFilter(withdrawalDateTo)
      ? { date_to: withdrawalDateTo }
      : {}),
  }, {
    query: {
      queryKey: [
        'investor-withdrawals',
        page,
        pageSize,
        filter,
        serverReference,
        withdrawalStatus,
        withdrawalDateFrom,
        withdrawalDateTo,
      ],
      enabled: Boolean(token) && !withdrawalDateError,
      staleTime: 20_000,
    },
  });
  const investmentsQuery = useGetInvestorInvestments({ page, per_page: pageSize }, {
    query: { queryKey: ['investor-positions', page, pageSize], enabled: Boolean(token), staleTime: 30_000 },
  });

  const wallet = unwrap(walletQuery.data);
  const walletCurrency = first(wallet, ['currency']);
  const walletTransactions = list(walletTransactionsQuery.data);
  const deposits = list(depositsQuery.data);
  const withdrawals = list(withdrawalsQuery.data);
  const investments = list(investmentsQuery.data);
  const usedWalletTransactions = new Set<string>();
  const investmentById = new Map(investments.map(item => [first(item, ['id', 'investment_id']), item]));

  function findWalletTransaction(kind: 'deposit' | 'withdrawal' | 'investment', recordId: string, reference: string) {
    return walletTransactions.find(transaction => {
      const type = first(transaction, ['type', 'transaction_type']).toLowerCase();
      if (type !== kind) return false;
      const meta = record(transaction.meta);
      const metaId = first(meta, [`${kind}_id`, 'investment_id']);
      return Boolean(recordId && metaId === recordId) || Boolean(reference && first(transaction, ['reference']) === reference);
    });
  }

  function markWalletTransactionUsed(transaction?: Json) {
    if (!transaction) return;
    const id = first(transaction, ['id', 'transaction_id', 'reference']);
    if (id) usedWalletTransactions.add(id);
  }

  const rows: TransactionRow[] = [];

  deposits.forEach((deposit, index) => {
    const id = first(deposit, ['id']);
    const reference = first(deposit, ['reference', 'deposit_reference']);
    const matched = findWalletTransaction('deposit', id, reference);
    markWalletTransactionUsed(matched);
    const matchedMeta = record(matched?.meta);
    const key = `deposit:${id || reference || `${page}-${index}`}`;
    const title = first(deposit, ['description', 'bank_account_name'], 'Deposit');
    const paymentMethod = first(deposit, ['payment_method', 'method'], first(matchedMeta, ['payment_method', 'method']));
    const paymentReference = first(deposit, ['bank_reference', 'transfer_reference']);
    rows.push({
      key,
      category: 'Deposits',
      title,
      transactionId: matched ? first(matched, ['id', 'transaction_id']) : first(deposit, ['transaction_id']),
      investmentId: '',
      tradeId: '',
      amount: readAmount(deposit, ['amount']),
      currency: first(deposit, ['currency', 'original_currency']),
      occurredAt: first(deposit, ['created_at', 'date']),
      status: first(deposit, ['review_status', 'status']),
      paymentMethod,
      reference,
      paymentReference,
      pdfPath: safePdfPath('deposits', id) || (matched ? safePdfPath('wallet/transactions', first(matched, ['id'])) : ''),
      searchText: [id, reference, paymentReference, title, paymentMethod, first(deposit, ['status'])].join(' '),
    });
  });

  withdrawals.forEach((withdrawal, index) => {
    const id = first(withdrawal, ['id']);
    const reference = first(withdrawal, ['reference', 'withdraw_id']);
    const matched = findWalletTransaction('withdrawal', id, reference);
    markWalletTransactionUsed(matched);
    const bankDetails = record(withdrawal.bank_details);
    const currency = first(withdrawal, ['currency', 'amount_currency'], first(bankDetails, ['currency']));
    const exchangeRate = readAmount(withdrawal, ['exchange_rate']);
    const payout = readAmount(withdrawal, ['amount']);
    const payoutUsd = readAmount(withdrawal, ['amount_usd']);
    const fee = readAmount(withdrawal, ['fee', 'withdrawal_fee']);
    const feeUsd = readAmount(withdrawal, ['fee_usd', 'withdrawal_fee_usd']);
    const totalDebit = readAmount(withdrawal, ['total_debit']);
    const totalDebitUsd = readAmount(withdrawal, ['total_debit_usd']);
    const key = `withdrawal:${id || reference || `${page}-${index}`}`;
    const title = first(withdrawal, ['description'], 'Withdrawal');
    const paymentMethod = first(withdrawal, ['payment_method', 'method'], first(bankDetails, ['payment_method', 'method']));
    rows.push({
      key,
      category: 'Withdrawals',
      title,
      transactionId: matched ? first(matched, ['id', 'transaction_id']) : first(withdrawal, ['transaction_id']),
      investmentId: '',
      tradeId: '',
      amount: payout,
      currency,
      withdrawalBreakdown: {
        payout: formatWithdrawalAmount(payout, currency, payoutUsd, exchangeRate),
        fee: formatWithdrawalAmount(fee, currency, feeUsd, exchangeRate),
        totalDebit: formatWithdrawalAmount(totalDebit, currency, totalDebitUsd, exchangeRate),
        exchangeRate: exchangeRate === null
          ? 'Not recorded'
          : `1 USD = ${exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${currency || 'PKR'}`,
      },
      occurredAt: first(withdrawal, ['created_at', 'date']),
      status: first(withdrawal, ['status', 'state']),
      paymentMethod,
      reference,
      paymentReference: '',
      pdfPath: safePdfPath('withdrawals', id) || (matched ? safePdfPath('wallet/transactions', first(matched, ['id'])) : ''),
      searchText: [id, reference, title, paymentMethod, first(withdrawal, ['status'])].join(' '),
    });
  });

  investments.forEach((investment, index) => {
    const id = first(investment, ['id', 'investment_id']);
    const reference = first(investment, ['reference']);
    const matched = findWalletTransaction('investment', id, reference);
    markWalletTransactionUsed(matched);
    const project = record(investment.project);
    const meta = record(matched?.meta);
    const title = first(project, ['title', 'name'], first(investment, ['project_title'], 'Investment'));
    const paymentMethod = first(investment, ['payment_method', 'payment_source'], first(matched ?? {}, ['payment_method', 'method'], first(meta, ['payment_method', 'method'])));
    const key = `investment:${id || reference || `${page}-${index}`}`;
    rows.push({
      key,
      category: 'Investments',
      title,
      transactionId: matched ? first(matched, ['id', 'transaction_id']) : first(investment, ['transaction_id']),
      investmentId: id,
      tradeId: tradeIdFor(investment, matched),
      amount: readAmount(investment, ['amount', 'investment_amount', 'principal']),
      currency: first(investment, ['amount_currency', 'currency'], walletCurrency),
      occurredAt: first(investment, ['invested_at', 'created_at', 'date'], first(matched ?? {}, ['created_at', 'date'])),
      status: first(investment, ['status', 'state'], first(matched ?? {}, ['status', 'state'])),
      paymentMethod,
      reference: reference || first(matched ?? {}, ['reference']),
      paymentReference: '',
      pdfPath: safePdfPath('investments', id),
      searchText: [id, reference, title, paymentMethod, tradeIdFor(investment, matched), first(investment, ['status'])].join(' '),
    });
  });

  walletTransactions.forEach((transaction, index) => {
    const id = first(transaction, ['id', 'transaction_id']);
    const walletKey = id || first(transaction, ['reference']);
    if (walletKey && usedWalletTransactions.has(walletKey)) return;
    const category = categoryForWalletTransaction(transaction);
    if (filter === 'Withdrawals' && category === 'Withdrawals') return;
    const meta = record(transaction.meta);
    const investmentId = first(meta, ['investment_id'], first(transaction, ['investment_id']));
    const investment = investmentById.get(investmentId) ?? {};
    const title = first(transaction, ['description', 'title'], first(meta, ['project_title', 'project_name'], formatLabel(first(transaction, ['type', 'transaction_type'], 'Transaction'))));
    const paymentMethod = first(transaction, ['payment_method', 'method'], first(meta, ['payment_method', 'method']));
    const key = `wallet:${walletKey || `${page}-${index}`}`;
    rows.push({
      key,
      category,
      title,
      transactionId: id,
      investmentId,
      tradeId: tradeIdFor(investment, transaction),
      amount: readAmount(transaction, ['amount']),
      currency: first(transaction, ['currency'], first(meta, ['wallet_currency'], walletCurrency)),
      occurredAt: first(transaction, ['created_at', 'date']),
      status: first(transaction, ['status', 'state']),
      paymentMethod,
      reference: first(transaction, ['reference', 'transaction_reference']),
      paymentReference: '',
      pdfPath: safePdfPath('wallet/transactions', id),
      searchText: [id, investmentId, title, paymentMethod, first(transaction, ['reference']), first(transaction, ['type', 'transaction_type']), first(transaction, ['status'])].join(' '),
    });
  });

  rows.sort((a, b) => {
    const left = Date.parse(a.occurredAt);
    const right = Date.parse(b.occurredAt);
    if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : 0;
    if (!Number.isFinite(right)) return -1;
    return right - left;
  });

  const query = search.trim().toLowerCase();
  const filteredRows = rows.filter(row => {
    const matchesFilter = filter === 'All' || row.category === filter;
    const matchesSearch = !query || `${row.searchText} ${row.transactionId} ${row.investmentId} ${row.tradeId} ${row.reference} ${row.paymentReference} ${row.status} ${formatDateTime(row.occurredAt)} ${row.category}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
  const selectedRow = filteredRows.find(row => row.key === selectedId || row.transactionId === selectedId || row.reference === selectedId);

  const querySources = [
    { name: 'Wallet transactions', category: null as Filter | null, query: walletTransactionsQuery, data: walletTransactionsQuery.data },
    { name: 'Deposits', category: 'Deposits' as Filter, query: depositsQuery, data: depositsQuery.data },
    { name: 'Withdrawals', category: 'Withdrawals' as Filter, query: withdrawalsQuery, data: withdrawalsQuery.data },
    { name: 'Investments', category: 'Investments' as Filter, query: investmentsQuery, data: investmentsQuery.data },
  ].filter(source => filter === 'All'
    || (filter === 'Withdrawals'
      ? source.category === 'Withdrawals'
      : source.category === null || source.category === filter));
  const failedSources = querySources.filter(source => source.query.isError);
  const isLoading = querySources.some(source => source.query.isLoading);
  const hasNextPage = querySources.some(source => {
    const lastPage = lastPageFor(source.data);
    return lastPage != null ? page < lastPage : list(source.data).length >= pageSize;
  });

  async function accessPdf(row: TransactionRow) {
    if (!row.pdfPath) {
      setPdfError('A PDF receipt or statement is not available for this record.');
      return;
    }
    if (!apiOrigin) {
      setPdfError('Set the OG Exports investor server address in Settings before downloading.');
      return;
    }
    setBusyPdfKey(row.key);
    setPdfError('');
    try {
      const url = new URL(row.pdfPath, apiOrigin).toString();
      const name = `OG-Exports-${row.category}-${row.reference || row.transactionId || row.key}`;
      await shareInvestorFile(url, name, apiOrigin, 'application/pdf', 'pdf');
    } catch (error) {
      setPdfError(messageOf(error));
    } finally {
      setBusyPdfKey('');
    }
  }

  async function retryFailedSources() {
    await Promise.all(querySources.filter(source => source.query.isError).map(source => source.query.refetch()));
  }

  return <Screen title="Transactions" subtitle="Deposits, investments, withdrawals and distributions" refreshable>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
      {filters.map(item => {
        const active = filter === item;
        return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => {
          motionHaptic('micro');
          setFilter(item);
          setSelectedId('');
          setPage(1);
          setPdfError('');
        }} style={{ borderRadius: 18, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: active ? colors.primary : colors.secondary, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
          <Text style={{ color: active ? colors.primaryForeground : colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>{item}</Text>
        </Pressable>;
      })}
    </ScrollView>
    <Field
      label={filter === 'Withdrawals' ? 'Search withdrawal reference' : 'Search transactions'}
      value={search}
      onChangeText={value => {
        setPage(1);
        setSelectedId('');
        setSearch(value);
      }}
      placeholder={filter === 'Withdrawals' ? 'Reference' : 'ID, reference, trade, status or project'}
      autoCapitalize="none"
      maxLength={100}
    />
    {filter === 'Withdrawals' ? <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        {withdrawalStatuses.map(option => {
          const active = withdrawalStatus === option.value;
          return <Pressable
            key={option.value || 'any-status'}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              setPage(1);
              setSelectedId('');
              setWithdrawalStatus(option.value);
            }}
            style={{
              borderRadius: 18,
              paddingVertical: 8,
              paddingHorizontal: 13,
              backgroundColor: active ? colors.primary : colors.secondary,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: active ? colors.primaryForeground : colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>
              {option.label}
            </Text>
          </Pressable>;
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="From date (YYYY-MM-DD)"
            value={withdrawalDateFrom}
            onChangeText={value => {
              setPage(1);
              setSelectedId('');
              setWithdrawalDateFrom(value);
            }}
            placeholder="2026-01-31"
            maxLength={10}
            autoCapitalize="none"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="To date (YYYY-MM-DD)"
            value={withdrawalDateTo}
            onChangeText={value => {
              setPage(1);
              setSelectedId('');
              setWithdrawalDateTo(value);
            }}
            placeholder="2026-12-31"
            maxLength={10}
            autoCapitalize="none"
          />
        </View>
      </View>
      {withdrawalDateError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, marginBottom: 10 }}>{withdrawalDateError}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setPage(1);
          setSelectedId('');
          setSearch('');
          setServerReference('');
          setWithdrawalStatus('');
          setWithdrawalDateFrom('');
          setWithdrawalDateTo('');
        }}
        style={{ alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 8 }}
      >
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Clear withdrawal filters</Text>
      </Pressable>
    </> : null}
    {failedSources.length ? <Card style={{ borderColor: colors.destructive }}>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>Some records may be missing</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{failedSources.map(source => source.name).join(', ')} could not be loaded from OG Exports.</Text>
      <Pressable accessibilityRole="button" onPress={() => void retryFailedSources()} style={{ alignSelf: 'flex-start', paddingVertical: 9 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Retry unavailable sources</Text>
      </Pressable>
    </Card> : null}
    {walletQuery.isError ? <Card><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Wallet details could not be loaded. Amounts without a transaction currency are shown in USD.</Text></Card> : null}
    {isLoading ? <LoadingCard label="Loading transactions from OG Exports…" /> : null}
    {!isLoading && !filteredRows.length && !failedSources.length && !withdrawalDateError ? <EmptyState title={search ? 'No matching transactions' : `No ${filter.toLowerCase()} found`} body={search ? 'Try a different ID, reference or search term.' : 'Records returned by OG Exports will appear here.'} /> : null}

    {filteredRows.map((row, index) => {
      const active = selectedRow?.key === row.key;
      const amountLabel = row.category === 'Withdrawals'
        ? formatWithdrawalAmount(row.amount, row.currency, null, null)
        : money(row.amount, row.currency || 'USD');
      return <MotionReveal key={`${row.key}-${active}`} delay={Math.min(index * MOTION.revealStagger, MOTION.staggerCap)}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => {
        setSelectedId(active ? '' : row.key);
        setPdfError('');
      }}>
        <Card style={{ marginBottom: 10, borderColor: active ? colors.primary : colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>{row.title}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 5 }}>{formatLabel(row.category)} · {formatDateTime(row.occurredAt)}</Text>
            </View>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'right', maxWidth: '42%' }}>{amountLabel}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
            <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, flex: 1 }}>{row.reference || unavailable}</Text>
            <Status value={row.status || unavailable} />
          </View>
          {row.withdrawalBreakdown ? <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 2 }}>
            <DetailLine label="Payout" value={row.withdrawalBreakdown.payout} />
            <DetailLine label="Withdrawal fee" value={row.withdrawalBreakdown.fee} />
            <DetailLine label="Total wallet debit" value={row.withdrawalBreakdown.totalDebit} />
          </View> : null}
          {active ? <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 4 }}>
            <DetailLine label="Transaction ID" value={row.transactionId} />
            {row.category === 'Investments' || row.category === 'Distributions' || row.investmentId
              ? <DetailLine label="Investment ID" value={row.investmentId} />
              : null}
            {row.category === 'Investments' || row.category === 'Distributions' || row.tradeId
              ? <DetailLine label="Trade ID" value={row.tradeId} />
              : null}
            <DetailLine label="Amount" value={amountLabel} />
            {row.withdrawalBreakdown
              ? <DetailLine label="Saved exchange rate" value={row.withdrawalBreakdown.exchangeRate} />
              : null}
            <DetailLine label="Date / time" value={formatDateTime(row.occurredAt)} />
            <DetailLine label="Status" value={formatLabel(row.status)} />
            <DetailLine label="Payment method" value={formatLabel(row.paymentMethod)} />
            <DetailLine label="Reference" value={row.reference} />
            {row.paymentReference && row.paymentReference !== row.reference
              ? <DetailLine label="Payment reference" value={row.paymentReference} />
              : null}
            {pdfError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, marginTop: 9 }}>{pdfError}</Text> : null}
            <Pressable accessibilityRole="button" testID={`transaction-pdf-${row.key}`} disabled={!row.pdfPath || busyPdfKey === row.key} onPress={() => void accessPdf(row)} style={{ marginTop: 12, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: colors.secondary, opacity: !row.pdfPath || busyPdfKey === row.key ? 0.5 : 1 }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{busyPdfKey === row.key ? 'Preparing PDF…' : 'Access PDF receipt / statement'}</Text>
            </Pressable>
          </View> : null}
        </Card>
      </Pressable>
      </MotionReveal>;
    })}

    <View style={{ marginTop: 4, marginBottom: 18 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign: 'center', marginBottom: 9 }}>
        <Text>Page</Text> {page} · {filter === 'Withdrawals' && totalFor(withdrawalsQuery.data) != null
          ? totalFor(withdrawalsQuery.data)
          : filteredRows.length}{' '}
        <Text>{filter === 'Withdrawals' && totalFor(withdrawalsQuery.data) != null ? 'matching withdrawals' : 'records on this page'}</Text>
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <Pressable accessibilityRole="button" disabled={page === 1 || isLoading} onPress={() => { setPage(value => value - 1); setSelectedId(''); }} style={{ borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: colors.secondary, opacity: page === 1 || isLoading ? 0.45 : 1 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Previous</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!hasNextPage || isLoading} onPress={() => { setPage(value => value + 1); setSelectedId(''); }} style={{ borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: colors.secondary, opacity: !hasNextPage || isLoading ? 0.45 : 1 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Load older transactions</Text>
        </Pressable>
      </View>
    </View>
  </Screen>;
}
