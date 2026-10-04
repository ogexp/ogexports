<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;

class FacilityContentController extends Controller
{
    public function show(string $type): JsonResponse
    {
        abort_unless(in_array($type, ['feed', 'ricemill', 'plant'], true), 404);

        $settings = PlatformSetting::query()->first();
        $all = $settings?->facility_content ?? [];
        $content = is_array($all[$type] ?? null) ? $all[$type] : [];

        return response()->json(['data' => $content]);
    }
}
