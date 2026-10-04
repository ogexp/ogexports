<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Http\Resources\NewsArticleResource;
use App\Models\Certification;
use App\Models\Faq;
use App\Models\MediaItem;
use App\Models\NewsArticle;
use App\Models\PlatformSetting;
use App\Models\SiteSetting;
use App\Models\Testimonial;
use App\Support\AuditsActions;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class CmsController extends Controller
{
    use PaginatesQueries;

    public function updateSiteSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
        ]);

        foreach ($data['settings'] as $key => $value) {
            SiteSetting::query()->updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        AuditsActions::log('cms.site_settings', 'cms', $request->user());

        return response()->json([
            'message' => 'Site settings updated.',
            'data' => SiteSetting::query()->pluck('value', 'key'),
        ]);
    }

    public function updatePlatformSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'site_name' => ['sometimes', 'string', 'max:255'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'support_email' => ['nullable', 'email'],
            'whatsapp' => ['nullable', 'string', 'max:50'],
            'maintenance_mode' => ['nullable', 'boolean'],
            'registration_open' => ['nullable', 'boolean'],
            'kyc_required' => ['nullable', 'boolean'],
            'investment_open' => ['nullable', 'boolean'],
            'supplier_module_enabled' => ['nullable', 'boolean'],
            'investment_module_enabled' => ['nullable', 'boolean'],
            'admin_otp_enabled' => ['nullable', 'boolean'],
            'invest_produce_visible' => ['nullable', 'boolean'],
            'invest_plant_visible' => ['nullable', 'boolean'],
            'invest_feeds_visible' => ['nullable', 'boolean'],
            'invest_ricemill_visible' => ['nullable', 'boolean'],
            'invest_yellow_maize_visible' => ['nullable', 'boolean'],
            'invest_pkr_display_enabled' => ['nullable', 'boolean'],
            'invest_dual_currency_enabled' => ['nullable', 'boolean'],
            'supplier_pkr_display_enabled' => ['nullable', 'boolean'],
            'buyer_pkr_display_enabled' => ['nullable', 'boolean'],
            'currency' => ['nullable', 'string', 'max:10'],
            'min_investment' => ['nullable', 'numeric'],
            'payment_methods' => ['nullable', 'array'],
            'notification_prefs' => ['nullable', 'array'],
            'seo' => ['nullable', 'array'],
        ]);

        $settings = PlatformSetting::query()->first();
        if (! $settings) {
            $settings = PlatformSetting::create($data);
        } else {
            $settings->update($data);
        }

        AuditsActions::log('cms.platform_settings', 'cms', $request->user());

        return response()->json([
            'message' => 'Platform settings updated.',
            'data' => $settings->fresh(),
        ]);
    }

    public function newsIndex(Request $request): AnonymousResourceCollection
    {
        $query = NewsArticle::query();

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where('title', 'like', "%{$search}%");
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($request->has('published')) {
            $query->where('published', $request->boolean('published'));
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        return NewsArticleResource::collection(
            $query->latest()->paginate($this->perPage($request))
        );
    }

    public function newsStore(Request $request): JsonResponse
    {
        $data = $this->validatedNews($request);
        $article = NewsArticle::create([
            ...$data,
            'slug' => $data['slug'] ?? Str::slug($data['title']).'-'.Str::random(4),
        ]);

        return response()->json([
            'message' => 'Article created.',
            'data' => new NewsArticleResource($article),
        ], 201);
    }

    public function newsUpdate(Request $request, int $id): JsonResponse
    {
        $article = NewsArticle::query()->findOrFail($id);
        $article->update($this->validatedNews($request, $id));

        return response()->json([
            'message' => 'Article updated.',
            'data' => new NewsArticleResource($article->fresh()),
        ]);
    }

    public function newsDestroy(int $id): JsonResponse
    {
        NewsArticle::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Article deleted.']);
    }

    public function mediaIndex(Request $request): JsonResponse
    {
        $items = MediaItem::query()->latest()->paginate($this->perPage($request));

        return response()->json($items);
    }

    public function mediaStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required_without:url', 'file', 'max:20480'],
            'url' => ['required_without:file', 'string', 'max:1000'],
            'type' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
        ]);

        if ($request->hasFile('file')) {
            $stored = MediaStorage::store($request->file('file'), 'cms', null, $request->user());
            $url = $stored['url'];
            $type = $data['type'] ?? $request->file('file')->getClientMimeType();
        } else {
            $url = $data['url'];
            $type = $data['type'] ?? 'image';
        }

        $item = MediaItem::create([
            'url' => $url,
            'type' => $type,
            'title' => $data['title'] ?? null,
            'tags' => $data['tags'] ?? null,
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $item], 201);
    }

    public function faqsIndex(): JsonResponse
    {
        return response()->json(['data' => Faq::query()->orderBy('sort_order')->get()]);
    }

    public function faqsStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question' => ['required', 'string'],
            'answer' => ['required', 'string'],
            'sort_order' => ['nullable', 'integer'],
            'published' => ['nullable', 'boolean'],
        ]);

        return response()->json(['data' => Faq::create($data)], 201);
    }

    public function faqsUpdate(Request $request, int $id): JsonResponse
    {
        $faq = Faq::query()->findOrFail($id);
        $faq->update($request->validate([
            'question' => ['sometimes', 'string'],
            'answer' => ['sometimes', 'string'],
            'sort_order' => ['nullable', 'integer'],
            'published' => ['nullable', 'boolean'],
        ]));

        return response()->json(['data' => $faq->fresh()]);
    }

    public function faqsDestroy(int $id): JsonResponse
    {
        Faq::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'FAQ deleted.']);
    }

    public function certificationsIndex(): JsonResponse
    {
        return response()->json(['data' => Certification::query()->orderBy('sort_order')->get()]);
    }

    public function certificationsStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'issuer' => ['nullable', 'string', 'max:255'],
            'image_url' => ['nullable', 'string', 'max:1000'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
            'published' => ['nullable', 'boolean'],
        ]);

        return response()->json(['data' => Certification::create($data)], 201);
    }

    public function certificationsUpdate(Request $request, int $id): JsonResponse
    {
        $item = Certification::query()->findOrFail($id);
        $item->update($request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'issuer' => ['nullable', 'string', 'max:255'],
            'image_url' => ['nullable', 'string', 'max:1000'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
            'published' => ['nullable', 'boolean'],
        ]));

        return response()->json(['data' => $item->fresh()]);
    }

    public function certificationsDestroy(int $id): JsonResponse
    {
        Certification::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Certification deleted.']);
    }

    public function testimonialsIndex(): JsonResponse
    {
        return response()->json(['data' => Testimonial::query()->orderBy('sort_order')->get()]);
    }

    public function testimonialsStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'avatar_url' => ['nullable', 'string', 'max:1000'],
            'sort_order' => ['nullable', 'integer'],
            'published' => ['nullable', 'boolean'],
        ]);

        return response()->json(['data' => Testimonial::create($data)], 201);
    }

    public function testimonialsUpdate(Request $request, int $id): JsonResponse
    {
        $item = Testimonial::query()->findOrFail($id);
        $item->update($request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:255'],
            'content' => ['sometimes', 'string'],
            'avatar_url' => ['nullable', 'string', 'max:1000'],
            'sort_order' => ['nullable', 'integer'],
            'published' => ['nullable', 'boolean'],
        ]));

        return response()->json(['data' => $item->fresh()]);
    }

    public function testimonialsDestroy(int $id): JsonResponse
    {
        Testimonial::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Testimonial deleted.']);
    }

    private function validatedNews(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'title' => [$id ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'content' => ['nullable', 'string'],
            'excerpt' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string', 'max:1000'],
            'author' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:50'],
            'published_at' => ['nullable', 'date'],
            'published' => ['nullable', 'boolean'],
            'featured' => ['nullable', 'boolean'],
            'tags' => ['nullable', 'array'],
            'source' => ['nullable', 'string', 'max:255'],
            'source_url' => ['nullable', 'string', 'max:1000'],
            'region' => ['nullable', 'string', 'max:100'],
        ]);
    }
}
