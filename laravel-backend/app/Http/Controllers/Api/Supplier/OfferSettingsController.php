<?php

namespace App\Http\Controllers\Api\Supplier;

use App\Http\Controllers\Controller;
use App\Models\SupplierCertification;
use App\Models\SupplierPackagingSize;
use App\Models\SupplierPaymentTerm;
use App\Support\SupplierMarket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfferSettingsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $market = SupplierMarket::fromUser($request->user());

        return response()->json([
            'data' => [
                'market' => $market,
                'certifications' => SupplierCertification::query()
                    ->where('market', $market)
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('label')
                    ->get(['id', 'label', 'sort_order']),
                'packaging_sizes' => SupplierPackagingSize::query()
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('label')
                    ->get(['id', 'label', 'sort_order']),
                'payment_terms' => SupplierPaymentTerm::query()
                    ->where('market', $market)
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('label')
                    ->get(['id', 'label', 'sort_order']),
            ],
        ]);
    }
}
