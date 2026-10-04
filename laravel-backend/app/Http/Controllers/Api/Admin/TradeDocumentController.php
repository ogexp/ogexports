<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\TradeDocument;
use App\Support\AuditsActions;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TradeDocumentController extends Controller
{
    public const DOCUMENT_TYPES = [
        'Bill of Lading',
        'Commercial Invoice',
        'Packing List',
        'Certificate of Origin',
        'Phytosanitary Certificate',
        'Insurance Certificate',
        'Other',
    ];

    public function index(int $id): JsonResponse
    {
        $shipment = Shipment::query()->findOrFail($id);

        $docs = TradeDocument::query()
            ->where(function ($q) use ($shipment) {
                $q->where('shipment_id', $shipment->id);
                if ($shipment->order_id) {
                    $q->orWhere('order_id', $shipment->order_id);
                }
            })
            ->latest()
            ->get();

        return response()->json(['data' => $this->uniqueByType($docs)->values()->all()]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $shipment = Shipment::query()->with('order:id,buyer_id')->findOrFail($id);

        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(self::DOCUMENT_TYPES)],
            'title' => ['nullable', 'string', 'max:255'],
            'path' => ['required', 'string', 'max:500'],
        ]);

        $path = ltrim($data['path'], '/');
        abort_unless(MediaStorage::exists($path), 422, 'Uploaded file path not found.');

        $buyerId = $shipment->buyer_id ?: $shipment->order?->buyer_id;
        abort_unless($buyerId, 422, 'Shipment has no buyer linked.');

        $title = ($data['title'] ?? null) ?: $data['type'];

        $existing = TradeDocument::query()
            ->where('type', $data['type'])
            ->where(function ($q) use ($shipment) {
                $q->where('shipment_id', $shipment->id);
                if ($shipment->order_id) {
                    $q->orWhere('order_id', $shipment->order_id);
                }
            })
            ->first();

        if ($existing) {
            $oldPath = $existing->path;
            $existing->update([
                'title' => $title,
                'path' => $path,
                'shipment_id' => $shipment->id,
                'order_id' => $shipment->order_id ?: $existing->order_id,
                'buyer_id' => $buyerId,
            ]);

            if ($oldPath && $oldPath !== $path && MediaStorage::exists($oldPath)) {
                MediaStorage::delete($oldPath);
            }

            AuditsActions::log('trade_document.updated', 'shipments', $request->user(), [
                'shipment_id' => $shipment->id,
                'document_id' => $existing->id,
                'type' => $existing->type,
            ]);

            return response()->json(['data' => $this->transform($existing->fresh())], 200);
        }

        $doc = TradeDocument::create([
            'shipment_id' => $shipment->id,
            'order_id' => $shipment->order_id,
            'buyer_id' => $buyerId,
            'type' => $data['type'],
            'title' => $title,
            'path' => $path,
        ]);

        AuditsActions::log('trade_document.created', 'shipments', $request->user(), [
            'shipment_id' => $shipment->id,
            'document_id' => $doc->id,
            'type' => $doc->type,
        ]);

        return response()->json(['data' => $this->transform($doc)], 201);
    }

    public function destroy(Request $request, int $id, int $documentId): JsonResponse
    {
        $shipment = Shipment::query()->findOrFail($id);

        $doc = TradeDocument::query()
            ->where('id', $documentId)
            ->where(function ($q) use ($shipment) {
                $q->where('shipment_id', $shipment->id);
                if ($shipment->order_id) {
                    $q->orWhere('order_id', $shipment->order_id);
                }
            })
            ->firstOrFail();

        $path = $doc->path;
        $doc->delete();

        if ($path && MediaStorage::exists($path)) {
            MediaStorage::delete($path);
        }

        AuditsActions::log('trade_document.deleted', 'shipments', $request->user(), [
            'shipment_id' => $id,
            'document_id' => $documentId,
        ]);

        return response()->json(['message' => 'Document deleted.']);
    }

    public function download(int $id, int $documentId): StreamedResponse
    {
        $doc = TradeDocument::query()
            ->where('shipment_id', $id)
            ->findOrFail($documentId);

        abort_unless(MediaStorage::exists($doc->path), 404, 'File not found.');

        $filename = ($doc->title ?: $doc->type).'.'.pathinfo($doc->path, PATHINFO_EXTENSION);

        return MediaStorage::download($doc->path, $filename);
    }

    public function view(int $id, int $documentId): \Symfony\Component\HttpFoundation\Response
    {
        $doc = TradeDocument::query()
            ->where('shipment_id', $id)
            ->findOrFail($documentId);

        abort_unless(MediaStorage::exists($doc->path), 404, 'File not found.');

        $filename = ($doc->title ?: $doc->type).'.'.pathinfo($doc->path, PATHINFO_EXTENSION);

        return MediaStorage::response($doc->path, $filename);
    }

    /**
     * @param  Collection<int, TradeDocument>  $docs
     * @return Collection<int, array<string, mixed>>
     */
    private function uniqueByType(Collection $docs): Collection
    {
        return $docs
            ->sortByDesc('id')
            ->unique('type')
            ->values()
            ->map(fn (TradeDocument $doc) => $this->transform($doc));
    }

    private function transform(TradeDocument $doc): array
    {
        return [
            'id' => $doc->id,
            'shipment_id' => $doc->shipment_id,
            'order_id' => $doc->order_id,
            'buyer_id' => $doc->buyer_id,
            'type' => $doc->type,
            'title' => $doc->title,
            'path' => $doc->path,
            'url' => MediaStorage::url($doc->path),
            'created_at' => $doc->created_at,
        ];
    }
}
