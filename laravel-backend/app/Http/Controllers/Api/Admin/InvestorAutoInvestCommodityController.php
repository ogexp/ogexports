<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\InvestorAutoInvestCommodity;
use App\Support\AuditsActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InvestorAutoInvestCommodityController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => InvestorAutoInvestCommodity::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'enabled', 'sort_order']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:120', 'unique:investor_auto_invest_commodities,name'],
            'enabled' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:10000'],
        ]);
        $commodity = InvestorAutoInvestCommodity::query()->create($data + [
            'enabled' => true,
            'sort_order' => (InvestorAutoInvestCommodity::query()->max('sort_order') ?? -1) + 1,
        ]);

        AuditsActions::log('investor_auto_invest_commodity.created', 'investor_auto_invest_commodities', $request->user(), [
            'commodity_id' => $commodity->id,
            'name' => $commodity->name,
        ]);

        return response()->json([
            'message' => 'Auto-invest product created.',
            'data' => $this->item($commodity),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $commodity = InvestorAutoInvestCommodity::query()->findOrFail($id);
        $request->merge(['name' => trim((string) $request->input('name', $commodity->name))]);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:1', 'max:120', Rule::unique('investor_auto_invest_commodities', 'name')->ignore($commodity->id)],
            'enabled' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:10000'],
        ]);
        $commodity->update($data);

        AuditsActions::log('investor_auto_invest_commodity.updated', 'investor_auto_invest_commodities', $request->user(), [
            'commodity_id' => $commodity->id,
            'name' => $commodity->name,
            'enabled' => $commodity->enabled,
        ]);

        return response()->json(['message' => 'Auto-invest product updated.', 'data' => $this->item($commodity->fresh())]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $commodity = InvestorAutoInvestCommodity::query()->findOrFail($id);
        $name = $commodity->name;
        $commodity->delete();

        AuditsActions::log('investor_auto_invest_commodity.deleted', 'investor_auto_invest_commodities', $request->user(), [
            'commodity_id' => $id,
            'name' => $name,
        ]);

        return response()->json(['message' => 'Auto-invest product removed.']);
    }

    private function item(InvestorAutoInvestCommodity $commodity): array
    {
        return [
            'id' => (int) $commodity->id,
            'name' => $commodity->name,
            'enabled' => (bool) $commodity->enabled,
            'sort_order' => (int) $commodity->sort_order,
        ];
    }
}
