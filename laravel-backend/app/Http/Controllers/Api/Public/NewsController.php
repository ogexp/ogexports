<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Http\Resources\NewsArticleResource;
use App\Models\NewsArticle;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NewsController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = NewsArticle::query()->where('published', true);

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%");
            });
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($request->boolean('featured')) {
            $query->where('featured', true);
        }

        return NewsArticleResource::collection(
            $query->latest('published_at')->paginate($this->perPage($request))
        );
    }

    public function show(string $slug): NewsArticleResource
    {
        $article = NewsArticle::query()
            ->where('published', true)
            ->where('slug', $slug)
            ->firstOrFail();

        $article->increment('views');

        return new NewsArticleResource($article->fresh());
    }
}
