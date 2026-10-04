<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Certification;
use App\Models\DocumentType;
use App\Models\Faq;
use App\Models\PlatformSetting;
use App\Models\SiteSetting;
use App\Models\Testimonial;
use Illuminate\Http\JsonResponse;

class CmsController extends Controller
{
    public function settings(): JsonResponse
    {
        $site = SiteSetting::query()->pluck('value', 'key')->all();
        $platform = PlatformSetting::query()->first();

        return response()->json([
            'data' => array_merge(
                $platform ? $platform->toArray() : [],
                ['site' => $site],
            ),
        ]);
    }

    public function faqs(): JsonResponse
    {
        $items = Faq::query()
            ->where('published', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function certifications(): JsonResponse
    {
        $items = Certification::query()
            ->where('published', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function documentTypes(): JsonResponse
    {
        $items = DocumentType::query()
            ->where('published', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function testimonials(): JsonResponse
    {
        $items = Testimonial::query()
            ->where('published', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $items]);
    }
}
