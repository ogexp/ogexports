<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\SupplierOffer;
use App\Support\TradeAmountSnapshot;
use Illuminate\Console\Command;

class BackfillTradeFxSnapshots extends Command
{
    protected $signature = 'trade:backfill-fx-snapshots {--dry-run : Report without writing}';

    protected $description = 'Backfill USD/PKR exchange snapshots on supplier offers and orders missing them';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $offersUpdated = 0;
        $ordersUpdated = 0;

        SupplierOffer::query()
            ->where(function ($q) {
                $q->whereNull('exchange_rate')
                    ->orWhereNull('line_value_usd')
                    ->orWhereNull('line_value_pkr');
            })
            ->orderBy('id')
            ->chunkById(100, function ($offers) use ($dryRun, &$offersUpdated): void {
                foreach ($offers as $offer) {
                    $price = $this->parseNumber($offer->price_fob);
                    $qty = $this->parseNumber($offer->available_qty);
                    $lineValue = round($price * $qty, 2);
                    $currency = strtoupper((string) ($offer->currency ?: 'USD'));
                    $snap = TradeAmountSnapshot::fromNative($lineValue, $currency);

                    if ($dryRun) {
                        $this->line("Offer {$offer->id}: {$currency} {$lineValue} → USD {$snap['amount_usd']} / PKR {$snap['amount_pkr']}");
                        $offersUpdated++;

                        continue;
                    }

                    $offer->update([
                        'exchange_rate' => $snap['exchange_rate'],
                        'line_value_usd' => $snap['amount_usd'],
                        'line_value_pkr' => $snap['amount_pkr'],
                    ]);
                    $offersUpdated++;
                }
            });

        Order::query()
            ->where(function ($q) {
                $q->whereNull('exchange_rate')
                    ->orWhereNull('total_value_usd')
                    ->orWhereNull('total_value_pkr');
            })
            ->orderBy('id')
            ->chunkById(100, function ($orders) use ($dryRun, &$ordersUpdated): void {
                foreach ($orders as $order) {
                    $total = (float) $order->total_value;
                    $currency = strtoupper((string) ($order->currency ?: 'USD'));
                    $snap = TradeAmountSnapshot::fromNative($total, $currency);

                    if ($dryRun) {
                        $this->line("Order {$order->id}: {$currency} {$total} → USD {$snap['amount_usd']} / PKR {$snap['amount_pkr']}");
                        $ordersUpdated++;

                        continue;
                    }

                    $order->update([
                        'exchange_rate' => $snap['exchange_rate'],
                        'total_value_usd' => $snap['amount_usd'],
                        'total_value_pkr' => $snap['amount_pkr'],
                    ]);
                    $ordersUpdated++;
                }
            });

        $verb = $dryRun ? 'Would update' : 'Updated';
        $this->info("{$verb} {$offersUpdated} offers and {$ordersUpdated} orders.");

        return self::SUCCESS;
    }

    private function parseNumber(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        if (preg_match('/[\d.]+/', str_replace(',', '', (string) $value), $m)) {
            return (float) $m[0];
        }

        return 0.0;
    }
}
