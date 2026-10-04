<?php

namespace App\Http\Controllers\Api\Shared;

use App\Http\Controllers\Controller;
use App\Support\ExchangeRateService;
use Illuminate\Http\JsonResponse;

class ExchangeRateController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $payload = ExchangeRateService::getRates();

        return response()->json([
            'data' => [
                'base' => 'USD',
                'rates' => $payload['rates'],
                'as_of' => $payload['as_of'],
            ],
        ]);
    }
}
