import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useGetInvestorReports, useCreateInvestorReport } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Screen, Status } from '@/components/InvestorUI';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { shareInvestorFile } from '@/lib/file-download';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const reportTypes = ['portfolio', 'profit', 'monthly', 'annual'];

function formatInfo(value: string) {
  const format = value.toLowerCase();
  if (format === 'csv') return { extension: 'csv', mimeType: 'text/csv' };
  if (format === 'excel' || format === 'xls' || format === 'xlsx') {
    return { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }
  return { extension: 'pdf', mimeType: 'application/pdf' };
}

export default function Reports() {
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const query = useGetInvestorReports({ query: { queryKey: ['investor-reports'], enabled: !!token, staleTime: 30_000 } });
  const create = useCreateInvestorReport();
  const reports = list(query.data);
  const [reportType, setReportType] = useState('monthly');
  const [error, setError] = useState('');
  const [downloadId, setDownloadId] = useState('');

  async function generate() {
    setError('');
    try {
      const response = await create.mutateAsync({ data: { report_type: reportType, format: 'pdf' } });
      const payload = unwrap(response);
      const report = record(payload.report);
      const url = first(payload, ['download_url']);
      if (!url) throw new Error('The report was created, but the server did not return its download address.');
      await shareInvestorFile(url, first(report, ['name'], 'OG Exports investor report'), apiOrigin, 'application/pdf', 'pdf');
      Alert.alert('Report ready', 'Your statement is available to save or share.');
      void query.refetch();
    } catch (err) { setError(messageOf(err)); }
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

  return <Screen title="Reports" subtitle="Generate and download your investor statements">
    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 10 }}>Choose report type</Text>
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
          <Status value={first(item, ['status', 'state'], 'Ready')} />
        </View>
        <Pressable accessibilityRole="button" onPress={() => void download(item)} disabled={downloadId === first(item, ['id'])} style={{ paddingVertical: 8 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{downloadId === first(item, ['id']) ? 'Preparing file…' : 'Download report'}</Text>
        </Pressable>
      </Card>;
    })}
  </Screen>;
}