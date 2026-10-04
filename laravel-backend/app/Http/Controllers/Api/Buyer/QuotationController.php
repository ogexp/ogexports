<?php

namespace App\Http\Controllers\Api\Buyer;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Quotation;
use App\Models\QuotationMessage;
use App\Models\Shipment;
use App\Support\OrderStatuses;
use App\Support\TradeAmountSnapshot;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class QuotationController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = Quotation::query()
            ->where('buyer_id', $request->user()->id)
            ->with(['rfq', 'orders:id,quotation_id,order_number']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->latest()->paginate($this->perPage($request)));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $quotation = Quotation::query()
            ->where('buyer_id', $request->user()->id)
            ->with('rfq')
            ->findOrFail($id);

        return response()->json(['data' => $quotation]);
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $quotation = Quotation::query()
            ->where('buyer_id', $request->user()->id)
            ->with('rfq')
            ->findOrFail($id);

        if (! in_array($quotation->status, ['sent', 'pending'], true)) {
            throw ValidationException::withMessages(['status' => ['Quotation cannot be accepted.']]);
        }

        $order = DB::transaction(function () use ($quotation, $request) {
            $quotation->update(['status' => 'accepted']);

            $lineTotal = ((float) $quotation->fob_unit_price * (float) ($quotation->qty_mt ?: 1))
                + (float) $quotation->freight
                + (float) $quotation->insurance
                + (float) $quotation->doc_fee;

            $currency = 'USD';
            $snap = TradeAmountSnapshot::fromNative((float) $lineTotal, $currency);

            $order = Order::create([
                'order_number' => 'ORD-'.strtoupper(Str::random(8)),
                'buyer_id' => $request->user()->id,
                'status' => OrderStatuses::ORDER_CONFIRMED,
                'status_timeline' => OrderStatuses::initialTimeline(now()->toDateString()),
                'payment_status' => 'unpaid',
                'total_value' => $lineTotal,
                'currency' => $currency,
                'exchange_rate' => $snap['exchange_rate'],
                'total_value_usd' => $snap['amount_usd'],
                'total_value_pkr' => $snap['amount_pkr'],
                'quotation_id' => $quotation->id,
                'placed_at' => now(),
            ]);

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $quotation->rfq?->product_id,
                'product_name' => $quotation->product_name,
                'qty' => $quotation->qty_mt ?? 1,
                'unit_price' => $quotation->fob_unit_price,
                'line_total' => $lineTotal,
            ]);

            Shipment::create([
                'order_id' => $order->id,
                'buyer_id' => $request->user()->id,
                'product_snapshot' => $quotation->product_name,
                'destination' => $quotation->destination,
                'status' => 'pending',
                'current_milestone' => 'Awaiting Booking',
            ]);

            if ($quotation->rfq_id) {
                $quotation->rfq?->update(['status' => 'converted']);
            }

            return $order;
        });

        return response()->json([
            'message' => 'Quotation accepted.',
            'data' => [
                'quotation' => $quotation->fresh(),
                'order' => $order->load('items'),
            ],
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $quotation = Quotation::query()
            ->where('buyer_id', $request->user()->id)
            ->findOrFail($id);

        if (! in_array($quotation->status, ['sent', 'pending'], true)) {
            throw ValidationException::withMessages(['status' => ['Quotation cannot be rejected.']]);
        }

        $quotation->update(['status' => 'rejected']);

        return response()->json([
            'message' => 'Quotation rejected.',
            'data' => $quotation->fresh(),
        ]);
    }

    public function messages(Request $request, int $id): JsonResponse
    {
        $quotation = Quotation::query()
            ->where('buyer_id', $request->user()->id)
            ->findOrFail($id);

        try {
            $messages = QuotationMessage::query()
                ->where('quotation_id', $quotation->id)
                ->with('user:id,name,email')
                ->orderBy('created_at')
                ->get();

            // Mark admin messages as read for buyer
            QuotationMessage::query()
                ->where('quotation_id', $quotation->id)
                ->where('user_id', '!=', $request->user()->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        } catch (QueryException $e) {
            Log::error('Buyer quotation messages failed', [
                'quotation_id' => $quotation->id,
                'buyer_id' => $request->user()->id,
                'sql' => $e->getSql(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Trade desk messaging is unavailable — contact support.',
            ], 503);
        }

        return response()->json(['data' => $messages]);
    }

    public function storeMessage(Request $request, int $id): JsonResponse
    {
        $quotation = Quotation::query()
            ->where('buyer_id', $request->user()->id)
            ->findOrFail($id);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        try {
            $message = QuotationMessage::create([
                'quotation_id' => $quotation->id,
                'user_id' => $request->user()->id,
                'body' => $data['body'],
            ]);

            $message->load('user:id,name,email');
        } catch (QueryException $e) {
            Log::error('Buyer quotation counter-offer failed', [
                'quotation_id' => $quotation->id,
                'buyer_id' => $request->user()->id,
                'sql' => $e->getSql(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Trade desk messaging is unavailable — contact support.',
            ], 503);
        }

        return response()->json([
            'message' => 'Message sent.',
            'data' => $message,
        ], 201);
    }
}
