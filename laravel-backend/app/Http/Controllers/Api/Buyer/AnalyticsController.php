<?php

namespace App\Http\Controllers\Api\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Quotation;
use App\Models\Rfq;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class AnalyticsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $spendByMonth = Order::query()
            ->where('buyer_id', $userId)
            ->get(['created_at', 'total_value'])
            ->groupBy(fn (Order $order) => $order->created_at?->format('Y-m'))
            ->map(fn ($group, $month) => [
                'month' => $month,
                'total' => (float) $group->sum('total_value'),
            ])
            ->values();

        return response()->json([
            'data' => [
                'orders_total' => Order::query()->where('buyer_id', $userId)->count(),
                'spend_total' => (float) Order::query()->where('buyer_id', $userId)->sum('total_value'),
                'rfqs_total' => Rfq::query()->where('buyer_id', $userId)->count(),
                'quotations_accepted' => Quotation::query()->where('buyer_id', $userId)->where('status', 'accepted')->count(),
                'spend_by_month' => $spendByMonth,
            ],
        ]);
    }
}
