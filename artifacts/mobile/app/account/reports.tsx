import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useGetInvestorReports, useCreateInvestorReport, useGetInvestorStatement } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Screen, Status } from '@/components/InvestorUI';
import { amount as readAmount, first, list, messageOf, money, record, unwrap } from '@/lib/data';
import { shareInvestorFile } from '@/lib/file-download';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { localizedAlert as Alert } from '@/lib/strings';

const reportTypes = ['portfolio', 'profit', 'monthly', 'annual'];

function formatInfo(value: string) {
  const format = value.toLowerCase();
  if (format === 'csv') return { extension: 'csv', mimeType: 'text/csv' };
  if (format === 'excel' || format === 'xls' || format === 'xlsx') {
    return { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }
  return { extension: 'pdf', mimeType: 'application/pdf' };
}

function monthLabel(value: string) {
  const date = new Date(`${value}-01T12:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(date);
}

export default function Reports() {
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const query = useGetInvestorReports({ query: { queryKey: ['investor-reports'], enabled: !!token, staleTime: 30_000 } });
  const [selectedMonth, setSelectedMonth] = useState('');
  const statementQuery = useGetInvestorStatement(selectedMonth ? { month: selectedMonth } : {}, {
    query: { queryKey: ['investor-statement', selectedMonth || 'current'], enabled: !!token, staleTime: 60_000 },
  });
  const create = useCreateInvestorReport();
  const reports = list(query.data);
  const statement = record(unwrap(statementQuery.data));
  const [reportType, setReportType] = useState('monthly');
  const [error, setError] = useState('');
  const [downloadId, setDownloadId] = useState('');
  const [statementError, setStatementError] = useState('');
  const [statementDownloadMonth, setStatementDownloadMonth] = useState('');
  const currency = first(statement, ['currency']);
  const selectedStatementMonth = first(statement, ['month']) || selectedMonth;
  const availableMonths = Array.isArray(statement.available_months)
    ? statement.available_months.filter((value): value is string => typeof value === 'string')
    : [];
  const statementTransactions = list(statement.transactions);

  function statementAmount(field: string) {
    const value = readAmount(statement, [field]);
    return value !== null && currency ? money(value, currency) : 'Not provided by OG Exports';
  }

  async function generate() {
    setError('');
    try {
      const response = await create.mutateAsync({ data: { report_type: reportType, format: 'pdf' } });
      const payload = unwrap(response);
      const report = record(payload.report);
      const url = first(payload, ['download_url']);
      if (!url) throw new Error('The report was created, but the server did not return its download address.');
      await shareInvestorFile(url, first(report, ['name'], 'OG Exports investor report'), apiOrigin, 'application/pdf', 'pdf');
      Alert.alert('Report ready', 'Your report is available to save or share.');
      void query.refetch();
    } catch (err) { setError(messageOf(err)); }
  }

  async function downloadStatement() {
    if (!selectedStatementMonth) {
      setStatementError('The server has not returned a statement month yet.');
      return;
    }
    setStatementError('');
    setStatementDownloadMonth(selectedStatementMonth);
    try {
      await shareInvestorFile(
        `/api/investor/statements/${encodeURIComponent(selectedStatementMonth)}/pdf`,
        `OG Exports statement ${selectedStatementMonth}`,
        apiOrigin,
        'application/pdf',
        'pdf',
      );
    } catch (err) { setStatementError(messageOf(err)); }
    finally { setStatementDownloadMonth(''); }
  }

  async function download(report: Record<string, unknown>) {
    const id = first(report, ['id']);
    if (!id) { setError('This report does not have a downloadable record ID.'); return; }
    setError('');
    setDownloadId(id);
    const name = first(report, ['name', 'title'], 'OG Exports investor report');
    const { extension, mimeType } = formatInfo(first(report, ['format', 'type'], 'pdf'));
    try {
      await shareInvestorFile(`/api/investor/reports/${encodeURIComponent(id)}/download`, name, apiOrigin, mimeType, extension);
    } catch (err) { setError(messageOf(err)); }
    finally { setDownloadId(''); }
  }

  return <Screen title="Investor statements & reports" subtitle="Monthly wallet activity and downloadable account reports">
    <Card style={{ gap: 12 }}>
      <View>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Monthly statement</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 4 }}>Opening balance, posted wallet movements and closing balance in your wallet currency.</Text>
      </View>
      {availableMonths.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {availableMonths.map(month => {
          const active = month === selectedStatementMonth;
          return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} testID={`statement-month-${month}`} key={month} onPress={() => {
            setSelectedMonth(month);
            setStatementError('');
          }} style={{ borderRadius: 18, paddingVertical: 8, paddingHorizontal: 13, backgroundColor: active ? colors.primary : colors.secondary, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
            <Text style={{ color: active ? colors.primaryForeground : colors.foreground, fontSize: 12, fontWeight: '700' }}>{monthLabel(month)}</Text>
          </Pressable>;
        })}
      </ScrollView> : null}
      {statementQuery.isError ? <ErrorState message="The monthly statement could not be loaded from OG Exports." onRetry={() => void statementQuery.refetch()} /> : null}
      {statementQuery.isLoading ? <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Loading monthly statement…</Text> : null}
      {!statementQuery.isLoading && !statementQuery.isError && selectedStatementMonth ? <>
        <View style={{ borderRadius: 16, backgroundColor: colors.secondary, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Opening balance</Text>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'right' }}>{statementAmount('opening_balance')}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          {[
            ['Deposits', 'deposits'],
            ['Investments', 'investments'],
            ['Principal returned', 'principal_returns'],
            ['Distributions · profit only', 'distributions'],
            ['Withdrawals', 'withdrawals'],
            ['Other movements · net', 'other_movements'],
          ].map(([label, field]) => <View key={field} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{label}</Text>
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right' }}>{statementAmount(field)}</Text>
          </View>)}
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>Closing balance</Text>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '800', textAlign: 'right' }}>{statementAmount('closing_balance')}</Text>
          </View>
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>Balances include available and reserved pending wallet funds. Pending requests are not posted movements; investment profits are separated from returned principal.</Text>
        {statementTransactions.length ? <View style={{ gap: 8 }}>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>Posted transactions</Text>
          {statementTransactions.map((item, index) => {
            const id = first(item, ['transaction_id', 'id'], String(index));
            const amount = readAmount(item, ['amount']);
            const itemCurrency = first(item, ['currency'], currency);
            const principal = readAmount(item, ['principal_return']);
            const profit = readAmount(item, ['distribution_amount']);
            return <View key={id} style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>{first(item, ['type'], 'Wallet transaction').replace(/[_-]+/g, ' ')}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{first(item, ['reference'], 'Reference not provided')} · {first(item, ['date_time'], '')}</Text>
                  {principal !== null && profit !== null ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>Principal {money(principal, itemCurrency)} · Profit {money(profit, itemCurrency)}</Text> : null}
                </View>
                <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>{amount !== null && itemCurrency ? `${first(item, ['direction']) === 'debit' ? '− ' : '+ '}${money(amount, itemCurrency)}` : 'Not provided by OG Exports'}</Text>
              </View>
            </View>;
          })}
        </View> : <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>No posted wallet movements for this month.</Text>}
        {statementError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18 }}>{statementError}</Text> : null}
        <Action title="Download / share monthly PDF" icon="download" loading={statementDownloadMonth === selectedStatementMonth} onPress={() => void downloadStatement()} />
      </> : null}
    </Card>

    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 10 }}>Generate an investment report</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {reportTypes.map(value => <Pressable accessibilityRole="button" key={value} onPress={() => setReportType(value)} style={{ borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: reportType === value ? colors.primary : colors.secondary }}>
          <Text style={{ color: reportType === value ? colors.primaryForeground : colors.foreground, textTransform: 'capitalize', fontWeight: '700', fontSize: 12 }}>{value}</Text>
        </Pressable>)}
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>A PDF statement will be generated from your investor account records.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Generate and download PDF" icon="file-text" loading={create.isPending} onPress={() => void generate()} />
    </Card>

    <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginVertical: 10 }}>Previous reports</Text>
    {query.isError ? <ErrorState message="Your report history could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading reports…</Text></Card> : null}
    {!query.isLoading && !query.isError && reports.length === 0 ? <EmptyState title="No reports yet" body="Generated account reports will be listed here." /> : null}
    {reports.map((item, index) => {
      const id = first(item, ['id', 'reference'], String(index));
      const name = first(item, ['name', 'title', 'period'], 'Investor report');
      return <Card key={id} style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{first(item, ['format', 'type'], 'PDF').toUpperCase().slice(0, 4)}</Text>
          </View>
          <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>{name}</Text><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>{first(item, ['date_label', 'created_at', 'date'], '')}</Text></View>
          <Status value={first(item, ['status', 'state'], 'Not provided')} />
        </View>
        <Pressable accessibilityRole="button" onPress={() => void download(item)} disabled={downloadId === first(item, ['id'])} style={{ paddingVertical: 8 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{downloadId === first(item, ['id']) ? 'Preparing file…' : 'Download report'}</Text>
        </Pressable>
      </Card>;
    })}
  </Screen>;
}