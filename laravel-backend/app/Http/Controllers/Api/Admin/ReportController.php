<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Deposit;
use App\Models\Investment;
use App\Models\Order;
use App\Models\Product;
use App\Models\Rfq;
use App\Models\User;
use App\Models\Withdrawal;
use App\Support\AdminReportsStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $ordersByStatus = Order::query()
            ->select('status', DB::raw('count(*) as total'), DB::raw('coalesce(sum(total_value),0) as value'))
            ->groupBy('status')
            ->get();

        $usersByRole = collect(['admin', 'buyer', 'supplier', 'investor'])->map(fn ($role) => [
            'role' => $role,
            'total' => User::role($role)->count(),
        ]);

        $stats = (new AdminReportsStatsService)->build();

        return response()->json([
            'data' => array_merge([
                'orders_by_status' => $ordersByStatus,
                'users_by_role' => $usersByRole,
                'products_total' => Product::query()->count(),
                'rfqs_total' => Rfq::query()->count(),
                'order_value_total' => (float) Order::query()->sum('total_value'),
                'deposits_approved_total' => (float) Deposit::query()->where('status', 'approved')->sum('amount'),
                'withdrawals_approved_total' => (float) Withdrawal::query()->where('status', 'approved')->sum('amount'),
                'investments_total' => (float) Investment::query()->sum('amount'),
            ], $stats),
        ]);
    }
}
