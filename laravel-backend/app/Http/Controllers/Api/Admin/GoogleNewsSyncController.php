<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\GoogleNewsIngestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoogleNewsSyncController extends Controller
{
    public function __invoke(Request $request, GoogleNewsIngestService $ingest): JsonResponse
    {
        $validated = $request->validate([
            'queries' => ['sometimes', 'array'],
            'queries.*' => ['string', 'max:200'],
        ]);

        $result = $ingest->sync($validated['queries'] ?? null);

        $status = count($result['errors']) > 0 && $result['imported'] === 0 ? 502 : 200;

        return response()->json([
            'message' => $result['imported'] > 0
                ? "Imported {$result['imported']} article(s) via {$result['provider']}."
                : ($result['errors'][0] ?? 'No new articles imported.'),
            'data' => $result,
        ], $status);
    }
}
