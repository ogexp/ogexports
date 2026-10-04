<?php

namespace App\Http\Controllers\Api\Buyer;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Support\BuyerTradeDocumentPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShipmentController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = Shipment::query()
            ->where('buyer_id', $request->user()->id)
            ->with(['milestones', 'order', 'tradeDocuments']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $paginator = $query->latest()->paginate($this->perPage($request));

        $paginator->getCollection()->transform(function (Shipment $shipment) {
            $this->presentTradeDocuments($shipment);

            return $shipment;
        });

        return response()->json($paginator);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $shipment = Shipment::query()
            ->where('buyer_id', $request->user()->id)
            ->with(['milestones', 'order', 'tradeDocuments'])
            ->findOrFail($id);

        $this->presentTradeDocuments($shipment);

        return response()->json(['data' => $shipment]);
    }

    private function presentTradeDocuments(Shipment $shipment): void
    {
        $shipment->setRelation(
            'tradeDocuments',
            $shipment->tradeDocuments->map(fn ($doc) => BuyerTradeDocumentPresenter::present($doc)),
        );
    }
}
