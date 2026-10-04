<?php

namespace App\Http\Middleware;

use App\Support\SupplierModule;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSupplierModuleEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! SupplierModule::enabled()) {
            return response()->json([
                'message' => SupplierModule::disabledMessage(),
            ], 403);
        }

        return $next($request);
    }
}
