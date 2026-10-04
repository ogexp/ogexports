<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductSpec;
use App\Support\AuditsActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    use PaginatesQueries;

    private const IMAGE_DIR = 'product_images';

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::query()->with(['category', 'specs', 'media']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($category = $request->input('category')) {
            $query->where('category_id', $category);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        return ProductResource::collection(
            $query->latest()->paginate($this->perPage($request))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = collect($this->validatedProduct($request))->except(['specs', 'media'])->all();
        $specs = $request->input('specs', []);
        $media = $request->input('media', []);

        $product = DB::transaction(function () use ($data, $specs, $media, $request) {
            $product = Product::create([
                ...$data,
                'slug' => $data['slug'] ?? Str::slug($data['name']).'-'.Str::random(5),
                'created_by' => $request->user()->id,
            ]);

            $this->syncSpecs($product, $specs);
            $this->syncMedia($product, $media);

            return $product;
        });

        AuditsActions::log('product.created', 'products', $request->user(), ['product_id' => $product->id]);

        return response()->json([
            'message' => 'Product created.',
            'data' => new ProductResource($product->load(['category', 'specs', 'media'])),
        ], 201);
    }

    public function show(int $id): ProductResource
    {
        return new ProductResource(
            Product::query()->with(['category', 'specs', 'media'])->findOrFail($id)
        );
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $product = Product::query()->with('media')->findOrFail($id);
        $data = collect($this->validatedProduct($request, $product->id))->except(['specs', 'media'])->all();
        $specs = $request->has('specs') ? $request->input('specs', []) : null;
        $media = $request->has('media') ? $request->input('media', []) : null;

        $oldImage = $product->image_url;
        $oldMediaPaths = $product->media->pluck('url')->filter()->values()->all();

        DB::transaction(function () use ($product, $data, $specs, $media) {
            $product->update($data);

            if ($specs !== null) {
                $this->syncSpecs($product, $specs);
            }

            if ($media !== null) {
                $this->syncMedia($product, $media);
            }
        });

        $fresh = $product->fresh()->load(['category', 'specs', 'media']);

        if (array_key_exists('image_url', $data)) {
            $this->deleteRemovedLocalImages([$oldImage], [$fresh->image_url]);
        }

        if ($media !== null) {
            $newMediaPaths = $fresh->media->pluck('url')->filter()->values()->all();
            $this->deleteRemovedLocalImages($oldMediaPaths, $newMediaPaths);
        }

        AuditsActions::log('product.updated', 'products', $request->user(), ['product_id' => $product->id]);

        return response()->json([
            'message' => 'Product updated.',
            'data' => new ProductResource($fresh),
        ]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['draft', 'pending', 'approved', 'rejected', 'archived'])],
        ]);

        $product = Product::query()->findOrFail($id);
        $product->update(['status' => $data['status']]);

        AuditsActions::log('product.status', 'products', $request->user(), [
            'product_id' => $product->id,
            'status' => $data['status'],
        ]);

        return response()->json([
            'message' => 'Status updated.',
            'data' => new ProductResource($product->fresh()->load(['category', 'specs', 'media'])),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $product = Product::query()->findOrFail($id);
        $product->delete();

        AuditsActions::log('product.deleted', 'products', $request->user(), ['product_id' => $id]);

        return response()->json(['message' => 'Product deleted.']);
    }

    public function uploadImages(Request $request): JsonResponse
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'images' => ['required', 'array', 'min:1', 'max:12'],
            'images.*' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
        ]);

        $directory = public_path(self::IMAGE_DIR);
        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        $slug = Str::slug($request->string('title')->toString()) ?: 'product';
        $timestamp = time();
        $paths = [];

        /** @var array<int, UploadedFile> $files */
        $files = $request->file('images', []);

        foreach (array_values($files) as $index => $file) {
            $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
            $filename = sprintf(
                '%s-%s-%d-%s.%s',
                $slug,
                $timestamp,
                $index,
                Str::lower(Str::random(6)),
                $extension
            );

            $file->move($directory, $filename);
            $paths[] = self::IMAGE_DIR.'/'.$filename;
        }

        AuditsActions::log('product.images_uploaded', 'products', $request->user(), [
            'count' => count($paths),
            'title' => $request->string('title')->toString(),
        ]);

        return response()->json([
            'message' => 'Images uploaded.',
            'data' => [
                'paths' => $paths,
            ],
        ], 201);
    }

    private function validatedProduct(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'category_id' => ['nullable', 'exists:categories,id'],
            'name' => [$id ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('products', 'slug')->ignore($id)],
            'sku' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['draft', 'pending', 'approved', 'rejected', 'archived'])],
            'short_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'origin' => ['nullable', 'string', 'max:255'],
            'fob' => ['nullable', 'numeric'],
            'price' => ['nullable', 'numeric'],
            'currency' => ['nullable', 'string', 'max:10'],
            'min_order' => ['nullable', 'string', 'max:100'],
            'moq' => ['nullable', 'string', 'max:100'],
            'lead_time' => ['nullable', 'string', 'max:100'],
            'hs_code' => ['nullable', 'string', 'max:50'],
            'shelf_life' => ['nullable', 'string', 'max:100'],
            'storage_instructions' => ['nullable', 'string'],
            'incoterms' => ['nullable', 'string', 'max:50'],
            'video_url' => ['nullable', 'string', 'max:1000'],
            'image_url' => ['nullable', 'string', 'max:1000'],
            'lab_report_path' => ['nullable', 'string', 'max:1000'],
            'featured' => ['nullable', 'boolean'],
            'stock' => ['nullable', 'integer'],
            'certifications' => ['nullable', 'array'],
            'payment_terms' => ['nullable', 'array'],
            'delivery_terms' => ['nullable', 'array'],
            'packaging_options' => ['nullable', 'array'],
            'export_markets' => ['nullable', 'array'],
            'specs' => ['nullable', 'array'],
            'specs.*.label' => ['required_with:specs', 'string', 'max:255'],
            'specs.*.value' => ['required_with:specs', 'string', 'max:1000'],
            'media' => ['nullable', 'array'],
            'media.*.url' => ['required_with:media', 'string', 'max:1000'],
            'media.*.type' => ['nullable', 'string', 'max:50'],
            'media.*.sort_order' => ['nullable', 'integer'],
        ]);
    }

    private function syncSpecs(Product $product, array $specs): void
    {
        $product->specs()->delete();

        foreach (array_values($specs) as $i => $spec) {
            ProductSpec::create([
                'product_id' => $product->id,
                'label' => $spec['label'],
                'value' => $spec['value'],
                'sort_order' => $spec['sort_order'] ?? $i,
            ]);
        }
    }

    private function syncMedia(Product $product, array $media): void
    {
        $product->media()->delete();

        foreach (array_values($media) as $i => $item) {
            ProductMedia::create([
                'product_id' => $product->id,
                'url' => $item['url'],
                'type' => $item['type'] ?? 'image',
                'sort_order' => $item['sort_order'] ?? $i,
            ]);
        }
    }

    /**
     * Delete local product-image files that were removed/replaced.
     * Never deletes external URLs or non-upload storage paths.
     *
     * @param  array<int, string|null>  $oldPaths
     * @param  array<int, string|null>  $newPaths
     */
    private function deleteRemovedLocalImages(array $oldPaths, array $newPaths): void
    {
        $kept = collect($newPaths)
            ->filter()
            ->map(fn ($path) => ltrim((string) $path, '/'))
            ->all();

        foreach ($oldPaths as $path) {
            if (! is_string($path) || $path === '') {
                continue;
            }

            $relative = ltrim($path, '/');
            if (in_array($relative, $kept, true)) {
                continue;
            }

            if (! str_starts_with($relative, self::IMAGE_DIR.'/')) {
                continue;
            }

            // Prevent path traversal
            if (str_contains($relative, '..')) {
                continue;
            }

            $absolute = public_path($relative);
            if (File::isFile($absolute)) {
                File::delete($absolute);
            }
        }
    }
}
