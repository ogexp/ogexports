<?php

/**
 * Google Cloud / Gemini configuration for trade news ingest.
 *
 * One-time GCP setup (project 804712033911 or your own):
 * 1. Enable Discovery Engine API (discoveryengine.googleapis.com) and/or Generative Language API.
 * 2. Optional: create an Agent Builder website-search app and set GOOGLE_DISCOVERY_ENGINE_ID.
 * 3. Restrict the API key to those APIs; rotate any key that was shared in chat.
 * 4. Store the real key only in .env — never commit it.
 *
 * When GOOGLE_DISCOVERY_ENGINE_ID is set, ingest uses Discovery Engine searchLite.
 * Otherwise it falls back to Gemini with Google Search grounding.
 */

return [

    'project_number' => env('GOOGLE_CLOUD_PROJECT_NUMBER', '804712033911'),

    'api_key' => env('GOOGLE_API_KEY'),

    'discovery_engine_id' => env('GOOGLE_DISCOVERY_ENGINE_ID'),

    'gemini_model' => env('GOOGLE_GEMINI_MODEL', 'gemini-2.5-flash'),

    /*
    |--------------------------------------------------------------------------
    | News ingest behaviour
    |--------------------------------------------------------------------------
    | Auto-publish imports as published=true. Default false = pending review.
    */
    'news_auto_publish' => filter_var(env('GOOGLE_NEWS_AUTO_PUBLISH', false), FILTER_VALIDATE_BOOLEAN),

    /*
    | Comma-separated search queries. Empty = built-in trade/agriculture defaults.
    */
    'news_queries' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('GOOGLE_NEWS_QUERIES', ''))
    ))),

    'default_news_queries' => [
        'Pakistan basmati rice export news',
        'Pakistan agricultural commodities trade',
        'sesame seeds commodity prices Pakistan',
        'global shipping freight rates Asia Middle East',
        'Pakistan rupee USD exchange rate trade',
        'EU agricultural import regulations rice',
        'commodity markets wheat maize oilseeds Asia',
    ],

];
