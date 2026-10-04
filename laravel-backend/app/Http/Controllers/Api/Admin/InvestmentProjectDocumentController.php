<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\InvestmentProject;
use App\Models\InvestmentProjectDocument;
use App\Support\AuditsActions;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvestmentProjectDocumentController extends Controller
{
    public const DOCUMENT_TITLES = [
        'Proforma Invoice',
        'Bill of Lading Draft',
        'Investment Agreement',
        'Other',
    ];

    public function index(int $id): JsonResponse
    {
        $project = InvestmentProject::query()->findOrFail($id);

        $docs = InvestmentProjectDocument::query()
            ->where('investment_project_id', $project->id)
            ->latest()
            ->get()
            ->map(fn (InvestmentProjectDocument $doc) => $this->transform($doc));

        return response()->json(['data' => $docs]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $project = InvestmentProject::query()->findOrFail($id);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'path' => ['required', 'string', 'max:500'],
            'original_name' => ['nullable', 'string', 'max:255'],
        ]);

        $path = ltrim($data['path'], '/');
        abort_unless(MediaStorage::exists($path), 422, 'Uploaded file path not found.');

        $size = MediaStorage::size($path);
        $mime = MediaStorage::mimeType($path) ?: null;

        $doc = InvestmentProjectDocument::create([
            'investment_project_id' => $project->id,
            'title' => $data['title'],
            'path' => $path,
            'original_name' => $data['original_name'] ?? basename($path),
            'size_bytes' => $size ?: null,
            'mime' => $mime,
        ]);

        AuditsActions::log('investment_document.created', 'investments', $request->user(), [
            'project_id' => $project->id,
            'document_id' => $doc->id,
            'title' => $doc->title,
        ]);

        return response()->json(['data' => $this->transform($doc)], 201);
    }

    public function destroy(Request $request, int $id, int $documentId): JsonResponse
    {
        $doc = InvestmentProjectDocument::query()
            ->where('investment_project_id', $id)
            ->findOrFail($documentId);

        $path = $doc->path;
        $doc->delete();

        if ($path && MediaStorage::exists($path)) {
            MediaStorage::delete($path);
        }

        AuditsActions::log('investment_document.deleted', 'investments', $request->user(), [
            'project_id' => $id,
            'document_id' => $documentId,
        ]);

        return response()->json(['message' => 'Document deleted.']);
    }

    public function download(int $id, int $documentId): StreamedResponse
    {
        $doc = InvestmentProjectDocument::query()
            ->where('investment_project_id', $id)
            ->findOrFail($documentId);

        abort_unless(MediaStorage::exists($doc->path), 404, 'File not found.');

        $ext = pathinfo($doc->path, PATHINFO_EXTENSION);
        $filename = $doc->original_name ?: ($doc->title.($ext ? '.'.$ext : ''));

        return MediaStorage::download($doc->path, $filename);
    }

    private function transform(InvestmentProjectDocument $doc): array
    {
        return [
            'id' => $doc->id,
            'investment_project_id' => $doc->investment_project_id,
            'title' => $doc->title,
            'path' => $doc->path,
            'original_name' => $doc->original_name,
            'size_bytes' => $doc->size_bytes,
            'size' => self::formatBytes($doc->size_bytes),
            'mime' => $doc->mime,
            'url' => MediaStorage::url($doc->path),
            'download_url' => MediaStorage::url($doc->path),
            'created_at' => $doc->created_at?->toIso8601String(),
        ];
    }

    public static function formatBytes(?int $bytes): string
    {
        if ($bytes === null || $bytes <= 0) {
            return '—';
        }

        $units = ['B', 'KB', 'MB', 'GB'];
        $i = (int) floor(log($bytes, 1024));
        $i = min($i, count($units) - 1);

        return round($bytes / (1024 ** $i), $i === 0 ? 0 : 1).' '.$units[$i];
    }
}
