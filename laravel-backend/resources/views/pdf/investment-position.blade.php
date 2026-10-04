<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Investment {{ $investmentReference }}</title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2933; margin: 32px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #0F3D2E; }
    h2 { font-size: 12px; margin: 18px 0 8px; color: #0F3D2E; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .muted { color: #6b7280; font-size: 11px; }
    .header { border-bottom: 2px solid #0F3D2E; padding-bottom: 12px; margin-bottom: 16px; }
    .brand { font-size: 14px; font-weight: bold; color: #D4A012; letter-spacing: 0.5px; }
    .badge { display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: bold; border: 1px solid #d1d5db; border-radius: 4px; margin-right: 4px; }
    .grid { width: 100%; margin-bottom: 8px; }
    .grid td { vertical-align: top; padding: 6px 8px 6px 0; }
    .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; }
    .value { font-weight: bold; font-size: 12px; }
    .stages { width: 100%; margin-top: 4px; }
    .stages td { padding: 3px 0; font-size: 11px; }
    .stage-done { color: #059669; }
    .stage-current { color: #0F3D2E; font-weight: bold; }
    .stage-pending { color: #9ca3af; }
    .footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">OG EXPORTS</div>
    <h1>Investment Position</h1>
    <div class="muted">Generated {{ $generatedAt }}</div>
  </div>

  <table class="grid">
    <tr>
      <td width="60%">
        <div class="label">Project</div>
        <div class="value">{{ $projectTitle }}</div>
        <div style="margin-top:6px;">
          <span class="badge">{{ $tradeLabel }}</span>
          <span class="badge">{{ $projectStatusLabel }}</span>
          @if($investmentStatusLabel && $investmentStatusLabel !== $projectStatusLabel)
            <span class="badge">{{ $investmentStatusLabel }}</span>
          @endif
        </div>
      </td>
      <td width="40%">
        <div class="label">Investor</div>
        <div class="value">{{ $user->name ?? '—' }}</div>
        <div class="muted">{{ $user->email ?? '' }}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Investment Reference</div>
        <div class="value">{{ $investmentReference ?: '—' }}</div>
      </td>
      <td>
        <div class="label">Project Reference</div>
        <div class="value">{{ $projectReference ?: '—' }}</div>
      </td>
    </tr>
  </table>

  <h2>Shipment Details</h2>
  <table class="grid">
    <tr>
      <td width="50%">
        <div class="label">Container</div>
        <div class="value">{{ $containerLabel }}</div>
        <div class="muted">{{ $commodity }}</div>
      </td>
      <td width="50%">
        <div class="label">Vessel / Voyage</div>
        <div class="value">{{ $vessel }}</div>
        <div class="muted">{{ $shippingLine }}@if($voyage) · {{ $voyage }}@endif</div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Route · {{ $incoterm }}</div>
        <div class="value">{{ $portOfLoading }}</div>
        <div class="muted">↓</div>
        <div class="value">{{ $portOfDischarge }}</div>
      </td>
      <td>
        <div class="label">Commodity</div>
        <div class="value">{{ $commodity }}</div>
      </td>
    </tr>
  </table>

  <h2>Trade Progress</h2>
  <table class="grid">
    <tr>
      <td width="33%">
        <div class="label">Invested</div>
        <div class="value">{{ $investedAt }}</div>
      </td>
      <td width="33%">
        <div class="label">ETD</div>
        <div class="value">{{ $etd }}</div>
      </td>
      <td width="34%">
        <div class="label">ETA</div>
        <div class="value">{{ $eta }}</div>
      </td>
    </tr>
    <tr>
      <td colspan="3">
        <div class="label">Investment Period</div>
        <div class="value">{{ $periodDays }} days</div>
      </td>
    </tr>
  </table>
  <table class="stages">
    @foreach($stages as $stage)
      <tr>
        <td class="{{ $stage['class'] }}">
          @if($stage['state'] === 'done')✓ @elseif($stage['state'] === 'current')● @else○ @endif
          {{ $stage['label'] }}
        </td>
      </tr>
    @endforeach
  </table>

  <h2>Investment Financials</h2>
  <table class="grid">
    <tr>
      <td width="50%">
        <div class="label">Invested</div>
        <div class="value">{{ $amountFormatted }}</div>
        @if($amountPkrFormatted)
          <div class="muted">{{ $amountPkrFormatted }}</div>
        @endif
      </td>
      <td width="50%">
        <div class="label">Expected / Realized Profit</div>
        <div class="value">+{{ $profitFormatted }}</div>
        @if($profitPkrFormatted)
          <div class="muted">+{{ $profitPkrFormatted }}</div>
        @endif
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">ROI</div>
        <div class="value">{{ $roiFormatted }}%</div>
      </td>
      <td>
        <div class="label">Total Return</div>
        <div class="value">{{ $totalReturnFormatted }}</div>
        @if($totalReturnPkrFormatted)
          <div class="muted">{{ $totalReturnPkrFormatted }}</div>
        @endif
      </td>
    </tr>
    @if($exchangeRateFormatted)
    <tr>
      <td colspan="2">
        <div class="label">Exchange Rate</div>
        <div class="value">{{ $exchangeRateFormatted }}</div>
      </td>
    </tr>
    @endif
  </table>

  <div class="footer">
    OG Exports (Pvt) Ltd · Investment position summary · This document was generated from the investor portal.
  </div>
</body>
</html>
