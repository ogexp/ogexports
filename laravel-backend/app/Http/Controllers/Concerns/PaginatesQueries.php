<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait PaginatesQueries
{
    protected function perPage(Request $request, int $default = 15, int $max = 100): int
    {
        return min(max((int) $request->input('per_page', $default), 1), $max);
    }
}
