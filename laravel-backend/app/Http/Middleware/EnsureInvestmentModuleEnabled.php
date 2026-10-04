<?php

namespace App\Http\Middleware;

use App\Support\InvestmentModule;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureInvestmentModuleEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! InvestmentModule::enabled()) {
            return response()->json([
                'message' => InvestmentModule::disabledMessage(),
            ], 403);
        }

        return $next($request);
    }
}
