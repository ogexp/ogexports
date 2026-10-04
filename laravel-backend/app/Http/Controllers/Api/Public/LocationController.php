<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Country;
use App\Models\Incoterm;
use App\Models\PaymentMethod;
use Illuminate\Http\JsonResponse;

class LocationController extends Controller
{
    public function countries(): JsonResponse
    {
        $countries = Country::query()
            ->select(['id', 'code', 'name'])
            ->withCount('ports')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $countries]);
    }

    public function ports(Country $country): JsonResponse
    {
        $ports = $country->ports()
            ->select(['id', 'country_id', 'unlocode', 'name', 'subdivision'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $ports]);
    }

    public function incoterms(): JsonResponse
    {
        $incoterms = Incoterm::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get(['code', 'label', 'sort_order']);

        return response()->json(['data' => $incoterms]);
    }

    public function paymentMethods(): JsonResponse
    {
        $methods = PaymentMethod::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get(['id', 'code', 'label', 'description', 'badge', 'fields', 'sort_order']);

        return response()->json(['data' => $methods]);
    }
}
