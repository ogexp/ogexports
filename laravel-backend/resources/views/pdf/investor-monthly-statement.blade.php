<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Investor statement — {{ $statement['month_label'] }}</title>
    <style>
        @page { margin: 34px 38px; }
        body { font-family: DejaVu Sans, sans-serif; color: #102c27; font-size: 10px; }
        .brand { color: #08775c; font-size: 11px; font-weight: bold; letter-spacing: 1.5px; }
        h1 { font-size: 22px; margin: 8px 0 4px; }
        .muted { color: #62736e; }
        .meta { margin: 0 0 20px; line-height: 1.7; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; }
        th { background: #edf5f1; color: #31574d; text-align: left; font-size: 9px; }
        th, td { border-bottom: 1px solid #dce7e2; padding: 8px 7px; }
        .amount { text-align: right; white-space: nowrap; }
        .balance { font-weight: bold; background: #f6faf8; }
        .section { color: #08775c; font-size: 12px; margin: 22px 0 8px; }
        .footer { margin-top: 22px; color: #62736e; font-size: 8px; }
    </style>
</head>
<body>
    <div class="brand">OG EXPORTS</div>
    <h1>Investor wallet statement</h1>
    <div class="meta muted">
        <strong>{{ $statement['month_label'] }}</strong><br>
        Account holder: {{ $investor->name }}<br>
        Currency: {{ $statement['currency'] }}<br>
        Generated: {{ \Illuminate\Support\Carbon::parse($statement['generated_at'])->format('M j, Y g:i A') }}
    </div>

    <div class="section">Monthly balance summary</div>
    <table>
        <tbody>
            <tr class="balance"><td>Opening balance</td><td class="amount">{{ $statement['currency'] }} {{ number_format($statement['opening_balance'], 2) }}</td></tr>
            <tr><td>Deposits</td><td class="amount">{{ $statement['currency'] }} {{ number_format($statement['deposits'], 2) }}</td></tr>
            <tr><td>Investments</td><td class="amount">− {{ $statement['currency'] }} {{ number_format($statement['investments'], 2) }}</td></tr>
            <tr><td>Principal returned</td><td class="amount">{{ $statement['currency'] }} {{ number_format($statement['principal_returns'], 2) }}</td></tr>
            <tr><td>Distributions (profit only)</td><td class="amount">{{ $statement['currency'] }} {{ number_format($statement['distributions'], 2) }}</td></tr>
            <tr><td>Withdrawals</td><td class="amount">− {{ $statement['currency'] }} {{ number_format($statement['withdrawals'], 2) }}</td></tr>
            @if ($statement['other_movements'] != 0)
                <tr><td>Other wallet movements (net)</td><td class="amount">{{ $statement['currency'] }} {{ number_format($statement['other_movements'], 2) }}</td></tr>
            @endif
            <tr class="balance"><td>Closing balance</td><td class="amount">{{ $statement['currency'] }} {{ number_format($statement['closing_balance'], 2) }}</td></tr>
        </tbody>
    </table>

    <div class="section">Posted wallet transactions</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Status</th>
                <th class="amount">Debit</th>
                <th class="amount">Credit</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($statement['transactions'] as $transaction)
                <tr>
                    <td>{{ \Illuminate\Support\Carbon::parse($transaction['date_time'])->format('M j, Y g:i A') }}</td>
                    <td>
                        {{ \Illuminate\Support\Str::headline($transaction['type']) }}
                        @if ($transaction['principal_return'] !== null && $transaction['distribution_amount'] !== null)
                            <br><span class="muted">Principal {{ $statement['currency'] }} {{ number_format($transaction['principal_return'], 2) }} + profit {{ $statement['currency'] }} {{ number_format($transaction['distribution_amount'], 2) }}</span>
                        @endif
                    </td>
                    <td>{{ $transaction['reference'] ?: 'Not provided' }}</td>
                    <td>{{ \Illuminate\Support\Str::headline($transaction['status']) }}</td>
                    <td class="amount">{{ $transaction['direction'] === 'debit' ? $statement['currency'].' '.number_format($transaction['amount'], 2) : '' }}</td>
                    <td class="amount">{{ $transaction['direction'] === 'credit' ? $statement['currency'].' '.number_format($transaction['amount'], 2) : '' }}</td>
                </tr>
            @empty
                <tr><td colspan="6" class="muted">No posted wallet transactions for this month.</td></tr>
            @endforelse
        </tbody>
    </table>
    <div class="footer">This statement is generated from OG Exports wallet transaction records. Balances include available and reserved pending wallet funds; pending requests are not included in posted monthly totals.</div>
</body>
</html>