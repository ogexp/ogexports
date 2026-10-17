<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Models\InvestorAutoInvestSetting;
use App\Models\Product;
use App\Support\KycGate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AutoInvestController extends Controller
{
    public function commodities(): JsonResponse
    {
        $names = Product::query()
            ->where('status', 'approved')
            ->whereNotNull('name')
            ->where('name', '<>', '')
            ->orderBy('name')
            ->pluck('name')
            ->map(fn ($name) => trim((string) $name))
            ->filter()
            ->unique(fn ($name) => mb_strtolower(trim((string) $name)))
            ->values()
            ->map(fn ($name) => ['name' => $name]);

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
        if ($data['enabled'] && ! Product::query()->where('status', 'approved')
            ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($data['commodity'])])
            ->exists()) {
            throw ValidationException::withMessages([
                'commodity' => ['Choose a product currently approved for public display.'],
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
