<?php

namespace App\Http\Controllers\Api\Buyer;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Country;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentMethod;
use App\Models\Port;
use App\Models\Product;
use App\Models\Rfq;
use App\Support\OrderStatuses;
use App\Support\TradeAmountSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $cart = $this->cartFor($request)->load(['items.product']);

        return response()->json(['data' => $cart]);
    }

    public function add(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'qty' => ['required', 'integer', 'min:1'],
            'replace' => ['sometimes', 'boolean'],
        ]);

        $product = Product::query()->where('status', 'approved')->findOrFail($data['product_id']);
        $cart = $this->cartFor($request);

        $item = CartItem::query()->firstOrNew([
            'cart_id' => $cart->id,
            'product_id' => $product->id,
        ]);

        if (! empty($data['replace'])) {
            $item->qty = $data['qty'];
        } else {
            $item->qty = ($item->exists ? $item->qty : 0) + $data['qty'];
        }
        $item->unit_price = $product->price ?? $product->fob ?? 0;
        $item->save();

        return response()->json([
            'message' => 'Item added to cart.',
            'data' => $cart->fresh()->load(['items.product']),
        ]);
    }

    public function update(Request $request, int $itemId): JsonResponse
    {
        $data = $request->validate([
            'qty' => ['required', 'integer', 'min:1'],
        ]);

        $cart = $this->cartFor($request);
        $item = CartItem::query()->where('cart_id', $cart->id)->findOrFail($itemId);
        $item->update(['qty' => $data['qty']]);

        return response()->json([
            'message' => 'Cart updated.',
            'data' => $cart->fresh()->load(['items.product']),
        ]);
    }

    public function remove(Request $request, int $itemId): JsonResponse
    {
        $cart = $this->cartFor($request);
        CartItem::query()->where('cart_id', $cart->id)->whereKey($itemId)->delete();

        return response()->json([
            'message' => 'Item removed.',
            'data' => $cart->fresh()->load(['items.product']),
        ]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'payment_method' => [
                'nullable',
                'string',
                'max:100',
                Rule::exists('payment_methods', 'code')->where(fn ($q) => $q->where('is_active', true)),
            ],
            'notes' => ['nullable', 'string'],
            'destination_country_id' => ['required', 'integer', 'exists:countries,id'],
            'destination_port_id' => [
                'required',
                'integer',
                Rule::exists('ports', 'id')->where(fn ($q) => $q->where('country_id', $request->input('destination_country_id'))),
            ],
            'incoterm' => ['required', 'string', 'max:100'],
            'required_delivery_date' => ['required', 'date', 'after:today'],
        ]);

        if (strtoupper(trim((string) $data['incoterm'])) !== 'FOB') {
            throw ValidationException::withMessages([
                'incoterm' => ['Only FOB checkout places an order. Use request-quotation for other Incoterms.'],
            ]);
        }

        $this->cartFor($request);

        $country = Country::query()->findOrFail($data['destination_country_id']);
        $port = Port::query()->findOrFail($data['destination_port_id']);

        $paymentMethodLabel = null;
        if (! empty($data['payment_method'])) {
            $paymentMethodLabel = PaymentMethod::query()
                ->where('code', $data['payment_method'])
                ->where('is_active', true)
                ->value('label');
        }

        $userNotes = trim((string) ($data['notes'] ?? ''));
        $summaryLines = [
            "Destination: {$country->name} / {$port->name}",
            "Incoterm: {$data['incoterm']}",
            "Required delivery: {$data['required_delivery_date']}",
        ];
        $notes = implode("\n", $summaryLines).($userNotes !== '' ? "\n---\n".$userNotes : '');

        $order = DB::transaction(function () use ($request, $data, $country, $port, $notes, $paymentMethodLabel) {
            $cart = Cart::query()
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->firstOrFail();

            $cart->load(['items.product']);

            if ($cart->items->isEmpty()) {
                throw ValidationException::withMessages(['cart' => ['Cart is empty.']]);
            }

            $total = $cart->items->sum(fn (CartItem $item) => (float) $item->unit_price * (int) $item->qty);
            $currency = 'USD';
            $snap = TradeAmountSnapshot::fromNative((float) $total, $currency);

            $order = Order::create([
                'order_number' => 'ORD-'.strtoupper(Str::random(8)),
                'buyer_id' => $request->user()->id,
                'status' => OrderStatuses::ORDER_CONFIRMED,
                'status_timeline' => OrderStatuses::initialTimeline(now()->toDateString()),
                'payment_status' => 'unpaid',
                'payment_method' => $paymentMethodLabel,
                'total_value' => $total,
                'currency' => $currency,
                'exchange_rate' => $snap['exchange_rate'],
                'total_value_usd' => $snap['amount_usd'],
                'total_value_pkr' => $snap['amount_pkr'],
                'notes' => $notes,
                'country_id' => $country->id,
                'port_id' => $port->id,
                'destination' => $country->name,
                'destination_port' => $port->name,
                'incoterm' => $data['incoterm'],
                'required_delivery_date' => $data['required_delivery_date'],
                'placed_at' => now(),
            ]);

            foreach ($cart->items as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product?->name ?? 'Product',
                    'qty' => $item->qty,
                    'unit_price' => $item->unit_price,
                    'line_total' => (float) $item->unit_price * (int) $item->qty,
                ]);
            }

            $cart->items()->delete();

            return $order;
        });

        return response()->json([
            'message' => 'Order placed successfully.',
            'data' => $order->load('items'),
        ], 201);
    }

    public function requestQuotation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:5000'],
            'destination_country_id' => ['required', 'integer', 'exists:countries,id'],
            'destination_port_id' => [
                'required',
                'integer',
                Rule::exists('ports', 'id')->where(fn ($q) => $q->where('country_id', $request->input('destination_country_id'))),
            ],
            'incoterm' => ['required', 'string', 'max:100'],
            'required_delivery_date' => ['required', 'date', 'after:today'],
        ]);

        if (strtoupper(trim((string) $data['incoterm'])) === 'FOB') {
            throw ValidationException::withMessages([
                'incoterm' => ['FOB orders use checkout and payment. Use cart/checkout for FOB.'],
            ]);
        }

        $this->cartFor($request);

        $country = Country::query()->findOrFail($data['destination_country_id']);
        $port = Port::query()->with('country:id,name')->findOrFail($data['destination_port_id']);
        $destination = "{$port->name}, {$country->name}";
        $userNotes = trim((string) ($data['notes'] ?? ''));

        /** @var Collection<int, Rfq> $rfqs */
        $rfqs = DB::transaction(function () use ($request, $data, $destination, $userNotes) {
            $cart = Cart::query()
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->firstOrFail();

            $cart->load(['items.product']);

            if ($cart->items->isEmpty()) {
                throw ValidationException::withMessages(['cart' => ['Cart is empty.']]);
            }

            $created = collect();

            foreach ($cart->items as $item) {
                $productName = $item->product?->name ?? 'Product';
                $qtyLabel = ((int) $item->qty).' MT';
                $lineNote = "Checkout quotation request — {$productName} ({$qtyLabel})";
                $notes = $userNotes !== '' ? $lineNote."\n---\n".$userNotes : $lineNote;

                $created->push(Rfq::create([
                    'buyer_id' => $request->user()->id,
                    'product_id' => $item->product_id,
                    'product_name' => $productName,
                    'qty' => $qtyLabel,
                    'packaging' => null,
                    'destination' => $destination,
                    'country_id' => $data['destination_country_id'],
                    'port_id' => $data['destination_port_id'],
                    'incoterm' => $data['incoterm'],
                    'payment_terms' => 'To be agreed',
                    'required_delivery_date' => $data['required_delivery_date'],
                    'notes' => $notes,
                    'status' => 'pending',
                    'submitted_at' => now(),
                ]));
            }

            $cart->items()->delete();

            return $created;
        });

        $payload = $rfqs->map(fn (Rfq $rfq) => [
            'id' => $rfq->id,
            'reference' => 'RFQ-'.str_pad((string) $rfq->id, 6, '0', STR_PAD_LEFT),
            'product_name' => $rfq->product_name,
            'qty' => $rfq->qty,
            'incoterm' => $rfq->incoterm,
            'status' => $rfq->status,
        ])->values()->all();

        return response()->json([
            'message' => 'Quotation request submitted. Our team will contact you soon.',
            'data' => ['rfqs' => $payload],
        ], 201);
    }

    private function cartFor(Request $request): Cart
    {
        return Cart::query()->firstOrCreate(['user_id' => $request->user()->id]);
    }
}
