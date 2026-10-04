<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Support\AuditsActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityContentController extends Controller
{
    private const TYPES = ['feed', 'ricemill', 'plant'];

    public function show(string $type): JsonResponse
    {
        abort_unless(in_array($type, self::TYPES, true), 404);

        return response()->json([
            'data' => $this->contentFor($type),
        ]);
    }

    public function update(Request $request, string $type): JsonResponse
    {
        abort_unless(in_array($type, self::TYPES, true), 404);

        $data = $request->validate([
            'content' => ['required', 'array'],
            'content.layoutTitle' => ['nullable', 'string', 'max:255'],
            'content.layoutSubtitle' => ['nullable', 'string', 'max:500'],
            'content.projectStatus' => ['nullable', 'string', 'max:100'],
            'content.projectCode' => ['nullable', 'string', 'max:100'],
            'content.utilizationBadge' => ['nullable', 'string', 'max:100'],
            'content.utilizationTitle' => ['nullable', 'string', 'max:255'],
            'content.overviewTitle' => ['nullable', 'string', 'max:255'],
            'content.timelineTitle' => ['nullable', 'string', 'max:255'],
            'content.timelineSubtitle' => ['nullable', 'string', 'max:255'],
            'content.allocationTitle' => ['nullable', 'string', 'max:255'],
            'content.downloadFilename' => ['nullable', 'string', 'max:255'],
            'content.downloadContents' => ['nullable', 'string'],
            'content.hero' => ['nullable', 'array'],
            'content.hero.eyebrow' => ['nullable', 'string', 'max:255'],
            'content.hero.title' => ['nullable', 'string', 'max:500'],
            'content.hero.description' => ['nullable', 'string'],
            'content.hero.investCta' => ['nullable', 'string', 'max:100'],
            'content.hero.downloadCta' => ['nullable', 'string', 'max:100'],
            'content.hero.meetingCta' => ['nullable', 'string', 'max:100'],
            'content.footerCta' => ['nullable', 'array'],
            'content.footerCta.title' => ['nullable', 'string', 'max:500'],
            'content.footerCta.description' => ['nullable', 'string'],
            'content.footerCta.investLabel' => ['nullable', 'string', 'max:100'],
            'content.footerCta.contactLabel' => ['nullable', 'string', 'max:100'],
            'content.stats' => ['nullable', 'array'],
            'content.utilizationRows' => ['nullable', 'array'],
            'content.overviewDetails' => ['nullable', 'array'],
            'content.processingStages' => ['nullable', 'array'],
            'content.timeline' => ['nullable', 'array'],
            'content.productionData' => ['nullable', 'array'],
            'content.operationalUpdates' => ['nullable', 'array'],
            'content.allocation' => ['nullable', 'array'],
            'content.whyThisProject' => ['nullable', 'array'],
            'content.faqs' => ['nullable', 'array'],
            'content.investorProtections' => ['nullable', 'array'],
        ]);

        $settings = PlatformSetting::query()->firstOrCreate([]);
        $all = $settings->facility_content ?? [];
        $all[$type] = $data['content'];
        $settings->update(['facility_content' => $all]);

        AuditsActions::log('facility_content.updated', 'investments', $request->user(), ['type' => $type]);

        return response()->json([
            'message' => 'Facility content updated.',
            'data' => $all[$type],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function contentFor(string $type): array
    {
        $settings = PlatformSetting::query()->first();
        $all = $settings?->facility_content ?? [];

        return is_array($all[$type] ?? null) ? $all[$type] : [];
    }
}
