<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Models\InvestorAutoInvestSetting;
use App\Support\KycGate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AutoInvestController extends Controller
{
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
            'container_type' => $setting?->container_type,
            'recent_activity' => $activity,
        ]]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'amount' => ['required', 'numeric', 'min:1', 'max:10000000'],
            'commodity' => ['required', 'string', 'max:120'],
            'container_type' => ['required', 'string', 'max:80'],
        ]);
        if ($data['enabled']) KycGate::ensureApproved($request->user());

        $setting = InvestorAutoInvestSetting::query()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $data,
        );

        return response()->json(['message' => 'Auto-invest settings saved.', 'data' => [
            'enabled' => (bool) $setting->enabled,
            'amount' => (float) $setting->amount,
            'commodity' => $setting->commodity,
            'container_type' => $setting->container_type,
        ]]);
    }
}
