<?php

namespace App\Support;

use App\Models\AmlAlert;
use App\Models\AuditLog;
use App\Models\CrmLead;
use App\Models\Deposit;
use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\KycApplication;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\Rfq;
use App\Models\Shipment;
use App\Models\SupplierOffer;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\Withdrawal;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class ExecutiveDashboardService
{
    private const LOW_STOCK_THRESHOLD = 10;

    /** @var list<string> */
    private const APPROVED_DEPOSIT_STATUSES = ['approved', 'completed'];

    /** @var list<string> */
    private const PENDING_DEPOSIT_STATUSES = ['pending'];

    /** @var list<string> */
    private const APPROVED_WITHDRAWAL_STATUSES = ['approved', 'completed', 'paid'];

    /** @var list<string> */
    private const PENDING_WITHDRAWAL_STATUSES = ['pending', 'review'];

    /** @var list<string> */
    private const ELIGIBLE_INVESTMENT_STATUSES = ['pending', 'active', 'completed'];

    private const ACTIVE_ORDER_STATUSES = [
        'pending',
        'confirmed',
        'order_confirmed',
        'payment',
        'production',
        'quality_inspection',
        'loaded_at_port',
        'in_transit',
        'shipping',
    ];

    private const DELIVERED_ORDER_STATUSES = ['delivered', 'completed'];

    private const ACTIVE_SHIPMENT_STATUSES = ['pending', 'booking', 'in-transit', 'arrived'];

    private const IN_TRANSIT_SHIPMENT_STATUSES = ['booking', 'in-transit'];

    /**
     * @return array<string, mixed>
     */
    public function build(?string $period = null): array
    {
        $period = $this->normalizePeriod($period);
        $legacyCounts = $this->legacyCounts();
        $kpis = $this->kpis($period);

        return array_merge($legacyCounts, [
            'period' => $period,
            'kpis' => $kpis,
            'finance_summary' => $this->financeSummary(),
            'container_projects_by_status' => $this->containerProjectsByStatus(),
            'export_pipeline' => $this->exportPipeline(),
            'top_destinations' => $this->topDestinations(),
            'activity_feed' => $this->activityFeed(),
            'smart_notifications' => $this->smartNotifications(),
            'warehouse' => $this->warehouse(),
            'supplier_offers' => $this->supplierOffers(),
            'investment_summary' => $this->investments(),
            'charts' => $this->charts(),
            'calendar_events' => $this->calendarEvents(),
            'security' => $this->security(),
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Sum deposits using COALESCE(converted_amount, amount) — shared by finance_summary and kpis.payments.
     *
     * @param  list<string>  $statuses
     */
    private function sumDeposits(array $statuses): float
    {
        return round((float) Deposit::query()
            ->whereIn('status', $statuses)
            ->selectRaw('COALESCE(SUM(COALESCE(converted_amount, amount)), 0) as total')
            ->value('total'), 2);
    }

    /**
     * @param  list<string>  $statuses
     */
    private function countDeposits(array $statuses): int
    {
        return Deposit::query()->whereIn('status', $statuses)->count();
    }

    private function normalizePeriod(?string $period): string
    {
        $period = strtolower(trim((string) $period));

        return in_array($period, ['today', 'week', 'month', 'quarter', 'year'], true)
            ? $period
            : 'month';
    }

    /**
     * @return array{0: Carbon, 1: Carbon, 2: string}
     */
    private function periodWindow(string $period): array
    {
        $now = now();

        return match ($period) {
            'today' => [$now->copy()->startOfDay(), $now->copy()->endOfDay(), 'Today'],
            'week' => [$now->copy()->startOfWeek(), $now->copy()->endOfWeek(), 'This week'],
            'quarter' => [$now->copy()->firstOfQuarter(), $now->copy()->lastOfQuarter(), 'This quarter'],
            'year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear(), 'FY '.$now->format('Y')],
            default => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth(), $now->format('M Y')],
        };
    }

    /**
     * Platform-wide investor deposit / withdrawal amount totals and transaction counts (USD display).
     * Lifetime totals — not period-scoped. Deposit amounts use COALESCE(converted_amount, amount).
     * Withdrawal status sets differ from FinanceStatsService monthly widgets (which use approved-only + reviewed_at).
     *
     * @return array{
     *     total_deposits: float,
     *     pending_deposits: float,
     *     total_withdrawals: float,
     *     pending_withdrawals: float,
     *     total_deposits_count: int,
     *     pending_deposits_count: int,
     *     total_withdrawals_count: int,
     *     pending_withdrawals_count: int
     * }
     */
    private function financeSummary(): array
    {
        $totalDeposits = $this->sumDeposits(self::APPROVED_DEPOSIT_STATUSES);
        $pendingDeposits = $this->sumDeposits(self::PENDING_DEPOSIT_STATUSES);

        $totalWithdrawals = (float) Withdrawal::query()
            ->whereIn('status', self::APPROVED_WITHDRAWAL_STATUSES)
            ->sum('amount');

        $pendingWithdrawals = (float) Withdrawal::query()
            ->whereIn('status', self::PENDING_WITHDRAWAL_STATUSES)
            ->sum('amount');

        return [
            'total_deposits' => $totalDeposits,
            'pending_deposits' => $pendingDeposits,
            'total_withdrawals' => round($totalWithdrawals, 2),
            'pending_withdrawals' => round($pendingWithdrawals, 2),
            'total_deposits_count' => $this->countDeposits(self::APPROVED_DEPOSIT_STATUSES),
            'pending_deposits_count' => $this->countDeposits(self::PENDING_DEPOSIT_STATUSES),
            'total_withdrawals_count' => Withdrawal::query()->whereIn('status', self::APPROVED_WITHDRAWAL_STATUSES)->count(),
            'pending_withdrawals_count' => Withdrawal::query()->whereIn('status', self::PENDING_WITHDRAWAL_STATUSES)->count(),
        ];
    }

    /**
     * Container investment project counts keyed by normalized lifecycle status.
     *
     * @return array<string, int>
     */
    private function containerProjectsByStatus(): array
    {
        $counts = array_fill_keys(ContainerProjectStatus::STATUSES, 0);
        $counts['total'] = 0;

        $statuses = InvestmentProject::query()
            ->where('type', 'container')
            ->pluck('status');

        foreach ($statuses as $raw) {
            $normalized = ContainerProjectStatus::normalize($raw);
            if (! array_key_exists($normalized, $counts)) {
                continue;
            }
            $counts[$normalized]++;
            $counts['total']++;
        }

        return $counts;
    }

    /**
     * Backward-compatible flat counts used by existing AuthApiTest.
     *
     * @return array<string, int>
     */
    private function legacyCounts(): array
    {
        return [
            'users' => User::query()->count(),
            'buyers' => User::role('buyer')->count(),
            'suppliers' => User::role('supplier')->count(),
            'investors' => User::role('investor')->count(),
            'products' => Product::query()->count(),
            'products_pending' => Product::query()->where('status', 'pending')->count(),
            'orders' => Order::query()->count(),
            'orders_open' => Order::query()->whereNotIn('status', ['completed', 'cancelled', 'delivered'])->count(),
            'rfqs' => Rfq::query()->count(),
            'rfqs_open' => Rfq::query()->whereIn('status', ['pending', 'quoted', 'new'])->count(),
            'supplier_offers_pending' => SupplierOffer::query()->where('status', 'pending')->count(),
            'deposits_pending' => Deposit::query()->where('status', 'pending')->count(),
            'withdrawals_pending' => Withdrawal::query()->where('status', 'pending')->count(),
            'kyc_pending' => KycApplication::query()->where('status', 'pending')->count(),
            'aml_open' => AmlAlert::query()->whereIn('status', ['open', 'pending'])->count(),
            'investment_projects' => InvestmentProject::query()->count(),
            'investments' => Investment::query()->count(),
            'crm_leads' => CrmLead::query()->count(),
            'support_open' => SupportTicket::query()->whereIn('status', ['open', 'pending'])->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function kpis(string $period = 'month'): array
    {
        $now = now();
        $monthStart = $now->copy()->startOfMonth();
        $yearStart = $now->copy()->startOfYear();
        $prevYearStart = $now->copy()->subYear()->startOfYear();
        $prevYearEnd = $now->copy()->subYear()->endOfYear();
        [$periodStart, $periodEnd, $periodLabel] = $this->periodWindow($period);

        // Previous period of equal length for growth comparison
        $periodLength = max(1, $periodStart->diffInSeconds($periodEnd));
        $prevPeriodEnd = $periodStart->copy()->subSecond();
        $prevPeriodStart = $prevPeriodEnd->copy()->subSeconds($periodLength);

        $totalRevenue = $this->orderRevenue(null, null, self::DELIVERED_ORDER_STATUSES);
        $periodRevenue = $this->orderRevenue($periodStart, $periodEnd, self::DELIVERED_ORDER_STATUSES);
        $annualRevenue = $this->orderRevenue($yearStart, null, self::DELIVERED_ORDER_STATUSES);
        $prevYearRevenue = $this->orderRevenue($prevYearStart, $prevYearEnd, self::DELIVERED_ORDER_STATUSES);
        $prevPeriodRevenue = $this->orderRevenue($prevPeriodStart, $prevPeriodEnd, self::DELIVERED_ORDER_STATUSES);

        $yoyGrowth = $this->pctChange($annualRevenue, $prevYearRevenue);
        $periodGrowth = $this->pctChange($periodRevenue, $prevPeriodRevenue);

        $buyersTotal = User::role('buyer')->count();
        $activeBuyerIds = Order::query()
            ->where('created_at', '>=', $now->copy()->subDays(30))
            ->distinct()
            ->pluck('buyer_id');
        $buyersActive = $activeBuyerIds->count();
        $buyersNewPeriod = User::role('buyer')
            ->where('created_at', '>=', $periodStart)
            ->where('created_at', '<=', $periodEnd)
            ->count();
        $retention = $buyersTotal > 0
            ? round(($buyersActive / max(1, $buyersTotal)) * 100, 1)
            : 0.0;

        $investorsTotal = User::role('investor')->count();
        $investmentValue = (float) Investment::query()
            ->whereIn('status', self::ELIGIBLE_INVESTMENT_STATUSES)
            ->sum('amount');

        $ordersTotal = Order::query()->count();
        $ordersActive = Order::query()->whereIn('status', self::ACTIVE_ORDER_STATUSES)->count();
        $ordersCompleted = Order::query()->whereIn('status', self::DELIVERED_ORDER_STATUSES)->count();
        $ordersPending = Order::query()->whereIn('status', ['pending', 'order_confirmed', 'payment'])->count();
        $ordersCancelled = Order::query()->where('status', 'cancelled')->count();

        $rfqsToday = Rfq::query()->whereDate('created_at', $now->toDateString())->count();
        $quotesPending = Quotation::query()->whereIn('status', ['pending_admin', 'sent', 'draft'])->count();
        $quotesApproved = Quotation::query()->where('status', 'accepted')->count();
        $quotesRejected = Quotation::query()->where('status', 'rejected')->count();

        $shipmentsActive = Shipment::query()->whereIn('status', self::ACTIVE_SHIPMENT_STATUSES)->count();
        $containersTransit = Shipment::query()->whereIn('status', self::IN_TRANSIT_SHIPMENT_STATUSES)->count();
        $shipmentsDelivered = Shipment::query()
            ->where('status', 'delivered')
            ->where('updated_at', '>=', $periodStart)
            ->where('updated_at', '<=', $periodEnd)
            ->count();

        $lowStockAlerts = Product::query()
            ->whereNotNull('stock')
            ->where('stock', '!=', '')
            ->get(['stock'])
            ->filter(fn (Product $p) => is_numeric($p->stock) && (float) $p->stock <= self::LOW_STOCK_THRESHOLD && (float) $p->stock >= 0)
            ->count();

        $importedProducts = Product::query()->where('status', 'approved')->count();
        $warehouseItems = Product::query()
            ->where('status', 'approved')
            ->whereNotNull('stock')
            ->where('stock', '!=', '')
            ->get(['stock'])
            ->filter(fn (Product $p) => is_numeric($p->stock) && (float) $p->stock > 0)
            ->count();

        $inventoryTotalValue = $this->inventoryTotalValue();

        // Align with finance_summary: approved+completed deposits use effective FX amounts
        $pendingDepositsSum = $this->sumDeposits(self::PENDING_DEPOSIT_STATUSES);
        $pendingOrderPayments = (float) Order::query()
            ->where('payment_status', 'pending')
            ->sum('total_value');
        $paymentsPending = round($pendingDepositsSum + $pendingOrderPayments, 2);
        $paymentsCompleted = $this->sumDeposits(self::APPROVED_DEPOSIT_STATUSES);
        $outstanding = round($pendingOrderPayments, 2);

        return [
            'revenue' => [
                'total' => round($totalRevenue, 2),
                'monthly' => round($periodRevenue, 2),
                'annual' => round($annualRevenue, 2),
                'gross_profit' => 0.0,
                'net_profit' => 0.0,
                'growth_pct' => $yoyGrowth,
                'monthly_growth_pct' => $periodGrowth,
                'month_label' => $periodLabel,
                'year_label' => 'FY '.$now->format('Y'),
            ],
            'buyers' => [
                'total' => $buyersTotal,
                'active' => $buyersActive,
                'new_this_month' => $buyersNewPeriod,
                'retention_pct' => $retention,
            ],
            'investors' => [
                'total' => $investorsTotal,
                'active' => $investorsTotal,
                'investment_value' => round($investmentValue, 2),
            ],
            'orders' => [
                'total' => $ordersTotal,
                'active' => $ordersActive,
                'completed' => $ordersCompleted,
                'pending' => $ordersPending,
                'cancelled' => $ordersCancelled,
            ],
            'rfqs' => [
                'today' => $rfqsToday,
                'quotations_pending' => $quotesPending,
                'quotations_approved' => $quotesApproved,
                'quotations_rejected' => $quotesRejected,
            ],
            'shipments' => [
                'in_progress' => $shipmentsActive,
                'containers_transit' => $containersTransit,
                'delivered' => $shipmentsDelivered,
            ],
            'inventory' => [
                'imported_products' => $importedProducts,
                'warehouse_items' => $warehouseItems,
                'low_stock_alerts' => $lowStockAlerts,
                'total_value' => $inventoryTotalValue,
            ],
            'payments' => [
                'pending' => $paymentsPending,
                'completed' => $paymentsCompleted,
                'outstanding' => $outstanding,
            ],
        ];
    }

    /**
     * Full-catalog inventory value (stock × price/fob) for approved products with numeric stock.
     */
    private function inventoryTotalValue(): float
    {
        return round((float) Product::query()
            ->where('status', 'approved')
            ->whereNotNull('stock')
            ->where('stock', '!=', '')
            ->get(['stock', 'price', 'fob'])
            ->filter(fn (Product $p) => is_numeric($p->stock) && (float) $p->stock > 0)
            ->sum(function (Product $product) {
                $stock = (float) $product->stock;
                $price = (float) ($product->price ?? $product->fob ?? 0);

                return $stock * $price;
            }), 2);
    }

    /**
     * @param  list<string>|null  $statuses
     */
    private function orderRevenue(?Carbon $from, ?Carbon $to, ?array $statuses = null): float
    {
        $q = Order::query();
        if ($statuses !== null) {
            $q->whereIn('status', $statuses);
        }
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

    /**
     * @return list<array<string, mixed>>
     */
    private function exportPipeline(): array
    {
        $orders = Order::query()
            ->with(['buyer:id,name', 'items'])
            ->whereNotIn('status', ['delivered', 'completed', 'cancelled'])
            ->latest('placed_at')
            ->latest('id')
            ->limit(10)
            ->get();

        return $orders->map(function (Order $order) {
            $item = $order->items->first();
            $stage = $this->mapOrderStage((string) $order->status);

            return [
                'id' => $order->order_number ?: ('ORD-'.$order->id),
                'buyer' => $order->buyer?->name ?: 'Unknown',
                'product' => $item?->product_name ?: '—',
                'qty' => $item?->qty ?: '—',
                'stage' => $stage,
                'eta' => $order->required_delivery_date
                    ? Carbon::parse($order->required_delivery_date)->format('M j')
                    : '—',
                'value' => round((float) $order->total_value, 2),
                'status' => $order->status,
            ];
        })->values()->all();
    }

    private function mapOrderStage(string $status): string
    {
        return match (strtolower($status)) {
            'pending', 'confirmed', 'order_confirmed', 'payment' => 'order',
            'production', 'quality_inspection' => 'production',
            'loaded_at_port' => 'loading',
            'shipping', 'in_transit' => 'transit',
            'delivered', 'completed' => 'delivered',
            default => 'order',
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function topDestinations(): array
    {
        $grouped = Order::query()
            ->with('country:id,name')
            ->get(['id', 'country_id', 'destination', 'total_value'])
            ->groupBy(function (Order $order) {
                $name = $order->country?->name ?: trim((string) $order->destination);

                return $name !== '' ? $name : 'Unknown';
            });

        return $grouped
            ->map(function (Collection $rows, string $name) {
                return [
                    'name' => $name,
                    'flag' => '',
                    'orders' => $rows->count(),
                    'revenue' => round((float) $rows->sum('total_value'), 2),
                ];
            })
            ->sortByDesc('orders')
            ->take(14)
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function activityFeed(): array
    {
        $events = collect();

        User::query()->latest('id')->limit(5)->get()->each(function (User $user) use ($events) {
            $role = method_exists($user, 'getRoleNames') ? ($user->getRoleNames()->first() ?: 'user') : 'user';
            $events->push([
                'id' => 'user-'.$user->id,
                'type' => $role === 'investor' ? 'investor' : ($role === 'buyer' ? 'buyer' : 'user'),
                'icon' => 'Users',
                'color' => '#2563eb',
                'title' => 'New '.ucfirst((string) $role).' Registered',
                'detail' => $user->name.($user->email ? ' — '.$user->email : ''),
                'time' => $user->created_at?->diffForHumans() ?: '',
                'at' => $user->created_at?->timestamp ?? 0,
            ]);
        });

        Order::query()->with('buyer:id,name')->latest('id')->limit(5)->get()->each(function (Order $order) use ($events) {
            $events->push([
                'id' => 'order-'.$order->id,
                'type' => 'order',
                'icon' => 'ShoppingCart',
                'color' => 'hsl(158, 59%, 15%)',
                'title' => 'New Order Confirmed',
                'detail' => ($order->order_number ?: 'ORD-'.$order->id).' — '.$order->buyer?->name,
                'time' => $order->created_at?->diffForHumans() ?: '',
                'at' => $order->created_at?->timestamp ?? 0,
            ]);
        });

        Rfq::query()->latest('id')->limit(5)->get()->each(function (Rfq $rfq) use ($events) {
            $events->push([
                'id' => 'rfq-'.$rfq->id,
                'type' => 'rfq',
                'icon' => 'FileText',
                'color' => 'hsl(158, 59%, 15%)',
                'title' => 'New RFQ Received',
                'detail' => $rfq->product_name.' — '.$rfq->qty,
                'time' => $rfq->created_at?->diffForHumans() ?: '',
                'at' => $rfq->created_at?->timestamp ?? 0,
            ]);
        });

        Deposit::query()->with('investor:id,name')->latest('id')->limit(5)->get()->each(function (Deposit $deposit) use ($events) {
            $events->push([
                'id' => 'deposit-'.$deposit->id,
                'type' => 'payment',
                'icon' => 'CreditCard',
                'color' => '#16a34a',
                'title' => 'Deposit '.ucfirst((string) $deposit->status),
                'detail' => ($deposit->investor?->name ?: 'Investor').' — $'.number_format((float) $deposit->amount, 2),
                'time' => $deposit->created_at?->diffForHumans() ?: '',
                'at' => $deposit->created_at?->timestamp ?? 0,
            ]);
        });

        Withdrawal::query()->with('investor:id,name')->latest('id')->limit(5)->get()->each(function (Withdrawal $wd) use ($events) {
            $events->push([
                'id' => 'withdrawal-'.$wd->id,
                'type' => 'payment',
                'icon' => 'CreditCard',
                'color' => '#f59e0b',
                'title' => 'Withdrawal '.ucfirst((string) $wd->status),
                'detail' => ($wd->investor?->name ?: 'Investor').' — $'.number_format((float) $wd->amount, 2),
                'time' => $wd->created_at?->diffForHumans() ?: '',
                'at' => $wd->created_at?->timestamp ?? 0,
            ]);
        });

        Investment::query()->with('investor:id,name')->latest('id')->limit(5)->get()->each(function (Investment $inv) use ($events) {
            $events->push([
                'id' => 'investment-'.$inv->id,
                'type' => 'investor',
                'icon' => 'TrendingUp',
                'color' => '#D4A012',
                'title' => 'New Investment',
                'detail' => ($inv->investor?->name ?: 'Investor').' — $'.number_format((float) $inv->amount, 2),
                'time' => $inv->created_at?->diffForHumans() ?: '',
                'at' => $inv->created_at?->timestamp ?? 0,
            ]);
        });

        Shipment::query()->latest('id')->limit(5)->get()->each(function (Shipment $shipment) use ($events) {
            $events->push([
                'id' => 'shipment-'.$shipment->id,
                'type' => 'shipment',
                'icon' => 'Ship',
                'color' => 'hsl(158, 59%, 15%)',
                'title' => 'Shipment '.ucfirst(str_replace('-', ' ', (string) $shipment->status)),
                'detail' => ($shipment->container ?: 'SHP-'.$shipment->id).' → '.($shipment->destination ?: '—'),
                'time' => $shipment->created_at?->diffForHumans() ?: '',
                'at' => $shipment->created_at?->timestamp ?? 0,
            ]);
        });

        KycApplication::query()->with('user:id,name')->latest('id')->limit(5)->get()->each(function (KycApplication $kyc) use ($events) {
            $events->push([
                'id' => 'kyc-'.$kyc->id,
                'type' => 'kyc',
                'icon' => 'Shield',
                'color' => '#8b5cf6',
                'title' => 'KYC '.ucfirst((string) $kyc->status),
                'detail' => $kyc->user?->name ?: 'User #'.$kyc->user_id,
                'time' => $kyc->created_at?->diffForHumans() ?: '',
                'at' => $kyc->created_at?->timestamp ?? 0,
            ]);
        });

        return $events
            ->sortByDesc('at')
            ->take(15)
            ->values()
            ->map(function (array $event) {
                unset($event['at']);

                return $event;
            })
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function smartNotifications(): array
    {
        $notifications = [];
        $id = 1;

        $lowStock = Product::query()
            ->whereNotNull('stock')
            ->where('stock', '!=', '')
            ->orderBy('id')
            ->limit(50)
            ->get(['name', 'stock'])
            ->filter(fn (Product $p) => is_numeric($p->stock) && (float) $p->stock <= self::LOW_STOCK_THRESHOLD && (float) $p->stock >= 0)
            ->sortBy(fn (Product $p) => (float) $p->stock)
            ->take(5)
            ->values();

        if ($lowStock->isNotEmpty()) {
            $names = $lowStock->pluck('name')->implode(', ');
            $notifications[] = [
                'id' => $id++,
                'type' => 'urgent',
                'icon' => 'AlertTriangle',
                'color' => '#ef4444',
                'title' => $lowStock->count().' Low Stock Alert'.($lowStock->count() > 1 ? 's' : ''),
                'detail' => $names.' below threshold',
                'time' => 'Just now',
            ];
        }

        $pendingQuotes = Quotation::query()->whereIn('status', ['pending_admin', 'sent', 'draft'])->count();
        if ($pendingQuotes > 0) {
            $oldest = Quotation::query()
                ->whereIn('status', ['pending_admin', 'sent', 'draft'])
                ->oldest('id')
                ->first();
            $notifications[] = [
                'id' => $id++,
                'type' => 'action',
                'icon' => 'Clock',
                'color' => '#f59e0b',
                'title' => $pendingQuotes.' Quotation'.($pendingQuotes > 1 ? 's' : '').' Pending Approval',
                'detail' => $oldest
                    ? 'Oldest: QT-'.$oldest->id.' — '.$oldest->product_name
                    : 'Awaiting review',
                'time' => 'Today',
            ];
        }

        $pendingKyc = KycApplication::query()->where('status', 'pending')->count();
        if ($pendingKyc > 0) {
            $notifications[] = [
                'id' => $id++,
                'type' => 'kyc',
                'icon' => 'Shield',
                'color' => '#8b5cf6',
                'title' => $pendingKyc.' KYC Review'.($pendingKyc > 1 ? 's' : '').' Pending',
                'detail' => 'Awaiting document verification',
                'time' => 'Today',
            ];
        }

        $pendingDepositTotal = (float) Deposit::query()->where('status', 'pending')->sum('amount');
        $pendingDepositCount = Deposit::query()->where('status', 'pending')->count();
        if ($pendingDepositCount > 0) {
            $notifications[] = [
                'id' => $id++,
                'type' => 'payment',
                'icon' => 'CreditCard',
                'color' => 'hsl(158, 59%, 15%)',
                'title' => $pendingDepositCount.' Deposit'.($pendingDepositCount > 1 ? 's' : '').' Pending',
                'detail' => '$'.number_format($pendingDepositTotal, 2).' awaiting approval',
                'time' => 'Today',
            ];
        }

        $delayed = Shipment::query()
            ->whereNotNull('eta')
            ->where('eta', '<', now()->toDateString())
            ->whereNotIn('status', ['delivered', 'arrived'])
            ->limit(3)
            ->get();

        foreach ($delayed as $shipment) {
            $days = Carbon::parse($shipment->eta)->diffInDays(now());
            $notifications[] = [
                'id' => $id++,
                'type' => 'shipment',
                'icon' => 'Truck',
                'color' => '#2563eb',
                'title' => 'Shipment Delay Alert',
                'detail' => 'SHP-'.$shipment->id.' delayed '.$days.' day'.($days === 1 ? '' : 's').' — '.($shipment->destination ?: 'destination'),
                'time' => 'Today',
            ];
        }

        return $notifications;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function warehouse(): array
    {
        return Product::query()
            ->where('status', 'approved')
            ->whereNotNull('stock')
            ->where('stock', '!=', '')
            ->orderBy('id')
            ->limit(50)
            ->get()
            ->filter(fn (Product $p) => is_numeric($p->stock))
            ->map(function (Product $product) {
                $stock = (float) ($product->stock ?? 0);
                $price = (float) ($product->price ?? $product->fob ?? 0);
                $status = $stock <= 5 ? 'critical' : ($stock <= self::LOW_STOCK_THRESHOLD ? 'low' : 'good');

                return [
                    'product' => $product->name,
                    'sku' => $product->sku ?: '—',
                    'qty' => $stock,
                    'unit' => 'MT',
                    'location' => '—',
                    'value' => round($stock * $price, 2),
                    'status' => $status,
                ];
            })
            ->sortBy('qty')
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function supplierOffers(): array
    {
        return SupplierOffer::query()
            ->with('supplier:id,name')
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(function (SupplierOffer $offer) {
                return [
                    'id' => $offer->id,
                    'supplier' => $offer->supplier?->name ?: 'Unknown',
                    'product' => $offer->product_name,
                    'qty' => $offer->available_qty ?: '—',
                    'price' => '$'.number_format((float) $offer->price_fob, 2).'/'.($offer->price_unit ?: 'MT'),
                    'quality' => $offer->rating ? (string) $offer->rating : '—',
                    'delivery' => $offer->lead_time ?: '—',
                    'status' => $offer->status ?: 'pending',
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function investments(): array
    {
        $portfolio = InvestmentCapacity::portfolioTotals();
        $totalInvestment = round((float) Investment::query()
            ->whereIn('status', self::ELIGIBLE_INVESTMENT_STATUSES)
            ->sum('amount'), 2);

        $avgRoi = (float) InvestmentProject::query()
            ->whereNotNull('expected_return_pct')
            ->avg('expected_return_pct');

        $openProjects = InvestmentProject::query()
            ->whereIn('status', [
                'pending',
                'funding',
                'investment_confirmed',
                'active',
                'ready_to_ship',
            ])
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(function (InvestmentProject $project) {
                $cap = InvestmentCapacity::snapshot($project);
                $target = max(0.01, (float) $project->target_amount);
                $raisedPct = min(100, round(($cap['active_raised'] / $target) * 100));

                return [
                    'id' => $project->reference ?: ('P-'.$project->id),
                    'title' => $project->title,
                    'target' => round((float) $project->target_amount, 2),
                    'raised_pct' => $raisedPct,
                    'roi' => $project->roi_label ?: (($project->expected_return_pct !== null ? (string) $project->expected_return_pct.'%' : '—')),
                    'eta' => $project->eta ? Carbon::parse($project->eta)->format('M Y') : ($project->funding_deadline ? Carbon::parse($project->funding_deadline)->format('M Y') : '—'),
                ];
            })
            ->values()
            ->all();

        return [
            // Eligible investments (pending + active + completed) — aligns with kpis.investors.investment_value
            'total_investment' => $totalInvestment,
            // Active+completed raised only
            'active_portfolio' => $portfolio['total_raised'],
            'portfolio_value' => $portfolio['total_raised'],
            'total_investors' => $portfolio['total_investors'],
            'avg_roi_pct' => round($avgRoi, 1),
            'active_projects' => $portfolio['active_projects'],
            'open_projects' => $openProjects,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function charts(): array
    {
        return [
            'revenue_trend' => $this->revenueTrend(),
            'buyer_growth' => $this->buyerGrowth(),
            'product_performance' => $this->productPerformance(),
            'country_performance' => $this->topDestinations(),
            'currency_breakdown' => $this->currencyBreakdown(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function revenueTrend(): array
    {
        $start = now()->startOfMonth()->subMonths(11);
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
        for ($i = 0; $i < 12; $i++) {
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
     * @return list<array<string, mixed>>
     */
    private function buyerGrowth(): array
    {
        $start = now()->startOfMonth()->subMonths(5);
        $points = [];

        for ($i = 0; $i < 6; $i++) {
            $monthEnd = $start->copy()->addMonths($i)->endOfMonth();
            $points[] = [
                'month' => $start->copy()->addMonths($i)->format('M'),
                'buyers' => User::role('buyer')->where('created_at', '<=', $monthEnd)->count(),
                'investors' => User::role('investor')->where('created_at', '<=', $monthEnd)->count(),
                'suppliers' => User::role('supplier')->where('created_at', '<=', $monthEnd)->count(),
            ];
        }

        return $points;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function productPerformance(): array
    {
        return OrderItem::query()
            ->get(['product_name', 'line_total'])
            ->groupBy('product_name')
            ->map(function (Collection $rows, string $name) {
                return [
                    'name' => $name,
                    'orders' => $rows->count(),
                    'revenue' => round((float) $rows->sum('line_total'), 2),
                    'growth' => 0.0,
                ];
            })
            ->sortByDesc('revenue')
            ->take(8)
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function currencyBreakdown(): array
    {
        $orders = Order::query()->get(['currency', 'total_value']);
        $total = (float) $orders->sum('total_value');

        return $orders
            ->groupBy(fn (Order $order) => $order->currency ?: 'USD')
            ->map(function (Collection $rows, string $currency) use ($total) {
                $volume = (float) $rows->sum('total_value');
                $count = $rows->count();
                $pct = $total > 0 ? round(($volume / $total) * 100, 1) : 0.0;

                return [
                    'currency' => $currency,
                    'volume' => round($volume, 2),
                    'orders' => $count,
                    'pct' => $pct,
                    'avg' => $count > 0 ? round($volume / $count, 2) : 0.0,
                ];
            })
            ->sortByDesc('volume')
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function calendarEvents(): array
    {
        $events = collect();

        Shipment::query()
            ->whereNotNull('eta')
            ->where('eta', '>=', now()->toDateString())
            ->orderBy('eta')
            ->limit(10)
            ->get()
            ->each(function (Shipment $shipment) use ($events) {
                $events->push([
                    'date' => Carbon::parse($shipment->eta)->format('M j'),
                    'title' => 'Shipment SHP-'.$shipment->id.' ETA '.($shipment->destination ?: ''),
                    'type' => 'shipment',
                    'time' => 'Port Arrival',
                    'sort' => Carbon::parse($shipment->eta)->timestamp,
                ]);
            });

        Quotation::query()
            ->whereNotNull('valid_until')
            ->where('valid_until', '>=', now()->toDateString())
            ->whereIn('status', ['pending_admin', 'sent', 'draft'])
            ->orderBy('valid_until')
            ->limit(10)
            ->get()
            ->each(function (Quotation $quote) use ($events) {
                $events->push([
                    'date' => Carbon::parse($quote->valid_until)->format('M j'),
                    'title' => 'QT-'.$quote->id.' Quotation Expires',
                    'type' => 'expiry',
                    'time' => 'EOD',
                    'sort' => Carbon::parse($quote->valid_until)->timestamp,
                ]);
            });

        Order::query()
            ->whereNotNull('required_delivery_date')
            ->where('required_delivery_date', '>=', now()->toDateString())
            ->whereNotIn('status', ['delivered', 'completed', 'cancelled'])
            ->orderBy('required_delivery_date')
            ->limit(10)
            ->get()
            ->each(function (Order $order) use ($events) {
                $events->push([
                    'date' => Carbon::parse($order->required_delivery_date)->format('M j'),
                    'title' => ($order->order_number ?: 'ORD-'.$order->id).' Delivery Due',
                    'type' => 'shipment',
                    'time' => 'ETA',
                    'sort' => Carbon::parse($order->required_delivery_date)->timestamp,
                ]);
            });

        return $events
            ->sortBy('sort')
            ->take(12)
            ->values()
            ->map(function (array $event) {
                unset($event['sort']);

                return $event;
            })
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function security(): array
    {
        $logs = AuditLog::query()
            ->with('user:id,name,email')
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(function (AuditLog $log) {
                return [
                    'user' => $log->user?->email ?: ($log->user?->name ?: 'System'),
                    'action' => $log->action,
                    'ip' => $log->ip ?: '—',
                    'time' => $log->created_at?->diffForHumans() ?: '',
                    'status' => str_contains(strtolower((string) $log->action), 'fail') ? 'failed' : 'success',
                ];
            })
            ->values()
            ->all();

        return [
            'audit_log_count' => AuditLog::query()->count(),
            'failed_attempts_today' => AuditLog::query()
                ->whereDate('created_at', now()->toDateString())
                ->where('action', 'like', '%fail%')
                ->count(),
            'failed_attempts_7d' => AuditLog::query()
                ->where('created_at', '>=', now()->subDays(7)->startOfDay())
                ->where('action', 'like', '%fail%')
                ->count(),
            'logs' => $logs,
        ];
    }
}
