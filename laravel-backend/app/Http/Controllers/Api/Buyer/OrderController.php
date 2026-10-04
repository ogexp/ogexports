<?php

namespace App\Http\Controllers\Api\Buyer;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\Country;
use App\Models\Order;
use App\Models\Port;
use App\Models\Rfq;
use App\Services\OrderPdfGenerator;
use App\Support\BuyerTradeDocumentPresenter;
use App\Support\OrderStatuses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class OrderController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = Order::query()
            ->where('buyer_id', $request->user()->id)
            ->with(['items', 'quotation']);

        if ($request->filled('status')) {
            $request->validate([
                'status' => ['required', 'string', Rule::in(OrderStatuses::all())],
            ]);
            $query->whereIn('status', OrderStatuses::dbVariantsFor($request->input('status')));
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('destination', 'like', "%{$search}%")
                    ->orWhere('destination_port', 'like', "%{$search}%")
                    ->orWhereHas('items', fn ($items) => $items->where('product_name', 'like', "%{$search}%"));
            });
        }

        return response()->json($query->latest()->paginate($this->perPage($request)));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $order = Order::query()
            ->where('buyer_id', $request->user()->id)
            ->with(['items.product', 'shipments', 'quotation', 'tradeDocuments'])
            ->findOrFail($id);

        $order->setRelation(
            'tradeDocuments',
            $order->tradeDocuments->map(fn ($doc) => BuyerTradeDocumentPresenter::present($doc)),
        );

        return response()->json(['data' => $order]);
    }

    public function pdf(Request $request, int $id, OrderPdfGenerator $pdf): Response
    {
        $order = Order::query()
            ->where('buyer_id', $request->user()->id)
            ->findOrFail($id);

        return $pdf->download($order);
    }

    public function repeat(Request $request, int $id): JsonResponse
    {
        $order = Order::query()
            ->where('buyer_id', $request->user()->id)
            ->with(['items', 'quotation', 'country', 'port'])
            ->findOrFail($id);

        if ($order->items->isEmpty()) {
            throw ValidationException::withMessages([
                'order' => ['Order has no line items to repeat.'],
            ]);
        }

        $data = $request->validate([
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer'],
            'items.*.qty' => ['required'],
        ]);

        $lineItems = collect([$order->items->first()]);
        if (! empty($data['items'])) {
            $byId = $order->items->keyBy('id');
            $selected = collect();
            foreach ($data['items'] as $index => $row) {
                $item = $byId->get((int) $row['id']);
                if (! $item) {
                    throw ValidationException::withMessages([
                        "items.{$index}.id" => ['Item does not belong to this order.'],
                    ]);
                }
                $qtyRaw = is_numeric($row['qty'])
                    ? (string) $row['qty']
                    : preg_replace('/\s*MT\s*$/i', '', trim((string) $row['qty']));
                if ($qtyRaw === '' || ! is_numeric($qtyRaw) || (float) $qtyRaw <= 0) {
                    throw ValidationException::withMessages([
                        "items.{$index}.qty" => ['Quantity must be a positive number.'],
                    ]);
                }
                $item->setAttribute('_repeat_qty', $qtyRaw);
                $selected->push($item);
            }
            $lineItems = $selected;
        }

        $user = $request->user()->loadMissing('profile');
        [$country, $port, $destination] = $this->resolveRepeatDestination($order, $user);

        if (! $country || ! $port) {
            throw ValidationException::withMessages([
                'destination' => ['Please set your company country in Company Profile before repeating an order.'],
            ]);
        }

        $prefs = is_array($user->profile?->meta) ? ($user->profile->meta['trade_preferences'] ?? []) : [];
        $incoterm = $order->incoterm
            ?: ($order->quotation?->incoterm ?: ($prefs['incoterm'] ?? 'FOB'));
        $paymentTerms = $order->quotation?->payment_terms
            ?: ($prefs['payment_terms'] ?? 'LC at Sight');
        $notes = 'Repeat of order '.($order->order_number ?: '#'.$order->id);
        $deliveryDate = now()->addDays(30)->toDateString();

        $rfqs = $lineItems->map(function ($item) use ($user, $country, $port, $destination, $incoterm, $paymentTerms, $notes, $deliveryDate) {
            $qtyValue = $item->getAttribute('_repeat_qty');
            if ($qtyValue === null) {
                $qtyValue = $item->qty ? (string) $item->qty : '1';
            }
            $numeric = preg_replace('/\s*MT\s*$/i', '', trim((string) $qtyValue));
            $qty = $numeric.' MT';

            return Rfq::create([
                'buyer_id' => $user->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name ?: 'Product',
                'qty' => $qty,
                'packaging' => null,
                'country_id' => $country->id,
                'port_id' => $port->id,
                'destination' => $destination,
                'incoterm' => $incoterm,
                'payment_terms' => $paymentTerms,
                'required_delivery_date' => $deliveryDate,
                'notes' => $notes,
                'status' => 'pending',
                'submitted_at' => now(),
            ]);
        })->values();

        $payload = $rfqs->count() === 1 ? $rfqs->first() : $rfqs->all();

        return response()->json([
            'message' => $rfqs->count() === 1
                ? 'RFQ created from previous order.'
                : 'RFQs created from previous order.',
            'data' => $payload,
        ], 201);
    }

    /**
     * @return array{0: ?Country, 1: ?Port, 2: string}
     */
    private function resolveRepeatDestination(Order $order, $user): array
    {
        if ($order->country_id && $order->port_id) {
            $country = $order->country ?: Country::query()->find($order->country_id);
            $port = $order->port ?: Port::query()->find($order->port_id);
            if ($country && $port) {
                $destination = $order->destination
                    ?: ($port->name.($country->name ? ', '.$country->name : ''));

                return [$country, $port, $destination];
            }
        }

        $quotation = $order->quotation;
        if ($quotation?->rfq_id) {
            $quotation->loadMissing('rfq.country', 'rfq.port');
            $rfq = $quotation->rfq;
            if ($rfq?->country_id && $rfq?->port_id) {
                $country = $rfq->country ?: Country::query()->find($rfq->country_id);
                $port = $rfq->port ?: Port::query()->find($rfq->port_id);
                if ($country && $port) {
                    $destination = $rfq->destination
                        ?: ($port->name.($country->name ? ', '.$country->name : ''));

                    return [$country, $port, $destination];
                }
            }
        }

        $countryName = $user->profile?->country;
        $country = $countryName
            ? Country::query()->where('name', 'like', '%'.$countryName.'%')->first()
            : null;
        $country = $country ?: Country::query()->orderBy('id')->first();
        $port = $country
            ? Port::query()->where('country_id', $country->id)->orderBy('id')->first()
            : null;
        $destination = $port
            ? ($port->name.($country?->name ? ', '.$country->name : ''))
            : '';

        return [$country, $port, $destination];
    }
}
