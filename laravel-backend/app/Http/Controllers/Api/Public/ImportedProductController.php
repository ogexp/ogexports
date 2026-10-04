<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\ImportedProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportedProductController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = ImportedProduct::query();

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        $items = $query->latest()->paginate($this->perPage($request));

        return response()->json($items);
    }
}
