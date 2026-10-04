<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Models\InvestmentProject;
use Illuminate\Http\JsonResponse;

class DepositOptionController extends Controller
{
    public function index(): JsonResponse
    {
        $options = InvestmentProject::query()
            ->where('show_in_deposit', true)
            ->whereIn('status', ['funding', 'active'])
            ->orderBy('deposit_sort_order')
            ->orderBy('title')
            ->get()
            ->map(fn (InvestmentProject $p) => [
                'id' => $p->id,
                'title' => $p->title,
                'type' => $p->type,
                'status' => $p->status,
                'roi_label' => $p->roi_label,
                'expected_return_pct' => (float) ($p->expected_return_pct ?: 0),
                'target_amount' => (float) ($p->target_amount ?: 0),
                'raised_amount' => (float) ($p->raised_amount ?: 0),
                'min_investment' => (float) ($p->min_investment ?: 0),
                'deposit_sort_order' => (int) ($p->deposit_sort_order ?: 0),
                'dashboard_module' => $p->dashboard_module,
                'commodity' => $p->commodity,
                'container_type' => $p->container_type,
            ])
            ->values();

        return response()->json(['data' => $options]);
    }
}
