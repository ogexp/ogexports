<?php

namespace App\Http\Controllers\Api\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Quotation;
use App\Models\Rfq;
use App\Models\Shipment;
use App\Models\TradeDocument;
use App\Support\BuyerProfileChecklist;
use App\Support\KycGate;
use App\Support\OrderStatuses;
use App\Support\UserDisplayCurrency;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private const STATUS_BUCKETS = [
        'Pending' => [
            'statuses' => [OrderStatuses::PAYMENT],
            'color' => '#f59e0b',
        ],
        'Confirmed' => [
            'statuses' => [OrderStatuses::ORDER_CONFIRMED],
            'color' => '#3b82f6',
        ],
        'In Production' => [
            'statuses' => [OrderStatuses::PRODUCTION, OrderStatuses::QUALITY_INSPECTION],
            'color' => '#8b5cf6',
        ],
        'Shipped' => [
            'statuses' => [OrderStatuses::LOADED_AT_PORT, OrderStatuses::IN_TRANSIT],
            'color' => '#0ea5e9',
        ],
        'Delivered' => [
            'statuses' => [OrderStatuses::DELIVERED],
            'color' => '#16a34a',
        ],
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['profile', 'latestKycApplication']);
        $userId = $user->id;
        $now = now();

        $ordersQuery = Order::query()->where('buyer_id', $userId);
        $ordersTotal = (clone $ordersQuery)->count();
        $ordersOpen = (clone $ordersQuery)
            ->whereNotIn('status', [OrderStatuses::DELIVERED, OrderStatuses::CANCELLED])
            ->count();
        $spendTotal = (float) (clone $ordersQuery)->sum('total_value');

        $quarterStart = $now->copy()->firstOfQuarter();
        $prevQuarterStart = $now->copy()->subQuarter()->firstOfQuarter();
        $prevQuarterEnd = $quarterStart->copy()->subSecond();

        $ordersThisQuarter = (clone $ordersQuery)
            ->where('created_at', '>=', $quarterStart)
            ->count();
        $ordersPrevQuarter = (clone $ordersQuery)
            ->whereBetween('created_at', [$prevQuarterStart, $prevQuarterEnd])
            ->count();
        $ordersTrendPct = $this->percentChange($ordersThisQuarter, $ordersPrevQuarter);

        $yearAgoStart = $now->copy()->subYear()->startOfYear();
        $yearAgoEnd = $now->copy()->subYear()->endOfYear();
        $thisYearStart = $now->copy()->startOfYear();
        $spendThisYear = (float) (clone $ordersQuery)
            ->where('created_at', '>=', $thisYearStart)
            ->sum('total_value');
        $spendPrevYear = (float) (clone $ordersQuery)
            ->whereBetween('created_at', [$yearAgoStart, $yearAgoEnd])
            ->sum('total_value');
        $spendYoyPct = $this->percentChange($spendThisYear, $spendPrevYear);

        $last12Start = $now->copy()->subMonths(11)->startOfMonth();
        $prior12Start = $now->copy()->subMonths(23)->startOfMonth();
        $prior12End = $last12Start->copy()->subSecond();
        $spendLast12 = (float) (clone $ordersQuery)
            ->where('created_at', '>=', $last12Start)
            ->sum('total_value');
        $spendPrior12 = (float) (clone $ordersQuery)
            ->whereBetween('created_at', [$prior12Start, $prior12End])
            ->sum('total_value');
        $spendChartYoyPct = $this->percentChange($spendLast12, $spendPrior12);

        $activeShipments = Shipment::query()
            ->where('buyer_id', $userId)
            ->get()
            ->filter(fn (Shipment $s) => $this->normalizeShipmentStatus($s->status) !== 'delivered')
            ->values();
        $shipmentsActive = $activeShipments->count();

        $shipmentsPrevMonth = Shipment::query()
            ->where('buyer_id', $userId)
            ->where('created_at', '<', $now->copy()->startOfMonth())
            ->where('created_at', '>=', $now->copy()->subMonth()->startOfMonth())
            ->get()
            ->filter(fn (Shipment $s) => $this->normalizeShipmentStatus($s->status) !== 'delivered')
            ->count();
        $shipmentsTrend = $shipmentsActive - $shipmentsPrevMonth;

        $rfqsPending = Rfq::query()
            ->where('buyer_id', $userId)
            ->whereIn('status', ['new', 'pending'])
            ->count();
        $rfqsCreatedThisMonth = Rfq::query()
            ->where('buyer_id', $userId)
            ->whereIn('status', ['new', 'pending'])
            ->where('created_at', '>=', $now->copy()->startOfMonth())
            ->count();
        $rfqsClosedThisMonth = Rfq::query()
            ->where('buyer_id', $userId)
            ->whereNotIn('status', ['new', 'pending'])
            ->where('updated_at', '>=', $now->copy()->startOfMonth())
            ->count();
        $rfqsTrend = $rfqsCreatedThisMonth - $rfqsClosedThisMonth;

        $spendByMonth = $this->buildSpendByMonth($userId, $now);
        $ordersByStatus = $this->buildOrdersByStatus($userId);
        $upcomingShipments = $this->buildUpcomingShipments($userId);
        $recentActivity = $this->buildRecentActivity($userId);
        $alerts = $this->buildAlerts($userId, $upcomingShipments, $rfqsPending);
        $favourites = $this->buildFavourites($userId);

        $profile = $user->profile;
        $checklist = BuyerProfileChecklist::build($user);
        $profileCompletion = (int) round(
            (count(array_filter($checklist, fn ($i) => $i['done'])) / max(count($checklist), 1)) * 100
        );

        $trustScore = (int) ($profile?->trust_score ?? 0);
        $trustTier = $this->trustTier($trustScore);

        $quotationsPending = Quotation::query()
            ->where('buyer_id', $userId)
            ->whereIn('status', ['sent', 'pending', 'pending_admin'])
            ->count();

        return response()->json([
            'data' => [
                // Legacy keys (kept for compatibility)
                'orders' => $ordersTotal,
                'orders_open' => $ordersOpen,
                'rfqs' => Rfq::query()->where('buyer_id', $userId)->count(),
                'quotations' => Quotation::query()->where('buyer_id', $userId)->count(),
                'quotations_pending' => $quotationsPending,
                'shipments' => Shipment::query()->where('buyer_id', $userId)->count(),
                'recent_orders' => Order::query()->where('buyer_id', $userId)->latest()->limit(5)->get(),

                'kpis' => [
                    'orders' => $ordersTotal,
                    'orders_change' => $ordersThisQuarter >= 0
                        ? '+'.$ordersThisQuarter.' this quarter'
                        : $ordersThisQuarter.' this quarter',
                    'orders_trend' => $this->formatTrend($ordersTrendPct, true),
                    'orders_trend_up' => $ordersTrendPct >= 0,

                    'spend_total' => $spendTotal,
                    'spend_change' => $this->formatTrend($spendYoyPct, true).' YoY',
                    'spend_trend' => $this->formatTrend(
                        $this->percentChange(
                            (float) (clone $ordersQuery)->where('created_at', '>=', $now->copy()->startOfMonth())->sum('total_value'),
                            (float) (clone $ordersQuery)->whereBetween('created_at', [
                                $now->copy()->subMonth()->startOfMonth(),
                                $now->copy()->subMonth()->endOfMonth(),
                            ])->sum('total_value')
                        ),
                        true
                    ),
                    'spend_trend_up' => $spendYoyPct >= 0,

                    'shipments_active' => $shipmentsActive,
                    'shipments_change' => $shipmentsActive > 0 ? 'On schedule' : 'No active shipments',
                    'shipments_trend' => ($shipmentsTrend >= 0 ? '+' : '').$shipmentsTrend,
                    'shipments_trend_up' => $shipmentsTrend >= 0,

                    'rfqs_pending' => $rfqsPending,
                    'rfqs_change' => $rfqsPending > 0 ? 'Awaiting quotes' : 'No pending RFQs',
                    'rfqs_trend' => ($rfqsTrend >= 0 ? '+' : '').$rfqsTrend,
                    'rfqs_trend_up' => $rfqsTrend >= 0,
                ],

                'spend_by_month' => $spendByMonth,
                'spend_yoy_pct' => $spendChartYoyPct,
                'orders_by_status' => $ordersByStatus,
                'upcoming_shipments' => $upcomingShipments,
                'recent_activity' => $recentActivity,
                'alerts' => $alerts,
                'favourites' => $favourites,
                'trust_score' => $trustScore,
                'trust_tier' => $trustTier,
                'member_since' => $user->created_at?->format('F Y'),
                'kyc_status' => KycGate::buyerStatus($user),
                'kyc_approved' => KycGate::isBuyerApproved($user),
                'profile_completion' => $profileCompletion,
                'profile_checklist' => $checklist,
                'display_currency' => UserDisplayCurrency::shouldDisplayPkrForRole($user, 'buyer') ? 'PKR' : 'USD',
                'display_pkr' => UserDisplayCurrency::shouldDisplayPkrForRole($user, 'buyer'),
                'buyer_pkr_display_enabled' => UserDisplayCurrency::buyerPkrDisplayEnabled(),
            ],
        ]);
    }

    private function percentChange(float|int $current, float|int $previous): float
    {
        if ((float) $previous === 0.0) {
            return (float) $current > 0 ? 100.0 : 0.0;
        }

        return round((((float) $current - (float) $previous) / (float) $previous) * 100, 1);
    }

    private function formatTrend(float $pct, bool $withSign = false): string
    {
        $sign = $pct > 0 ? '+' : '';

        return ($withSign ? $sign : '').$pct.'%';
    }

    private function normalizeShipmentStatus(?string $status): string
    {
        return strtolower(str_replace('_', '-', (string) ($status ?: 'pending')));
    }

    private function shipmentStatusLabel(string $normalized): string
    {
        return match ($normalized) {
            'delivered' => 'Delivered',
            'arrived' => 'Arrived',
            'in-transit', 'transit' => 'In Transit',
            'booking' => 'Loading',
            default => 'Booking Confirmed',
        };
    }

    private function shipmentProgressPct(string $normalized): int
    {
        return match ($normalized) {
            'delivered' => 100,
            'arrived' => 85,
            'in-transit', 'transit' => 65,
            'booking' => 25,
            default => 5,
        };
    }

    /**
     * @return list<array{month: string, value: float}>
     */
    private function buildSpendByMonth(int $userId, Carbon $now): array
    {
        $orders = Order::query()
            ->where('buyer_id', $userId)
            ->where('created_at', '>=', $now->copy()->subMonths(11)->startOfMonth())
            ->get(['created_at', 'total_value']);

        $grouped = $orders->groupBy(fn (Order $o) => $o->created_at?->format('Y-m') ?? '');

        $series = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $key = $month->format('Y-m');
            $series[] = [
                'month' => $month->format('M'),
                'value' => (float) ($grouped->get($key)?->sum('total_value') ?? 0),
            ];
        }

        return $series;
    }

    /**
     * @return list<array{name: string, value: int, color: string}>
     */
    private function buildOrdersByStatus(int $userId): array
    {
        $counts = Order::query()
            ->where('buyer_id', $userId)
            ->where('status', '!=', OrderStatuses::CANCELLED)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        // Pending RFQs count toward the ring's Pending slice (no Order row created).
        $pendingRfqs = Rfq::query()
            ->where('buyer_id', $userId)
            ->whereIn('status', ['new', 'pending'])
            ->count();

        $result = [];
        foreach (self::STATUS_BUCKETS as $name => $bucket) {
            $value = 0;
            foreach ($bucket['statuses'] as $status) {
                $value += (int) ($counts[$status] ?? 0);
            }
            if ($name === 'Pending') {
                $value += $pendingRfqs;
            }
            $result[] = [
                'name' => $name,
                'value' => $value,
                'color' => $bucket['color'],
            ];
        }

        return $result;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildUpcomingShipments(int $userId): array
    {
        return Shipment::query()
            ->where('buyer_id', $userId)
            ->with(['order.items'])
            ->orderByRaw('CASE WHEN eta IS NULL THEN 1 ELSE 0 END')
            ->orderBy('eta')
            ->limit(20)
            ->get()
            ->filter(fn (Shipment $s) => $this->normalizeShipmentStatus($s->status) !== 'delivered')
            ->take(3)
            ->values()
            ->map(function (Shipment $s) {
                $normalized = $this->normalizeShipmentStatus($s->status);
                $firstItem = $s->order?->items?->first();
                $qty = $firstItem?->qty !== null
                    ? rtrim(rtrim(number_format((float) $firstItem->qty, 2, '.', ''), '0'), '.').' MT'
                    : '—';

                $product = $s->product_snapshot
                    ?: ($firstItem?->product_name ?? 'Shipment');

                return [
                    'ref' => $s->container ?: ('SHP-'.$s->id),
                    'product' => $product,
                    'qty' => $qty,
                    'origin' => $s->origin ?: '—',
                    'destination' => $s->destination ?: '—',
                    'eta' => $s->eta?->format('M j, Y') ?? '—',
                    'etd' => $s->etd?->format('M j, Y') ?? '—',
                    'vessel' => $s->vessel ?: '—',
                    'status' => $this->shipmentStatusLabel($normalized),
                    'pct' => $this->shipmentProgressPct($normalized),
                ];
            })
            ->all();
    }

    /**
     * @return list<array{type: string, title: string, desc: string, time: string, at: string}>
     */
    private function buildRecentActivity(int $userId): array
    {
        $events = collect();

        Rfq::query()->where('buyer_id', $userId)->latest()->limit(5)->get()->each(function (Rfq $rfq) use ($events) {
            $at = $rfq->submitted_at ?? $rfq->created_at;
            $events->push([
                'type' => 'rfq',
                'title' => 'RFQ Submitted',
                'desc' => sprintf(
                    'RFQ #%d — %s%s sent for quotation.',
                    $rfq->id,
                    $rfq->qty ? $rfq->qty.' MT ' : '',
                    $rfq->product_name ?: 'Product'
                ),
                'at' => $at,
            ]);
        });

        Quotation::query()->where('buyer_id', $userId)->latest()->limit(5)->get()->each(function (Quotation $q) use ($events) {
            $at = $q->issued_at ?? $q->created_at;
            $title = $q->status === 'accepted' ? 'Quotation Accepted' : 'Quote Received';
            $events->push([
                'type' => $q->status === 'accepted' ? 'quotation_accepted' : 'quotation',
                'title' => $title,
                'desc' => sprintf(
                    'QT-%d — %s%s (%s).',
                    $q->id,
                    $q->qty_mt ? $q->qty_mt.' MT ' : '',
                    $q->product_name ?: 'Product',
                    $q->status
                ),
                'at' => $at,
            ]);
        });

        Order::query()->where('buyer_id', $userId)->latest()->limit(5)->get()->each(function (Order $order) use ($events, $user) {
            $at = $order->placed_at ?? $order->created_at;
            $isDelivered = $order->status === OrderStatuses::DELIVERED;
            $amountLabel = UserDisplayCurrency::formatTradeAmount(
                $user,
                'buyer',
                (float) $order->total_value,
                (string) ($order->currency ?: 'USD'),
                $order->total_value_usd !== null ? (float) $order->total_value_usd : null,
                $order->total_value_pkr !== null ? (float) $order->total_value_pkr : null,
                $order->exchange_rate !== null ? (float) $order->exchange_rate : null,
            );
            $events->push([
                'type' => $isDelivered ? 'order_delivered' : 'order',
                'title' => $isDelivered ? 'Order Delivered' : 'Order Confirmed',
                'desc' => sprintf(
                    '%s — %s (%s).',
                    $order->order_number ?: 'PO-'.$order->id,
                    $amountLabel,
                    OrderStatuses::LABELS[$order->status] ?? $order->status
                ),
                'at' => $at,
            ]);
        });

        Shipment::query()->where('buyer_id', $userId)->latest()->limit(5)->get()->each(function (Shipment $s) use ($events) {
            $events->push([
                'type' => 'shipment',
                'title' => 'Shipment Update',
                'desc' => sprintf(
                    '%s — %s → %s (%s).',
                    $s->container ?: 'SHP-'.$s->id,
                    $s->origin ?: 'Origin',
                    $s->destination ?: 'Destination',
                    $this->shipmentStatusLabel($this->normalizeShipmentStatus($s->status))
                ),
                'at' => $s->updated_at ?? $s->created_at,
            ]);
        });

        TradeDocument::query()->where('buyer_id', $userId)->latest()->limit(5)->get()->each(function (TradeDocument $doc) use ($events) {
            $events->push([
                'type' => 'document',
                'title' => 'Document Uploaded',
                'desc' => sprintf(
                    '%s%s uploaded to portal.',
                    $doc->type ? $doc->type.' ' : '',
                    $doc->title ?: '#'.$doc->id
                ),
                'at' => $doc->created_at,
            ]);
        });

        return $events
            ->filter(fn ($e) => ! empty($e['at']))
            ->sortByDesc(fn ($e) => Carbon::parse($e['at'])->timestamp)
            ->take(8)
            ->values()
            ->map(fn ($e) => [
                'type' => $e['type'],
                'title' => $e['title'],
                'desc' => $e['desc'],
                'time' => Carbon::parse($e['at'])->diffForHumans(),
                'at' => Carbon::parse($e['at'])->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>  $upcomingShipments
     * @return list<array{type: string, title: string, badge: string}>
     */
    private function buildAlerts(int $userId, array $upcomingShipments, int $rfqsPending): array
    {
        $alerts = [];

        $nearest = $upcomingShipments[0] ?? null;
        if ($nearest && ($nearest['eta'] ?? '—') !== '—') {
            $eta = null;
            try {
                $eta = Carbon::parse($nearest['eta']);
            } catch (\Throwable) {
                $eta = null;
            }
            $days = $eta ? (int) now()->startOfDay()->diffInDays($eta->startOfDay(), false) : null;
            $title = $days !== null && $days >= 0
                ? sprintf('Your Shipment %s arriving in %d day%s', $nearest['ref'], $days, $days === 1 ? '' : 's')
                : sprintf('Your Shipment %s — ETA %s', $nearest['ref'], $nearest['eta']);

            $alerts[] = [
                'type' => 'shipment',
                'badge' => 'Shipment Alert',
                'title' => $title,
            ];
        }

        if ($rfqsPending > 0) {
            $alerts[] = [
                'type' => 'rfq',
                'badge' => 'RFQ Alert',
                'title' => $rfqsPending === 1
                    ? '1 RFQ awaiting quotes — follow up with suppliers'
                    : $rfqsPending.' RFQs awaiting quotes — follow up with suppliers',
            ];
        }

        $recentQuote = Quotation::query()
            ->where('buyer_id', $userId)
            ->whereIn('status', ['sent', 'pending'])
            ->latest()
            ->first();
        if ($recentQuote) {
            $alerts[] = [
                'type' => 'quotation',
                'badge' => 'Quote Alert',
                'title' => sprintf(
                    'New quote ready for %s — review and accept',
                    $recentQuote->product_name ?: 'your RFQ'
                ),
            ];
        }

        $openOrders = Order::query()
            ->where('buyer_id', $userId)
            ->whereNotIn('status', [OrderStatuses::DELIVERED, OrderStatuses::CANCELLED])
            ->count();
        if (count($alerts) < 3 && $openOrders > 0) {
            $alerts[] = [
                'type' => 'order',
                'badge' => 'Order Update',
                'title' => $openOrders === 1
                    ? '1 open order in progress — track status in Orders'
                    : $openOrders.' open orders in progress — track status in Orders',
            ];
        }

        return array_slice($alerts, 0, 3);
    }

    /**
     * @return list<array{name: string, grade: string, origin: string, icon: string}>
     */
    private function buildFavourites(int $userId): array
    {
        $names = collect();

        Rfq::query()
            ->where('buyer_id', $userId)
            ->whereNotNull('product_name')
            ->latest()
            ->limit(20)
            ->get(['product_name', 'packaging'])
            ->each(function (Rfq $rfq) use ($names) {
                $names->push([
                    'name' => $rfq->product_name,
                    'grade' => $rfq->packaging ?: 'Export Grade',
                    'origin' => 'Pakistan',
                ]);
            });

        OrderItem::query()
            ->whereHas('order', fn ($q) => $q->where('buyer_id', $userId))
            ->orderByDesc('id')
            ->limit(20)
            ->get(['product_name'])
            ->each(function (OrderItem $item) use ($names) {
                if (! $item->product_name) {
                    return;
                }
                $names->push([
                    'name' => $item->product_name,
                    'grade' => 'Export Grade',
                    'origin' => 'Pakistan',
                ]);
            });

        return $names
            ->unique('name')
            ->take(3)
            ->values()
            ->map(fn ($p) => [
                'name' => $p['name'],
                'grade' => $p['grade'],
                'origin' => $p['origin'],
                'icon' => $this->productIcon($p['name']),
            ])
            ->all();
    }

    private function productIcon(string $name): string
    {
        $lower = strtolower($name);
        if (str_contains($lower, 'rice') || str_contains($lower, 'basmati')) {
            return '🌾';
        }
        if (str_contains($lower, 'sesame')) {
            return '🌱';
        }
        if (str_contains($lower, 'corn') || str_contains($lower, 'maize')) {
            return '🌽';
        }
        if (str_contains($lower, 'kinnow') || str_contains($lower, 'citrus')) {
            return '🍊';
        }

        return '📦';
    }

    private function trustTier(int $score): string
    {
        if ($score >= 900) {
            return 'Platinum';
        }
        if ($score >= 700) {
            return 'Gold';
        }
        if ($score >= 500) {
            return 'Silver';
        }
        if ($score > 0) {
            return 'Bronze';
        }

        return 'Verified';
    }
}
