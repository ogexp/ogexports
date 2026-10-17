<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Models\InvestorAutoInvestCommodity;
use App\Models\InvestorAutoInvestSetting;
use App\Support\KycGate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AutoInvestController extends Controller
{
    public function commodities(): JsonResponse
    {
        $names = InvestorAutoInvestCommodity::query()
            ->where('enabled', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['name'])
            ->map(fn ($item) => ['name' => $item->name]);

        return response()->json(['data' => $names]);
    }

    public function show(Request $request): JsonResponse
    {
        $setting = InvestorAutoInvestSetting::query()->where('user_id', $request->user()->id)->first();
        $activity = \App\Models\InvestorAutoInvestExecution::query()
            ->with('project:id,title')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn ($execution) => [
                'project_id' => $execution->project_id,
                'project_title' => $execution->project?->title ?: 'Container opportunity',
                'investment_id' => $execution->investment_id,
                'status' => $execution->status,
                'amount' => (float) $execution->amount,
                'message' => $execution->message,
                'created_at' => $execution->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => [
            'enabled' => (bool) $setting?->enabled,
            'amount' => $setting ? (float) $setting->amount : null,
            'commodity' => $setting?->commodity,
            'container_type' => $setting?->container_type === 'ANY' ? null : $setting?->container_type,
            'recent_activity' => $activity,
        ]]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'amount' => ['required', 'numeric', 'min:1', 'max:10000000'],
            'commodity' => ['required', 'string', 'max:120'],
            'container_type' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);
        $data['commodity'] = trim($data['commodity']);
        if ($data['enabled'] && ! InvestorAutoInvestCommodity::query()->where('enabled', true)
            ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($data['commodity'])])
            ->exists()) {
            throw ValidationException::withMessages([
                'commodity' => ['Choose an auto-invest product enabled by an administrator.'],
            ]);
        }
        if ($data['enabled']) KycGate::ensureApproved($request->user());
        $data['container_type'] = filled($data['container_type'] ?? null)
            ? trim($data['container_type'])
            : 'ANY';

        $setting = InvestorAutoInvestSetting::query()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $data,
        );

        return response()->json(['message' => 'Auto-invest settings saved.', 'data' => [
            'enabled' => (bool) $setting->enabled,
            'amount' => (float) $setting->amount,
            'commodity' => $setting->commodity,
            'container_type' => $setting->container_type === 'ANY' ? null : $setting->container_type,
        ]]);
    }
}
