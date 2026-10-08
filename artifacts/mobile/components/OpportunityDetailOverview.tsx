import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Feather } from '@expo/vector-icons';
import { Action, Card, ErrorState, Section, Status } from '@/components/InvestorUI';
import { TradeProgressCard } from '@/components/TradeProgressCard';
import { amount, first, list, moneyToCurrency, record } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

type OpportunityDetailOverviewProps = {
  project: Record<string, unknown>;
  apiOrigin: string;
  canInvest: boolean;
  fundingClosed: boolean;
  profileLoading: boolean;
  profileError?: unknown;
  pageError: string;
  kycVerified: boolean;
  kycStatus: string;
  riskContent: string;
  riskLoading: boolean;
  riskError?: unknown;
  documentError: string;
  documentBusy: string;
  supportEmail: string;
  onBack: () => void;
  onInvest: () => void;
  onVerify: () => void;
  onRetryKyc: () => void;
  onRetryRisk: () => void;
  onViewDocument: (url: string) => void;
  onDownloadDocument: (document: Record<string, unknown>, url: string, key: string) => void;
  onSupport: () => void;
};

function projectImageUri(project: Record<string, unknown>, apiOrigin: string) {
  const raw = first(project, ['image_url', 'imageUrl', 'image_path', 'imagePath', 'cover_image_url', 'coverImageUrl']);
  if (/^(https?:|data:)/i.test(raw)) return raw;
  if (!raw || !apiOrigin) return '';
  return `${apiOrigin.replace(/\/+$/, '')}/${raw.replace(/^\/+/, '')}`;
}

function InformationRows({ rows }: { rows: [string, string][] }) {
  const colors = useColors();
  return <View style={{ paddingHorizontal: 16 }}>
    {rows.map(([label, value], index) => <View
      key={label}
      style={{
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        paddingVertical: 11,
        borderBottomWidth: index < rows.length - 1 ? 1 : 0,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ flex: 1, color: colors.mutedForeground, fontSize: 12 }}>{label}</Text>
      <Text selectable style={{ flex: 1.25, color: value === '—' ? colors.mutedForeground : colors.foreground, textAlign: 'right', fontSize: 12, lineHeight: 17, fontWeight: value === '—' ? '400' : '600' }}>{value}</Text>
    </View>)}
  </View>;
}

export function OpportunityDetailOverview({
  project,
  apiOrigin,
  canInvest,
  fundingClosed,
  profileLoading,
  profileError,
  pageError,
  kycVerified,
  kycStatus,
  riskContent,
  riskLoading,
  riskError,
  documentError,
  documentBusy,
  supportEmail,
  onBack,
  onInvest,
  onVerify,
  onRetryKyc,
  onRetryRisk,
  onViewDocument,
  onDownloadDocument,
  onSupport,
}: OpportunityDetailOverviewProps) {
  const colors = useColors();
  const [imageFailed, setImageFailed] = useState(false);
  const image = projectImageUri(project, apiOrigin);
  const tradeData = record(project.trade ?? project.project ?? project.trade_details);
  const projectTitle = first(project, ['commodity_name', 'commodity', 'title', 'name', 'project_name'], 'Trade opportunity');
  const description = first(project, ['description', 'summary']);
  const status = first(project, ['trade_status', 'project_status', 'funding_status', 'investment_status', 'availability_status', 'status', 'state'], 'Not reported');
  const direction = first(project, ['trade_direction', 'tradeDirection', 'direction']);
  const tradeType = first(project, ['type', 'project_type']);
  const tradeLabel = tradeType.toLowerCase() === 'container'
    ? `Container${direction ? ` ${direction}` : ''}`
    : direction || 'Trade opportunity';
  const currency = first(project, ['currency', 'investment_currency'], first(tradeData, ['currency', 'investment_currency'], 'USD'));
  const tradeId = first(project, ['trade_id', 'trade_code', 'code', 'reference'], '—');
  const container = record(project.container ?? project.container_tracking ?? project.container_details);
  const meta = record(project.meta);
  const containerNumber = first(
    container,
    ['container_number'],
    first(project, ['container_number', 'container_no'], first(meta, ['container_no', 'container_number', 'containerNumber'], '—')),
  );
  const containerSize = first(
    project,
    ['container_size', 'container_type', 'container_size_type'],
    first(container, ['container_size', 'container_type', 'container_size_type'], '—'),
  );
  const commodity = first(project, ['commodity_name', 'commodity'], '—');
  const totalValue = amount(project, ['total_value', 'total_trade_requirement', 'target_amount', 'funding_target', 'investment_requirement', 'amount']);
  const origin = first(project, ['origin', 'origin_country', 'from_country'], '—');
  const destination = first(project, ['destination', 'destination_country', 'to_country', 'destination_market'], '—');
  const portOfLoading = first(project, ['port_of_loading', 'loading_port'], first(container, ['port_of_loading'], origin));
  const portOfDischarge = first(project, ['port_of_discharge', 'destination_port'], first(container, ['destination_port'], destination));
  const shippingLine = first(project, ['shipping_line'], first(container, ['shipping_line'], '—'));
  const vessel = first(project, ['vessel_name', 'vessel'], first(container, ['vessel_name', 'vessel'], '—'));
  const incoterm = first(project, ['incoterm', 'trade_term'], '—');

  const target = amount(project, ['target_amount', 'funding_target', 'total_trade_requirement', 'investment_requirement', 'total_investment_required', 'amount']);
  const funded = amount(project, ['funded_amount', 'raised_amount', 'current_amount', 'current_funding']);
  const remaining = amount(project, ['remaining_amount', 'remaining_capacity', 'remaining_funding']);
  const pendingHolds = amount(project, ['pending_holds', 'pending_hold_amount', 'pending_holds_amount']);
  const investors = amount(project, ['investor_count', 'investors_count', 'total_investors', 'number_of_investors']);
  const minimum = amount(project, ['minimum_investment', 'min_investment', 'minimum_amount']);
  const progressValue = amount(project, ['funding_percentage', 'funding_progress_percent', 'funding_progress_pct', 'progress_percentage']);
  const progress = progressValue == null ? null : Math.max(0, Math.min(100, Math.round(progressValue)));
  const expectedReturn = first(project, ['roi_label', 'target_return', 'projected_return', 'expected_return', 'return_rate', 'roi'])
    || (amount(project, ['expected_return_pct']) == null ? '—' : `${amount(project, ['expected_return_pct'])}%`);
  const days = amount(project, ['investment_period_days', 'duration_days', 'trade_duration_days']);
  const term = first(project, ['investment_term', 'estimated_trade_cycle', 'trade_cycle', 'duration', 'term'], days == null ? '—' : `${days} days`);
  const formatMoney = (value: number | null) => moneyToCurrency(value, currency, 'USD');
  const documents = list(project.documents);
  const stageUpdates = list(project.stage_updates);
  const investmentButtonTitle = fundingClosed
    ? 'Funding closed'
    : !canInvest
      ? 'Availability not confirmed'
      : profileLoading
        ? 'Checking identity'
        : profileError
          ? 'Retry identity check'
          : kycVerified
            ? 'Invest now'
            : 'Verify identity to invest';

  return <>
    <Pressable
      testID="project-back-to-investments"
      accessibilityRole="button"
      accessibilityLabel="Back to investments"
      onPress={onBack}
      style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7 }}
    >
      <Feather name="arrow-left" size={15} color={colors.mutedForeground} />
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '600' }}>Back to Investments</Text>
    </Pressable>

    <Card style={{ padding: 0, overflow: 'hidden', borderColor: colors.border }}>
      <View style={{ height: 218, justifyContent: 'flex-end', backgroundColor: colors.primary }}>
        {image && !imageFailed ? <Image
          source={{ uri: image }}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
          accessible={false}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        /> : <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="package" size={42} color={colors.primaryForeground} />
        </View>}
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.foreground, opacity: 0.62 }} />
        <View style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.primary }}>
              <Text style={{ color: colors.primaryForeground, fontSize: 10, fontWeight: '700' }}>{tradeLabel}</Text>
            </View>
            {tradeId !== '—' ? <View style={{ borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.foreground }}>
              <Text numberOfLines={1} style={{ color: colors.card, fontSize: 10, fontWeight: '600' }}>{tradeId}</Text>
            </View> : null}
          </View>
          <Status value={status} />
        </View>
        <View style={{ paddingHorizontal: 17, paddingBottom: 17 }}>
          <Text numberOfLines={2} style={{ color: colors.primaryForeground, fontSize: 27, lineHeight: 32, fontWeight: '800' }}>{projectTitle}</Text>
          <Text style={{ color: colors.primaryForeground, opacity: 0.82, fontSize: 11, marginTop: 4 }}>{containerNumber !== '—' ? `Container ${containerNumber}` : 'Trade investment opportunity'}</Text>
        </View>
      </View>
    </Card>

    {pageError ? <ErrorState message={pageError} /> : null}
    <Section title="Investment snapshot" />
    <Card style={{ borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '800' }}>
          {progress == null ? 'Funding progress not reported' : `${progress}% funded`}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
          {investors == null ? 'Investor count not reported' : `${investors.toLocaleString()} ${investors === 1 ? 'investor' : 'investors'}`}
        </Text>
      </View>
      {progress != null ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }} style={{ height: 7, borderRadius: 5, backgroundColor: colors.secondary, overflow: 'hidden', marginTop: 11 }}>
        <View style={{ width: `${progress}%`, height: 7, borderRadius: 5, backgroundColor: colors.primary }} />
      </View> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{formatMoney(funded)} raised</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign: 'right' }}>{formatMoney(target)} target</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 9, marginTop: 13 }}>
        {[
          ['Remaining', formatMoney(remaining)],
          ['Pending holds', formatMoney(pendingHolds)],
        ].map(([label, value]) => <View key={label} style={{ flex: 1, padding: 11, borderRadius: 12, backgroundColor: colors.secondary }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{label}</Text>
          <Text numberOfLines={1} style={{ color: label === 'Remaining' ? colors.accent : colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{value}</Text>
        </View>)}
      </View>
      <View style={{ flexDirection: 'row', gap: 9, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
        {[
          ['Expected return', expectedReturn],
          ['Investment term', term],
          ['Minimum investment', formatMoney(minimum)],
        ].map(([label, value]) => <View key={label} style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 10 }}>{label}</Text>
          <Text numberOfLines={2} style={{ color: label === 'Expected return' ? colors.primary : colors.foreground, fontSize: 12, lineHeight: 16, fontWeight: '700', marginTop: 4 }}>{value}</Text>
        </View>)}
      </View>
      {profileError ? <View style={{ marginTop: 12 }}>
        <ErrorState message="Your verification status could not be confirmed. Retry before investing." error={profileError} onRetry={onRetryKyc} />
      </View> : null}
      {!fundingClosed && canInvest && !profileLoading && !profileError && !kycVerified ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 12 }}>Identity status: {kycStatus}</Text> : null}
      <View style={{ marginTop: 15 }}>
        <Action
          testID="project-invest-now"
          title={investmentButtonTitle}
          icon={fundingClosed ? 'lock' : kycVerified ? 'arrow-right' : 'shield'}
          disabled={fundingClosed || !canInvest || profileLoading || Boolean(profileError)}
          onPress={profileError ? onRetryKyc : kycVerified ? onInvest : onVerify}
        />
      </View>
      {fundingClosed ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 8, textAlign: 'center' }}>This opportunity is not accepting new investments.</Text> : null}
      {!fundingClosed && !canInvest ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 8, textAlign: 'center' }}>OG Exports has not confirmed that this opportunity is open for new investments.</Text> : null}
      {riskLoading ? <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 8, textAlign: 'center' }}>Official terms and risk disclosure are checked before submission.</Text> : null}
    </Card>

    <Section title="Investment overview" />
    <Card>
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>{commodity}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 8 }}>
        {description || 'OG Exports has not supplied an overview for this opportunity yet.'}
      </Text>
    </Card>

    <Section title="Container information" />
    <Card style={{ paddingVertical: 4 }}>
      <InformationRows rows={[
        ['Commodity', commodity],
        ['Container number', containerNumber],
        ['Container size', containerSize],
        ['Total value', formatMoney(totalValue)],
      ]} />
    </Card>

    <Section title="Shipment information" />
    <Card style={{ paddingVertical: 4 }}>
      <InformationRows rows={[
        ['Route', `${portOfLoading} → ${portOfDischarge}`],
        ['Incoterm', incoterm],
        ['Shipping line', shippingLine],
        ['Vessel name', vessel],
      ]} />
    </Card>

    <TradeProgressCard title="Project timeline" stageUpdates={stageUpdates} showPeriod={false} />

    <Section title="Documents" />
    <Card>
      {documents.length ? documents.map((rawDocument, index) => {
        const document = record(rawDocument);
        const key = first(document, ['id'], String(index));
        const name = first(document, ['title', 'original_name', 'name'], 'Project document');
        const viewUrl = first(document, ['view_url', 'url']);
        const downloadUrl = first(document, ['download_url']);
        return <View key={key} style={{ paddingVertical: 11, borderTopWidth: index ? 1 : 0, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Feather name="file-text" size={16} color={colors.primary} />
            <Text style={{ flex: 1, color: colors.foreground, fontSize: 12, fontWeight: '600' }}>{name}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Pressable accessibilityRole="button" disabled={!viewUrl || documentBusy === key} onPress={() => onViewDocument(viewUrl)} style={{ flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', opacity: viewUrl ? 1 : 0.5 }}>
              <Feather name="eye" size={15} color={colors.primary} /><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 12 }}>View</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={!downloadUrl || Boolean(documentBusy)} onPress={() => onDownloadDocument(document, downloadUrl, key)} style={{ flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', opacity: downloadUrl ? 1 : 0.5 }}>
              <Feather name="download" size={15} color={colors.primary} /><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 12 }}>{documentBusy === key ? 'Preparing…' : 'Download'}</Text>
            </Pressable>
          </View>
          {!viewUrl && !downloadUrl ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 8 }}>This document has no secure access link yet.</Text> : null}
        </View>;
      }) : <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Feather name="file-text" size={24} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginTop: 8 }}>No documents available</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign: 'center', marginTop: 4 }}>Documents for this opportunity will appear here when OG Exports uploads them.</Text>
      </View>}
      {documentError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, marginTop: 8 }}>{documentError}</Text> : null}
    </Card>

    <Section title="Risk disclosure" />
    <Card style={{ borderColor: colors.accent }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Feather name="alert-triangle" size={16} color={colors.accent} />
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>Investment risk</Text>
      </View>
      {riskLoading ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>Loading the published disclosure…</Text> : null}
      {riskError ? <ErrorState message="The published risk disclosure could not be loaded." error={riskError} onRetry={onRetryRisk} /> : null}
      {!riskLoading && !riskError && riskContent ? <Text selectable numberOfLines={6} style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19 }}>{riskContent}</Text> : null}
      {!riskLoading && !riskError && !riskContent ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19 }}>No additional risk disclosure is currently published. Review the Investment Agreement before confirming.</Text> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 16, marginTop: 9 }}>Returns are not guaranteed. Review the complete Investment Agreement before confirming.</Text>
    </Card>

    <Card style={{ backgroundColor: colors.secondary, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="headphones" size={15} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>Need help?</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 3 }}>Our investment team can answer questions about this trade.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Email investment support" onPress={onSupport} style={{ paddingVertical: 7, alignSelf: 'flex-start' }}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{supportEmail}</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  </>;
}
