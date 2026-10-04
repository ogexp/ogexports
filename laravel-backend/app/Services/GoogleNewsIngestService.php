<?php

namespace App\Services;

use App\Models\NewsArticle;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GoogleNewsIngestService
{
    /**
     * Fetch trade news from Google (Discovery Engine or Gemini) and upsert into news_articles.
     *
     * @return array{imported: int, skipped: int, errors: list<string>, provider: string}
     */
    public function sync(?array $queries = null): array
    {
        $apiKey = (string) config('google.api_key');
        if ($apiKey === '') {
            return [
                'imported' => 0,
                'skipped' => 0,
                'errors' => ['GOOGLE_API_KEY is not configured.'],
                'provider' => 'none',
            ];
        }

        $queries = $queries ?: $this->queries();
        $engineId = (string) config('google.discovery_engine_id');
        $provider = $engineId !== '' ? 'discovery_engine' : 'gemini';

        $imported = 0;
        $skipped = 0;
        $errors = [];
        $autoPublish = (bool) config('google.news_auto_publish');

        foreach ($queries as $query) {
            try {
                $hits = $provider === 'discovery_engine'
                    ? $this->searchDiscoveryEngine($query, $apiKey, $engineId)
                    : $this->searchGemini($query, $apiKey);

                foreach ($hits as $hit) {
                    if ($this->storeHit($hit, $autoPublish)) {
                        $imported++;
                    } else {
                        $skipped++;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Google news ingest failed for query', [
                    'query' => $query,
                    'provider' => $provider,
                    'message' => $e->getMessage(),
                ]);
                $errors[] = "{$query}: ".$e->getMessage();
            }
        }

        return compact('imported', 'skipped', 'errors', 'provider');
    }

    /**
     * @return list<string>
     */
    public function queries(): array
    {
        $custom = config('google.news_queries', []);
        if (is_array($custom) && count($custom) > 0) {
            return $custom;
        }

        return config('google.default_news_queries', []);
    }

    /**
     * @return list<array{title: string, excerpt: string, source: string, source_url: string, published_at: ?string, image_url: ?string}>
     */
    protected function searchDiscoveryEngine(string $query, string $apiKey, string $engineId): array
    {
        $project = (string) config('google.project_number');
        $servingConfig = "projects/{$project}/locations/global/collections/default_collection/engines/{$engineId}/servingConfigs/default_search";
        $url = "https://discoveryengine.googleapis.com/v1/{$servingConfig}:searchLite?key=".urlencode($apiKey);

        $response = Http::timeout(30)
            ->acceptJson()
            ->asJson()
            ->post($url, [
                'servingConfig' => $servingConfig,
                'query' => $query,
                'pageSize' => 10,
                'userPseudoId' => 'og-exports-news-ingest',
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('Discovery Engine HTTP '.$response->status().': '.Str::limit($response->body(), 300));
        }

        $hits = [];
        foreach ($response->json('results') ?? [] as $result) {
            $doc = $result['document']['derivedStructData']
                ?? $result['document']['structData']
                ?? [];
            $title = trim((string) ($doc['title'] ?? $doc['link'] ?? ''));
            $link = trim((string) ($doc['link'] ?? $doc['url'] ?? ''));
            if ($title === '' || $link === '') {
                continue;
            }
            $snippet = '';
            if (! empty($doc['snippets'][0]['snippet'])) {
                $snippet = strip_tags((string) $doc['snippets'][0]['snippet']);
            } elseif (! empty($doc['extractiveAnswers'][0]['content'])) {
                $snippet = (string) $doc['extractiveAnswers'][0]['content'];
            }
            $hits[] = [
                'title' => $title,
                'excerpt' => Str::limit($snippet !== '' ? $snippet : $title, 500),
                'source' => $this->hostAsSource($link),
                'source_url' => $link,
                'published_at' => null,
                'image_url' => $doc['pagemap']['cse_image'][0]['src'] ?? null,
            ];
        }

        return $hits;
    }

    /**
     * Gemini with Google Search grounding — extracts grounding chunks / JSON articles.
     *
     * @return list<array{title: string, excerpt: string, source: string, source_url: string, published_at: ?string, image_url: ?string}>
     */
    protected function searchGemini(string $query, string $apiKey): array
    {
        $preferred = (string) config('google.gemini_model', 'gemini-2.5-flash');
        $models = array_values(array_unique(array_filter([
            $preferred,
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-2.0-flash',
        ])));

        $prompt = <<<PROMPT
You are a trade news research assistant for OG Exports (Pakistan agricultural exports).
Search for recent news matching this topic: {$query}

Return ONLY a JSON array (no markdown) of up to 8 articles. Each object must have:
- title (string)
- url (string, absolute https URL)
- source (publisher name)
- snippet (1-2 sentence summary)
- published_at (ISO 8601 date string if known, else null)

Prefer commodity, shipping, currency, regulation, and Pakistan/Asia trade stories from the last 14 days.
PROMPT;

        $lastError = null;

        foreach ($models as $model) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=".urlencode($apiKey);

            $response = Http::timeout(45)
                ->acceptJson()
                ->asJson()
                ->post($url, [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [['text' => $prompt]],
                        ],
                    ],
                    'tools' => [
                        ['google_search' => (object) []],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.2,
                    ],
                ]);

            if ($response->successful()) {
                $hits = $this->parseGeminiPayload($response->json());
                if (count($hits) === 0) {
                    $hits = $this->hitsFromGrounding($response->json());
                }
                if (count($hits) > 0) {
                    return $hits;
                }
                // Successful but empty — try next model / fallback without tools
            }

            $lastError = 'Gemini HTTP '.$response->status().' ('.$model.'): '.Str::limit($response->body(), 280);

            // On non-404 failures for this model, still try JSON-only fallback once
            if ($response->status() !== 404) {
                $fallback = Http::timeout(45)
                    ->acceptJson()
                    ->asJson()
                    ->post($url, [
                        'contents' => [
                            [
                                'role' => 'user',
                                'parts' => [['text' => $prompt."\nUse your knowledge of recent public news if live search is unavailable."]],
                            ],
                        ],
                        'generationConfig' => [
                            'temperature' => 0.2,
                            'responseMimeType' => 'application/json',
                        ],
                    ]);

                if ($fallback->successful()) {
                    $hits = $this->parseGeminiPayload($fallback->json());
                    if (count($hits) > 0) {
                        return $hits;
                    }
                } else {
                    $lastError = 'Gemini HTTP '.$fallback->status().' ('.$model.' no-tools): '.Str::limit($fallback->body(), 280);
                }
            }
        }

        throw new \RuntimeException($lastError ?: 'Gemini news search failed with no response.');
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<array{title: string, excerpt: string, source: string, source_url: string, published_at: ?string, image_url: ?string}>
     */
    protected function parseGeminiPayload(array $payload): array
    {
        $text = (string) data_get($payload, 'candidates.0.content.parts.0.text', '');
        if ($text === '') {
            return [];
        }

        $text = trim($text);
        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```(?:json)?\s*/i', '', $text) ?? $text;
            $text = preg_replace('/\s*```$/', '', $text) ?? $text;
        }

        $decoded = json_decode($text, true);
        if (! is_array($decoded)) {
            if (preg_match('/\[[\s\S]*\]/', $text, $m)) {
                $decoded = json_decode($m[0], true);
            }
        }
        if (! is_array($decoded)) {
            return [];
        }

        // Unwrap { "articles": [...] }
        if (isset($decoded['articles']) && is_array($decoded['articles'])) {
            $decoded = $decoded['articles'];
        }

        $hits = [];
        foreach ($decoded as $row) {
            if (! is_array($row)) {
                continue;
            }
            $title = trim((string) ($row['title'] ?? ''));
            $link = trim((string) ($row['url'] ?? $row['link'] ?? $row['source_url'] ?? ''));
            if ($title === '' || $link === '' || ! filter_var($link, FILTER_VALIDATE_URL)) {
                continue;
            }
            $hits[] = [
                'title' => $title,
                'excerpt' => Str::limit(trim((string) ($row['snippet'] ?? $row['excerpt'] ?? $title)), 500),
                'source' => trim((string) ($row['source'] ?? $this->hostAsSource($link))),
                'source_url' => $link,
                'published_at' => $this->normalizeDate($row['published_at'] ?? $row['publishedAt'] ?? null),
                'image_url' => isset($row['image_url']) ? (string) $row['image_url'] : null,
            ];
        }

        return $hits;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<array{title: string, excerpt: string, source: string, source_url: string, published_at: ?string, image_url: ?string}>
     */
    protected function hitsFromGrounding(array $payload): array
    {
        $chunks = data_get($payload, 'candidates.0.groundingMetadata.groundingChunks', []);
        if (! is_array($chunks)) {
            return [];
        }

        $hits = [];
        foreach ($chunks as $chunk) {
            $web = $chunk['web'] ?? null;
            if (! is_array($web)) {
                continue;
            }
            $link = trim((string) ($web['uri'] ?? $web['url'] ?? ''));
            $title = trim((string) ($web['title'] ?? ''));
            if ($link === '' || $title === '') {
                continue;
            }
            $hits[] = [
                'title' => $title,
                'excerpt' => Str::limit($title, 500),
                'source' => $this->hostAsSource($link),
                'source_url' => $link,
                'published_at' => null,
                'image_url' => null,
            ];
        }

        return $hits;
    }

    /**
     * @param  array{title: string, excerpt: string, source: string, source_url: string, published_at: ?string, image_url: ?string}  $hit
     */
    protected function storeHit(array $hit, bool $autoPublish): bool
    {
        $url = $hit['source_url'];
        $exists = NewsArticle::query()
            ->where(function ($q) use ($url, $hit) {
                $q->where('source_url', $url)
                    ->orWhere('title', $hit['title']);
            })
            ->exists();

        if ($exists) {
            return false;
        }

        $combined = $hit['title'].' '.$hit['excerpt'];
        $slugBase = Str::slug(Str::limit($hit['title'], 60, ''));
        $slug = $slugBase.'-'.Str::lower(Str::random(4));

        NewsArticle::create([
            'title' => Str::limit($hit['title'], 255, ''),
            'slug' => $slug,
            'category' => $this->detectCategory($combined),
            'content' => $hit['excerpt'],
            'excerpt' => $hit['excerpt'],
            'image_url' => $hit['image_url'],
            'author' => $hit['source'] ?: 'Google News',
            'type' => 'trade',
            'published_at' => $hit['published_at'] ? $hit['published_at'] : now(),
            'published' => $autoPublish,
            'featured' => false,
            'tags' => [],
            'source' => $hit['source'] ?: $this->hostAsSource($url),
            'source_url' => $url,
            'region' => $this->detectRegion($combined),
            'views' => 0,
        ]);

        return true;
    }

    protected function hostAsSource(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);

        return $host ? preg_replace('/^www\./', '', $host) : 'Google';
    }

    protected function normalizeDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        try {
            return \Carbon\Carbon::parse((string) $value)->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }

    public function detectCategory(string $text): string
    {
        $t = Str::lower($text);
        if (preg_match('/ship|port|freight|vessel|cargo|container|maritime|canal|suez|panama/', $t)) {
            return 'shipping';
        }
        if (preg_match('/rice|wheat|maize|commodity|crop|harvest|grain|sesame|salt|cardamom|spice|agri|food price|oilseed|palm|soybean|corn|cotton|oil|crude|brent|opec/', $t)) {
            return 'commodity';
        }
        if (preg_match('/dollar|currency|rupee|exchange rate|forex|usd|eur|pound|pkr|inflation|interest rate/', $t)) {
            return 'currency';
        }
        if (preg_match('/weather|flood|monsoon|drought|hurricane|cyclone|rainfall|climate|storm/', $t)) {
            return 'weather';
        }
        if (preg_match('/regulation|ban|tariff|sanction|compliance|policy|import ban|export ban|duty|wto|customs/', $t)) {
            return 'regulation';
        }
        if (preg_match('/war|conflict|risk|tension|attack|strike|blockade|geopolit|military/', $t)) {
            return 'risk';
        }
        if (preg_match('/ai|artificial intelligence|machine learning|blockchain|automation/', $t)) {
            return 'ai';
        }

        return 'market';
    }

    public function detectRegion(string $text): string
    {
        $t = Str::lower($text);
        if (preg_match('/pakistan|lahore|karachi|islamabad|punjab|sindh|kpk/', $t)) {
            return 'Pakistan';
        }
        if (preg_match('/china|beijing|shanghai|hong kong/', $t)) {
            return 'China';
        }
        if (preg_match('/india|delhi|mumbai|kolkata/', $t)) {
            return 'India';
        }
        if (preg_match('/europe|eu|germany|france|netherlands|rotterdam|uk|britain/', $t)) {
            return 'Europe';
        }
        if (preg_match('/usa|united states|america|washington|new york/', $t)) {
            return 'North America';
        }
        if (preg_match('/middle east|gulf|uae|dubai|saudi|qatar|oman|bahrain/', $t)) {
            return 'Middle East';
        }
        if (preg_match('/southeast asia|vietnam|thailand|indonesia|malaysia|singapore/', $t)) {
            return 'Asia-Pacific';
        }
        if (preg_match('/africa|nigeria|kenya|egypt|ethiopia|ghana/', $t)) {
            return 'Africa';
        }

        return 'Global';
    }
}
