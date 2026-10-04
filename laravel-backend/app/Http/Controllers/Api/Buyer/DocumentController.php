<?php

namespace App\Http\Controllers\Api\Buyer;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\TradeDocument;
use App\Support\BuyerTradeDocumentPresenter;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = TradeDocument::query()->where(function ($q) use ($request) {
            $userId = $request->user()->id;
            $q->where('buyer_id', $userId)
                ->orWhereHas('order', fn ($o) => $o->where('buyer_id', $userId))
                ->orWhereHas('shipment', fn ($s) => $s->where('buyer_id', $userId));
        });

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($shipmentId = $request->input('shipment_id')) {
            $query->where('shipment_id', $shipmentId);
        }

        if ($orderId = $request->input('order_id')) {
            $query->where('order_id', $orderId);
        }

        $paginator = $query->with('order:id,order_number')->latest()->paginate($this->perPage($request));

        $paginator->getCollection()->transform(fn (TradeDocument $doc) => BuyerTradeDocumentPresenter::present($doc));

        return response()->json($paginator);
    }

    public function store(Request $request): JsonResponse
    {
        abort(403, 'Buyer document uploads are disabled. Trade documents are issued by OG Exports.');
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $doc = $this->findOwnedDocument($request, $id);

        return response()->json(['data' => BuyerTradeDocumentPresenter::present($doc)]);
    }

    public function download(Request $request, int $id): StreamedResponse|BinaryFileResponse
    {
        $doc = $this->findOwnedDocument($request, $id);

        abort_unless(MediaStorage::exists($doc->path), 404, 'File not found.');

        $filename = ($doc->title ?: $doc->type).'.'.pathinfo($doc->path, PATHINFO_EXTENSION);

        return MediaStorage::download($doc->path, $filename);
    }

    public function view(Request $request, int $id): \Symfony\Component\HttpFoundation\Response
    {
        $doc = $this->findOwnedDocument($request, $id);

        abort_unless(MediaStorage::exists($doc->path), 404, 'File not found.');

        $filename = ($doc->title ?: $doc->type).'.'.pathinfo($doc->path, PATHINFO_EXTENSION);

        return MediaStorage::response($doc->path, $filename);
    }

    private function findOwnedDocument(Request $request, int $id): TradeDocument
    {
        $userId = $request->user()->id;

        return TradeDocument::query()
            ->where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->where('buyer_id', $userId)
                    ->orWhereHas('order', fn ($o) => $o->where('buyer_id', $userId))
                    ->orWhereHas('shipment', fn ($s) => $s->where('buyer_id', $userId));
            })
            ->firstOrFail();
    }
}
