<?php

namespace App\Http\Controllers\Api\Supplier;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\SupplierOffer;
use App\Support\KycGate;
use App\Support\SupplierMarket;
use App\Support\TradeAmountSnapshot;
use App\Support\UserDisplayCurrency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['profile', 'latestSupplierKycApplication']);
        $userId = $user->id;
        $country = $user->profile?->country;
        $market = SupplierMarket::fromCountry($country);
        $nativeCurrency = $market === SupplierMarket::PAKISTAN ? 'PKR' : 'USD';
        $displayPkr = UserDisplayCurrency::shouldDisplayPkrForRole($user, 'supplier');
        $displayCurrency = $displayPkr ? 'PKR' : 'USD';

        $offers = SupplierOffer::query()
            ->where('supplier_id', $userId)
            ->with(['notes' => fn ($q) => $q->latest()->limit(3)])
            ->latest('submitted_at')
            ->get();

        $enriched = $offers->map(function (SupplierOffer $offer) {
            $price = $this->parseNumber($offer->price_fob);
            $qty = $this->parseNumber($offer->available_qty);
            $lineValue = round($price * $qty, 2);
            $currency = strtoupper((string) ($offer->currency ?: 'USD'));
            $snap = TradeAmountSnapshot::resolve(
                $lineValue,
                $currency,
                $offer->line_value_usd !== null ? (float) $offer->line_value_usd : null,
                $offer->line_value_pkr !== null ? (float) $offer->line_value_pkr : null,
                $offer->exchange_rate !== null ? (float) $offer->exchange_rate : null,
            );

            return [
                'id' => $offer->id,
                'product_name' => $offer->product_name,
                'category' => $offer->category,
                'origin' => $offer->origin,
                'status' => $offer->status,
                'available_qty' => $offer->available_qty,
                'price_fob' => $offer->price_fob,
                'currency' => $offer->currency,
                'payment_terms' => $offer->payment_terms,
                'lead_time' => $offer->lead_time,
                'certifications' => $offer->certifications ?? [],
                'rating' => $offer->rating,
                'submitted_at' => $offer->submitted_at?->toDateString(),
                'line_value' => $lineValue,
                'line_value_usd' => $snap['usd'],
                'line_value_pkr' => $snap['pkr'],
                'exchange_rate' => $snap['rate'],
                'qty_numeric' => $qty,
                'notes' => $offer->notes->map(fn ($n) => [
                    'text' => $n->text,
                    'at' => $n->created_at?->toIso8601String(),
                ])->values()->all(),
            ];
        });

        $valueKey = $displayPkr ? 'line_value_pkr' : 'line_value_usd';
        $totalValue = (float) $enriched->sum($valueKey);
        $byStatus = [
            'approved' => $enriched->where('status', 'approved'),
            'pending' => $enriched->where('status', 'pending'),
            'hold' => $enriched->where('status', 'hold'),
            'rejected' => $enriched->where('status', 'rejected'),
        ];

        $counts = [
            'total' => $enriched->count(),
            'approved' => $byStatus['approved']->count(),
            'pending' => $byStatus['pending']->count(),
            'hold' => $byStatus['hold']->count(),
            'rejected' => $byStatus['rejected']->count(),
        ];

        $rated = $enriched->filter(fn ($o) => $o['rating'] !== null);
        $avgRating = $rated->count()
            ? round($rated->avg('rating'), 1)
            : null;

        $approvalRate = $counts['total'] > 0
            ? (int) round(($counts['approved'] / $counts['total']) * 100)
            : 0;

        $categoryMap = [];
        foreach ($enriched as $row) {
            $cat = $row['category'] ?: 'Other';
            $categoryMap[$cat] = ($categoryMap[$cat] ?? 0) + $row[$valueKey];
        }
        arsort($categoryMap);
        $valueByCategory = collect($categoryMap)->map(fn ($value, $category) => [
            'category' => $category,
            'value' => round($value, 2),
            'pct' => $totalValue > 0 ? (int) round(($value / $totalValue) * 100) : 0,
        ])->values()->all();

        $certs = $enriched
            ->pluck('certifications')
            ->flatten()
            ->filter()
            ->unique()
            ->values()
            ->all();

        $portfolio = $enriched
            ->sortByDesc($valueKey)
            ->values()
            ->map(fn ($row) => [
                ...$row,
                'display_line_value' => round((float) $row[$valueKey], 2),
                'portfolio_pct' => $totalValue > 0
                    ? (int) round(($row[$valueKey] / $totalValue) * 100)
                    : 0,
            ])
            ->all();

        $mostValuable = $enriched->sortByDesc($valueKey)->first();
        $largestQty = $enriched->sortByDesc('qty_numeric')->first();
        $bestRated = $rated->sortByDesc('rating')->first();
        $paymentTermsOffer = $byStatus['approved']->first() ?? $enriched->first();

        $notices = $this->buildNotices($enriched);

        $kycStatus = KycGate::supplierStatus($user);
        $kycApproved = KycGate::isSupplierApproved($user);

        return response()->json([
            'data' => [
                'kyc_status' => $kycStatus,
                'kyc_approved' => $kycApproved,
                'supplier' => [
                    'name' => $user->name,
                    'company_name' => $user->profile?->company_name,
                    'country' => $country,
                    'currency' => $nativeCurrency,
                    'display_currency' => $displayCurrency,
                    'display_pkr' => $displayPkr,
                    'supplier_pkr_display_enabled' => PlatformSetting::supplierPkrDisplayEnabled(),
                    'kyc_status' => $kycStatus,
                    'kyc_approved' => $kycApproved,
                    'rating' => $user->profile?->rating,
                ],
                'kpis' => [
                    'total_supply_value' => round($totalValue, 2),
                    'approved_value' => round((float) $byStatus['approved']->sum($valueKey), 2),
                    'pending_value' => round((float) $byStatus['pending']->sum($valueKey), 2),
                    'hold_value' => round((float) $byStatus['hold']->sum($valueKey), 2),
                    'rejected_value' => round((float) $byStatus['rejected']->sum($valueKey), 2),
                    'offer_count' => $counts['total'],
                    'approved_count' => $counts['approved'],
                    'pending_count' => $counts['pending'],
                    'hold_count' => $counts['hold'],
                    'rejected_count' => $counts['rejected'],
                    'approval_rate_pct' => $approvalRate,
                    'avg_rating' => $avgRating,
                ],
                'status_distribution' => collect(['approved', 'pending', 'hold', 'rejected'])->map(fn ($status) => [
                    'status' => $status,
                    'count' => $counts[$status] ?? 0,
                    'pct' => $counts['total'] > 0
                        ? (int) round((($counts[$status] ?? 0) / $counts['total']) * 100)
                        : 0,
                ])->values()->all(),
                'value_by_category' => $valueByCategory,
                'portfolio' => $portfolio,
                'certifications' => $certs,
                'highlights' => [
                    'most_valuable' => $mostValuable ? [
                        'id' => $mostValuable['id'],
                        'product_name' => $mostValuable['product_name'],
                        'value' => round((float) $mostValuable[$valueKey], 2),
                        'value_usd' => $mostValuable['line_value_usd'],
                        'value_pkr' => $mostValuable['line_value_pkr'],
                    ] : null,
                    'largest_qty' => $largestQty ? [
                        'id' => $largestQty['id'],
                        'product_name' => $largestQty['product_name'],
                        'available_qty' => $largestQty['available_qty'],
                    ] : null,
                    'best_rated' => $bestRated ? [
                        'id' => $bestRated['id'],
                        'product_name' => $bestRated['product_name'],
                        'rating' => $bestRated['rating'],
                    ] : null,
                    'payment_terms' => $paymentTermsOffer['payment_terms'] ?? null,
                ],
                'notices' => $notices,
            ],
        ]);
    }

    private function parseNumber(?string $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }
        if (preg_match('/[\d,.]+/', str_replace(',', '', $value), $m)) {
            return (float) str_replace(',', '', $m[0]);
        }

        return 0.0;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, array<string, mixed>>  $enriched
     * @return list<array{text: string, type: string, at: string|null, time: string}>
     */
    private function buildNotices($enriched): array
    {
        $notices = [];

        foreach ($enriched->take(10) as $offer) {
            $label = 'SOF-'.str_pad((string) $offer['id'], 3, '0', STR_PAD_LEFT);
            $product = $offer['product_name'];

            if ($offer['status'] === 'approved') {
                $notices[] = [
                    'text' => "{$label} ({$product}) approved — our sourcing team will contact you to proceed.",
                    'type' => 'approved',
                    'at' => $offer['submitted_at'],
                    'time' => $this->humanTime($offer['submitted_at']),
                ];
            } elseif ($offer['status'] === 'hold') {
                $note = $offer['notes'][0]['text'] ?? 'pending additional review';
                $notices[] = [
                    'text' => "{$label} ({$product}) on hold — {$note}",
                    'type' => 'hold',
                    'at' => $offer['notes'][0]['at'] ?? $offer['submitted_at'],
                    'time' => $this->humanTime($offer['notes'][0]['at'] ?? $offer['submitted_at']),
                ];
            } elseif ($offer['status'] === 'rejected') {
                $note = $offer['notes'][0]['text'] ?? 'not accepted at this time';
                $notices[] = [
                    'text' => "{$label} ({$product}) not accepted — {$note}",
                    'type' => 'rejected',
                    'at' => $offer['notes'][0]['at'] ?? $offer['submitted_at'],
                    'time' => $this->humanTime($offer['notes'][0]['at'] ?? $offer['submitted_at']),
                ];
            }

            foreach ($offer['notes'] as $n) {
                if (count($notices) >= 8) {
                    break 2;
                }
                if ($offer['status'] === 'pending') {
                    $notices[] = [
                        'text' => "{$label}: {$n['text']}",
                        'type' => 'pending',
                        'at' => $n['at'],
                        'time' => $this->humanTime($n['at']),
                    ];
                }
            }
        }

        return array_slice($notices, 0, 6);
    }

    private function humanTime(?string $at): string
    {
        if (! $at) {
            return '';
        }
        try {
            return Carbon::parse($at)->diffForHumans();
        } catch (\Throwable) {
            return (string) $at;
        }
    }
}
