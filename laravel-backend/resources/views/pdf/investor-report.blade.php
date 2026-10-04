<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{ $report_type_label }}</title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2933; margin: 28px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #0F3D2E; }
    h2 { font-size: 14px; margin: 22px 0 8px; color: #0F3D2E; }
    .muted { color: #6b7280; font-size: 11px; }
    .header { border-bottom: 2px solid #0F3D2E; padding-bottom: 12px; margin-bottom: 18px; }
    .brand { font-size: 13px; font-weight: bold; color: #D4A012; letter-spacing: 0.5px; }
    .summary { width: 100%; margin-bottom: 16px; }
    .summary td { padding: 6px 8px 6px 0; vertical-align: top; }
    .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { font-weight: bold; font-size: 13px; }
    table.data { width: 100%; border-collapse: collapse; margin-top: 6px; }
    table.data th, table.data td { border: 1px solid #e5e7eb; padding: 6px 7px; text-align: left; font-size: 10px; }
    table.data th { background: #f3f4f6; color: #374151; text-transform: uppercase; letter-spacing: 0.4px; }
    .footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">OG EXPORTS</div>
    <h1>{{ $report_type_label }}</h1>
    <div class="muted">Generated {{ $generated_at }}</div>
    @if($start_date || $end_date)
      <div class="muted">Period: {{ $start_date ?: '—' }} to {{ $end_date ?: '—' }}</div>
    @endif
  </div>

  <table class="summary">
    <tr>
      <td width="50%">
        <div class="label">Investor</div>
        <div class="value">{{ $user->name ?? '—' }}</div>
        <div class="muted">{{ $user->email ?? '' }}</div>
      </td>
      <td width="50%">
        <div class="label">Investments</div>
        <div class="value">{{ $summary['investments_count'] }}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Total Invested</div>
        <div class="value">{{ $summary['total_invested_label'] ?? number_format((float) $summary['total_invested'], 2) }}</div>
      </td>
      <td>
        <div class="label">Total Profit Earned</div>
        <div class="value">{{ $summary['total_profit_earned_label'] ?? number_format((float) $summary['total_profit_earned'], 2) }}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Lifetime ROI</div>
        <div class="value">{{ number_format((float) $summary['lifetime_roi'], 2) }}%</div>
      </td>
      <td></td>
    </tr>
  </table>

  <h2>Investments</h2>
  @if(count($investments) === 0)
    <p class="muted">No investments in this period.</p>
  @else
    <table class="data">
      <thead>
        <tr>
          <th>Reference</th>
          <th>Project</th>
          <th>Type</th>
          <th>Status</th>
          <th>Amount</th>
          <th>Profit</th>
          <th>ROI %</th>
          <th>Invested</th>
        </tr>
      </thead>
      <tbody>
        @foreach($investments as $row)
          <tr>
            <td>{{ $row['reference'] }}</td>
            <td>{{ $row['project'] }}</td>
            <td>{{ $row['type'] }}</td>
            <td>{{ $row['status'] }}</td>
            <td>{{ $row['amount_label'] ?? number_format((float) $row['amount'], 2) }}</td>
            <td>{{ $row['profit_label'] ?? number_format((float) $row['profit'], 2) }}</td>
            <td>{{ number_format((float) $row['roi'], 2) }}</td>
            <td>{{ $row['invested_at'] }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  @endif

  <h2>Profit Distributions</h2>
  @if(count($distributions) === 0)
    <p class="muted">No profit distributions in this period.</p>
  @else
    <table class="data">
      <thead>
        <tr>
          <th>Project</th>
          <th>Invested</th>
          <th>Profit</th>
          <th>ROI %</th>
          <th>Distributed</th>
        </tr>
      </thead>
      <tbody>
        @foreach($distributions as $row)
          <tr>
            <td>{{ $row['project'] }}</td>
            <td>{{ $row['invested_amount_label'] ?? number_format((float) $row['invested_amount'], 2) }}</td>
            <td>{{ $row['profit_amount_label'] ?? number_format((float) $row['profit_amount'], 2) }}</td>
            <td>{{ number_format((float) $row['roi_pct'], 2) }}</td>
            <td>{{ $row['distributed_at'] }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  @endif

  @if(count($wallet_profits) > 0)
    <h2>Wallet Profit Credits</h2>
    <table class="data">
      <thead>
        <tr>
          <th>Type</th>
          <th>Amount</th>
          <th>Reference</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        @foreach($wallet_profits as $row)
          <tr>
            <td>{{ $row['type'] }}</td>
            <td>{{ $row['amount_label'] ?? number_format((float) $row['amount'], 2) }}</td>
            <td>{{ $row['reference'] }}</td>
            <td>{{ $row['date'] }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  @endif

  <div class="footer">
    OG Exports — Investor report for internal portfolio tracking. Generated automatically from live account data.
  </div>
</body>
</html>
