<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::query()
            ->with(['category', 'specs', 'media'])
            ->where('status', 'approved');

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('short_description', 'like', "%{$search}%");
            });
        }

        if ($category = $request->input('category')) {
            $query->where(function ($q) use ($category) {
                $q->where('category_id', $category)
                    ->orWhereHas('category', fn ($c) => $c
                        ->where('slug', $category)
                        ->orWhere('name', $category));
            });
        }

        if ($request->boolean('featured')) {
            $query->where('featured', true);
        }

        return ProductResource::collection(
            $query->latest()->paginate($this->perPage($request))
        );
    }

    public function show(string $slug): ProductResource
    {
        $product = Product::query()
            ->with(['category', 'specs', 'media'])
            ->where('status', 'approved')
            ->where('slug', $slug)
            ->firstOrFail();

        return new ProductResource($product);
    }

    public function downloadLabReport(string $slug): StreamedResponse|Response
    {
        $product = Product::query()
            ->where('status', 'approved')
            ->where('slug', $slug)
            ->firstOrFail();

        abort_unless(filled($product->lab_report_path), 404, 'Report not available.');

        $extension = pathinfo((string) $product->lab_report_path, PATHINFO_EXTENSION) ?: 'pdf';
        $filename = Str::slug($product->name).'-report.'.$extension;

        return MediaStorage::download($product->lab_report_path, $filename);
    }

    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->with('children')
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $categories]);
    }
}
