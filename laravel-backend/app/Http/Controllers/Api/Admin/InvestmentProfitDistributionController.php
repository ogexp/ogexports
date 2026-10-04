<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\InvestmentProfitDistribution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvestmentProfitDistributionController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = InvestmentProfitDistribution::query()
            ->with([
                'investment:id,reference,status',
                'project:id,title,type',
                'investor:id,name,email',
            ]);

        if ($projectType = $request->input('project_type')) {
            $query->where('project_type', $projectType);
        }

        if ($projectId = $request->input('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($investorId = $request->input('investor_id')) {
            $query->where('investor_id', $investorId);
        }

        if ($investmentId = $request->input('investment_id')) {
            $query->where('investment_id', $investmentId);
        }

        $paginator = $query->latest('distributed_at')->paginate($this->perPage($request));

        $paginator->setCollection(
            $paginator->getCollection()->map(fn (InvestmentProfitDistribution $row) => [
                'id' => $row->id,
                'investment_id' => $row->investment_id,
                'investment_reference' => $row->investment?->reference,
                'project_id' => $row->project_id,
                'project_title' => $row->project?->title,
                'project_type' => $row->project_type,
                'investor_id' => $row->investor_id,
                'investor_name' => $row->investor?->name,
                'investor_email' => $row->investor?->email,
                'invested_amount' => (float) $row->invested_amount,
                'profit_amount' => (float) $row->profit_amount,
                'total_return' => (float) $row->total_return,
                'roi_pct' => (float) $row->roi_pct,
                'wallet_transaction_id' => $row->wallet_transaction_id,
                'distributed_at' => $row->distributed_at?->toIso8601String(),
            ])
        );

        return response()->json($paginator);
    }
}
