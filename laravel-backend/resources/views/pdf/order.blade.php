<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order {{ $order->order_number ?? $order->id }}</title>
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2933; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #0F3D2E; }
    .muted { color: #6b7280; font-size: 11px; }
    .header { border-bottom: 2px solid #0F3D2E; padding-bottom: 12px; margin-bottom: 20px; }
    .brand { font-size: 14px; font-weight: bold; color: #D4A012; letter-spacing: 0.5px; }
    .grid { width: 100%; margin-bottom: 18px; }
    .grid td { vertical-align: top; padding: 4px 8px 4px 0; }
    .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; }
    .value { font-weight: bold; font-size: 12px; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
    table.items th { background: #0F3D2E; color: #fff; text-align: left; padding: 8px; font-size: 11px; }
    table.items td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
    .total { text-align: right; margin-top: 16px; font-size: 14px; }
    .total strong { color: #0F3D2E; font-size: 16px; }
    .footer { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">OG EXPORTS</div>
    <h1>Order Confirmation</h1>
    <div class="muted">Generated {{ $generatedAt }}</div>
  </div>

  <table class="grid">
    <tr>
      <td width="50%">
        <div class="label">Order Number</div>
        <div class="value">{{ $order->order_number ?? ('ORD-'.$order->id) }}</div>
      </td>
      <td width="50%">
        <div class="label">Status</div>
        <div class="value">{{ ucwords(str_replace('_', ' ', (string) $order->status)) }}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Buyer</div>
        <div class="value">{{ $order->buyer->name ?? '—' }}</div>
        <div class="muted">{{ $order->buyer->email ?? '' }}</div>
      </td>
      <td>
        <div class="label">Placed</div>
        <div class="value">{{ optional($order->placed_at ?? $order->created_at)->format('d M Y') ?? '—' }}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Destination</div>
        <div class="value">{{ $order->destination ?: ($order->quotation->destination ?? '—') }}</div>
      </td>
      <td>
        <div class="label">Port</div>
        <div class="value">{{ $order->destination_port ?: ($order->port->name ?? '—') }}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="label">Incoterm</div>
        <div class="value">{{ $order->incoterm ?: ($order->quotation->incoterm ?? '—') }}</div>
      </td>
      <td>
        <div class="label">Payment</div>
        <div class="value">{{ $order->quotation->payment_terms ?? ($order->payment_method ?: ($order->payment_status ?? '—')) }}</div>
      </td>
    </tr>
    @if($order->required_delivery_date)
    <tr>
      <td colspan="2">
        <div class="label">Required Delivery</div>
        <div class="value">{{ optional($order->required_delivery_date)->format('d M Y') }}</div>
      </td>
    </tr>
    @endif
  </table>

  <div class="label">Line Items</div>
  <table class="items">
    <thead>
      <tr>
        <th>Product</th>
        <th>Qty (MT)</th>
        <th>Unit Price</th>
        <th>Line Total</th>
      </tr>
    </thead>
    <tbody>
      @forelse($order->items as $item)
        <tr>
          <td>{{ $item->product_name ?? 'Product' }}</td>
          <td>{{ $item->qty ?? $item->quantity ?? '—' }}</td>
          <td>
            @if($item->unit_price !== null)
              {{ $order->currency ?? 'USD' }} {{ number_format((float) $item->unit_price, 2) }}
            @else
              —
            @endif
          </td>
          <td>
            @if($item->line_total !== null)
              {{ $order->currency ?? 'USD' }} {{ number_format((float) $item->line_total, 2) }}
            @elseif($item->unit_price !== null && is_numeric($item->qty ?? $item->quantity))
              {{ $order->currency ?? 'USD' }} {{ number_format((float) $item->unit_price * (float) ($item->qty ?? $item->quantity), 2) }}
            @else
              —
            @endif
          </td>
        </tr>
      @empty
        <tr>
          <td colspan="4">No line items</td>
        </tr>
      @endforelse
    </tbody>
  </table>

  <div class="total">
    Total:
    <strong>{{ $order->currency ?? 'USD' }} {{ number_format((float) ($order->total_value ?? 0), 2) }}</strong>
  </div>

  @if($order->notes)
    <p style="margin-top: 20px;"><span class="label">Notes</span><br>{{ $order->notes }}</p>
  @endif

  <div class="footer">
    OG Exports (Pvt) Ltd · Premium Pakistan Agricultural Exports · This document was generated from the buyer portal.
  </div>
</body>
</html>
