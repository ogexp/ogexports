<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Deposit {{ $deposit->reference ?? $deposit->id }}</title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2933; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #0F3D2E; }
    .muted { color: #6b7280; font-size: 11px; }
    .header { border-bottom: 2px solid #0F3D2E; padding-bottom: 12px; margin-bottom: 20px; }
    .brand { font-size: 14px; font-weight: bold; color: #D4A012; letter-spacing: 0.5px; }
    .grid { width: 100%; margin-bottom: 18px; }
    .grid td { vertical-align: top; padding: 8px 8px 8px 0; }
    .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; }
    .value { font-weight: bold; font-size: 12px; }
    .footer { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">OG EXPORTS</div>
    <h1>Deposit Receipt</h1>
    <div class="muted">Generated {{ $generatedAt }}</div>
  </div>

  <table class="grid">
    <tr>
      <td width="50%">
        <div class="label">Deposit ID</div>
        <div class="value">{{ $deposit->reference ?: ('OGDEP-INV-'.str_pad((string) $deposit->id, 3, '0', STR_PAD_LEFT)) }}</div>
      </td>
      <td width="50%">
        <div class="label">Bank Reference</div>
        <div class="value">{{ $deposit->bank_reference ?: '—' }}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Investor</div>
        <div class="value">{{ $user->name ?? '—' }}</div>
        <div class="muted">{{ $user->email ?? '' }}</div>
      </td>
      <td>
        <div class="label">Date</div>
        <div class="value">{{ optional($deposit->created_at)->format('d M Y H:i') ?? '—' }}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Amount</div>
        <div class="value">{{ $deposit->currency ?? 'USD' }} {{ number_format((float) $deposit->amount, 2) }}</div>
      </td>
      <td>
        <div class="label">Status</div>
        <div class="value">{{ $statusLabel }}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Payment Method</div>
        <div class="value">{{ ucwords(str_replace('_', ' ', (string) $deposit->method)) }}</div>
      </td>
      <td>
        @if($deposit->converted_amount)
        <div class="label">Converted Amount</div>
        <div class="value">{{ $deposit->wallet_currency ?? '' }} {{ number_format((float) $deposit->converted_amount, 2) }}</div>
        @endif
      </td>
    </tr>
    @if($deposit->project)
    <tr>
      <td colspan="2">
        <div class="label">Project</div>
        <div class="value">{{ $deposit->project->title ?? $deposit->project->name ?? '—' }}</div>
      </td>
    </tr>
    @endif
    @if($deposit->note)
    <tr>
      <td colspan="2">
        <div class="label">Note</div>
        <div class="value">{{ $deposit->note }}</div>
      </td>
    </tr>
    @endif
  </table>

  <div class="footer">
    OG Exports (Pvt) Ltd · Investor deposit receipt · This document was generated from the investor portal.
  </div>
</body>
</html>
