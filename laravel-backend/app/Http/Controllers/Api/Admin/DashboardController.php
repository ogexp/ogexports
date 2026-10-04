<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Support\ExecutiveDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request, ExecutiveDashboardService $dashboard): JsonResponse
    {
        $period = $request->string('period')->trim()->toString() ?: null;

        return response()->json([
            'data' => $dashboard->build($period),
        ]);
    }
}
