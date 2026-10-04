<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\NewsArticle */
class NewsArticleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'category' => $this->category,
            'content' => $this->content,
            'excerpt' => $this->excerpt,
            'image_url' => $this->image_url,
            'author' => $this->author,
            'type' => $this->type,
            'published_at' => $this->published_at?->toIso8601String(),
            'published' => (bool) $this->published,
            'featured' => (bool) $this->featured,
            'tags' => $this->tags,
            'source' => $this->source,
            'source_url' => $this->source_url,
            'region' => $this->region,
            'views' => $this->views,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
