<?php

namespace App\Support;

use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shipment;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AdminReportsStatsService
{
    private const DELIVERED_ORDER_STATUSES = ['delivered', 'completed'];

    private const APPROVED_INVESTMENT_STATUSES = ['active', 'completed'];

    private const ELIGIBLE_INVESTOR_STATUSES = ['pending', 'active', 'completed'];

    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $now = now();
        $yearStart = $now->copy()->startOfYear();
        $prevYearStart = $now->copy()->subYear()->startOfYear();
        $prevYearEnd = $now->copy()->subYear()->endOfYear();

        $totalRevenue = $this->orderRevenue(null, null);
        $ytdRevenue = $this->orderRevenue($yearStart, null);
        $prevYearRevenue = $this->orderRevenue($prevYearStart, $prevYearEnd);
        $yoyPct = $this->pctChange($ytdRevenue, $prevYearRevenue);

        $ordersTotal = Order::query()->count();
        $ordersPrevYear = Order::query()
            ->where('created_at', '>=', $prevYearStart)
            ->where('created_at', '<=', $prevYearEnd)
            ->count();
        $ordersYtd = Order::query()->where('created_at', '>=', $yearStart)->count();
        $ordersYoyPct = $this->pctChange((float) $ordersYtd, (float) $ordersPrevYear);

        $buyersTotal = User::role('buyer')->count();
        $activeBuyerIds = Order::query()
            ->where('created_at', '>=', $now->copy()->subDays(30))
            ->distinct()
            ->pluck('buyer_id');
        $buyersActive = $activeBuyerIds->count();
        $buyersPrevYear = User::role('buyer')
            ->where('created_at', '>=', $prevYearStart)
            ->where('created_at', '<=', $prevYearEnd)
            ->count();
        $buyersYtd = User::role('buyer')->where('created_at', '>=', $yearStart)->count();
        $buyersYoyPct = $this->pctChange((float) $buyersYtd, (float) $buyersPrevYear);

        $shipmentsTotal = Shipment::query()->count();
        $shipmentsPrevYear = Shipment::query()
            ->where('created_at', '>=', $prevYearStart)
            ->where('created_at', '<=', $prevYearEnd)
            ->count();
        $shipmentsYtd = Shipment::query()->where('created_at', '>=', $yearStart)->count();
        $shipmentsYoyPct = $this->pctChange((float) $shipmentsYtd, (float) $shipmentsPrevYear);

        $onTimeRate = $this->onTimeDeliveryRate();
        $countriesReached = (int) UserProfile::query()
            ->whereHas('user', fn ($q) => $q->role('buyer'))
            ->whereNotNull('country')
            ->where('country', '!=', '')
            ->distinct()
            ->count('country');

        $productsTotal = Product::query()->count();
        $productsApproved = Product::query()->where('status', 'approved')->count();

        $revenueTrend = $this->revenueTrend(12);
        $quarterlyRevenue = $this->quarterlyRevenue();

        return [
            'kpis' => [
                'total_revenue' => round($totalRevenue, 2),
                'ytd_revenue' => round($ytdRevenue, 2),
                'revenue_yoy_pct' => $yoyPct,
                'orders_total' => $ordersTotal,
                'orders_yoy_pct' => $ordersYoyPct,
                'active_buyers' => $buyersActive,
                'buyers_total' => $buyersTotal,
                'buyers_yoy_pct' => $buyersYoyPct,
                'shipments_total' => $shipmentsTotal,
                'shipments_yoy_pct' => $shipmentsYoyPct,
            ],
            'business_stats' => [
                'total_revenue_ytd' => round($ytdRevenue, 2),
                'total_profit_ytd' => 0.0,
                'profit_margin_pct' => 0.0,
                'total_orders' => $ordersTotal,
                'active_buyers' => $buyersActive,
                'countries_reached' => $countriesReached,
                'products_catalogued' => $productsTotal,
                'products_approved' => $productsApproved,
                'on_time_delivery_pct' => $onTimeRate,
                'avg_lead_time_days' => 0,
                'customer_satisfaction' => 0.0,
                'compliance_rate_pct' => 0.0,
                'revenue_yoy_pct' => $yoyPct,
                'orders_yoy_pct' => $ordersYoyPct,
                'buyers_yoy_pct' => $buyersYoyPct,
            ],
            'logistics' => [
                'total_shipments' => $shipmentsTotal,
                'in_transit' => Shipment::query()->whereIn('status', ['booking', 'in-transit'])->count(),
                'delivered' => Shipment::query()->where('status', 'delivered')->count(),
                'on_time_rate_pct' => $onTimeRate,
            ],
            'investments_by_type' => $this->investmentsByType(),
            'revenue_trend' => $revenueTrend,
            'quarterly_revenue' => $quarterlyRevenue,
        ];
    }

    /**
     * @return list<array{type: string, raised: float, investors: int, avg_roi_pct: float}>
     */
    private function investmentsByType(): array
    {
        $types = ['container', 'produce', 'plant', 'ricemill', 'feed'];
        $labels = [
            'container' => 'Container',
            'produce' => 'Fresh Produce',
            'plant' => 'Potato Plant',
            'ricemill' => 'Rice Mill',
            'feed' => 'Feed Mill',
        ];

        $result = [];
        foreach ($types as $type) {
            $projectIds = InvestmentProject::query()->where('type', $type)->pluck('id');
            if ($projectIds->isEmpty()) {
                $result[] = [
                    'type' => $labels[$type],
                    'type_key' => $type,
                    'raised' => 0.0,
                    'investors' => 0,
                    'avg_roi_pct' => 0.0,
                ];

                continue;
            }

            $raised = (float) Investment::query()
                ->whereIn('project_id', $projectIds)
                ->whereIn('status', self::APPROVED_INVESTMENT_STATUSES)
                ->sum('amount');

            $investors = (int) Investment::query()
                ->whereIn('project_id', $projectIds)
                ->whereIn('status', self::ELIGIBLE_INVESTOR_STATUSES)
                ->selectRaw('COUNT(DISTINCT investor_id) as aggregate')
                ->value('aggregate');

            $avgRoi = (float) InvestmentProject::query()
                ->where('type', $type)
                ->whereNotNull('expected_return_pct')
                ->avg('expected_return_pct');

            $result[] = [
                'type' => $labels[$type],
                'type_key' => $type,
                'raised' => round($raised, 2),
                'investors' => $investors,
                'avg_roi_pct' => round($avgRoi, 1),
            ];
        }

        return $result;
    }

    private function onTimeDeliveryRate(): float
    {
        $delivered = Shipment::query()
            ->where('status', 'delivered')
            ->whereNotNull('eta')
            ->get(['eta', 'updated_at']);

        if ($delivered->isEmpty()) {
            return 0.0;
        }

        $onTime = $delivered->filter(function (Shipment $shipment) {
            if (! $shipment->eta || ! $shipment->updated_at) {
                return false;
            }

            return $shipment->updated_at->startOfDay()->lte($shipment->eta->copy()->endOfDay());
        })->count();

        return round(($onTime / $delivered->count()) * 100, 1);
    }

    /**
     * @return list<array{month: string, revenue: float, profit: float, expenses: float}>
     */
    private function revenueTrend(int $months = 12): array
    {
        $start = now()->startOfMonth()->subMonths($months - 1);
        $orders = Order::query()
            ->whereIn('status', self::DELIVERED_ORDER_STATUSES)
            ->get(['total_value', 'placed_at', 'created_at']);

        $monthly = [];
        foreach ($orders as $order) {
            $date = $order->placed_at ?: $order->created_at;
            if (! $date || $date->lt($start)) {
                continue;
            }
            $key = $date->format('Y-m');
            $monthly[$key] = ($monthly[$key] ?? 0) + (float) $order->total_value;
        }

        $points = [];
        for ($i = 0; $i < $months; $i++) {
            $month = $start->copy()->addMonths($i);
            $key = $month->format('Y-m');
            $revenue = (float) ($monthly[$key] ?? 0);
            $points[] = [
                'month' => $month->format('M'),
                'revenue' => round($revenue, 2),
                'profit' => 0.0,
                'expenses' => 0.0,
            ];
        }

        return $points;
    }

    /**
     * @return list<array{quarter: string, revenue: float}>
     */
    private function quarterlyRevenue(): array
    {
        $start = now()->startOfQuarter()->subQuarters(5);
        $points = [];

        for ($i = 0; $i < 6; $i++) {
            $qStart = $start->copy()->addQuarters($i)->startOfQuarter();
            $qEnd = $qStart->copy()->endOfQuarter();
            $revenue = $this->orderRevenue($qStart, $qEnd);
            $points[] = [
                'quarter' => 'Q'.$qStart->quarter.' '.$qStart->year,
                'revenue' => round($revenue, 2),
            ];
        }

        return $points;
    }

    private function orderRevenue(?Carbon $from, ?Carbon $to): float
    {
        $q = Order::query()->whereIn('status', self::DELIVERED_ORDER_STATUSES);

        if ($from) {
            $q->where(function ($inner) use ($from) {
                $inner->where('placed_at', '>=', $from)
                    ->orWhere(function ($q2) use ($from) {
                        $q2->whereNull('placed_at')->where('created_at', '>=', $from);
                    });
            });
        }

        if ($to) {
            $q->where(function ($inner) use ($to) {
                $inner->where('placed_at', '<=', $to)
                    ->orWhere(function ($q2) use ($to) {
                        $q2->whereNull('placed_at')->where('created_at', '<=', $to);
                    });
            });
        }

        return (float) $q->sum('total_value');
    }

    private function pctChange(float $current, float $previous): float
    {
        if ($previous <= 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
