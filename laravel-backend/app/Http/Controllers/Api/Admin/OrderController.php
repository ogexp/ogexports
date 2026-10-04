<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Rfq;
use App\Models\RfqAttachment;
use App\Services\BuyerTradeNotifier;
use App\Services\OrderPdfGenerator;
use App\Support\AuditsActions;
use App\Support\OrderStatuses;
use App\Support\UserDisplayCurrency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class OrderController extends Controller
{
    use PaginatesQueries;

    public function orders(Request $request): JsonResponse
    {
        $query = Order::query()->with([
            'buyer:id,name,email',
            'buyer.profile:id,user_id,country',
            'items',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($paymentStatus = $request->input('payment_status')) {
            $statuses = is_array($paymentStatus)
                ? $paymentStatus
                : preg_split('/\s*,\s*/', (string) $paymentStatus, -1, PREG_SPLIT_NO_EMPTY);
            $statuses = array_values(array_filter(array_map(
                static fn ($s) => strtolower(trim((string) $s)),
                $statuses ?: [],
            )));
            if ($statuses !== []) {
                $query->whereIn('payment_status', $statuses);
            }
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('destination', 'like', "%{$search}%")
                    ->orWhere('destination_port', 'like', "%{$search}%")
                    ->orWhereHas('buyer', fn ($b) => $b->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        $paginator = $query->latest()->paginate($this->perPage($request));
        $paginator->getCollection()->transform(fn (Order $order) => $this->transformOrder($order));

        return response()->json($paginator);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformOrder(Order $order): array
    {
        $data = $order->toArray();
        $data['buyer'] = UserDisplayCurrency::userPayload($order->buyer);

        return $data;
    }

    public function showOrder(int $id): JsonResponse
    {
        $order = Order::query()
            ->with(['buyer:id,name,email', 'items.product', 'shipments', 'quotation', 'country', 'port'])
            ->findOrFail($id);

        return response()->json(['data' => $order]);
    }

    public function pdf(int $id, OrderPdfGenerator $pdf): Response
    {
        $order = Order::query()->findOrFail($id);

        return $pdf->download($order);
    }

    public function updateOrderStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(OrderStatuses::all())],
            'payment_status' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $order = Order::query()->findOrFail($id);
        $previousStatus = $order->status;
        $previousPaymentStatus = $order->payment_status;

        $timeline = OrderStatuses::applyStatus(
            is_array($order->status_timeline) ? $order->status_timeline : [],
            $data['status'],
            now()->toDateString(),
        );

        $payload = [
            'status' => $data['status'],
            'status_timeline' => $timeline,
        ];
        if (array_key_exists('payment_status', $data) && $data['payment_status'] !== null) {
            $payload['payment_status'] = $data['payment_status'];
        }
        if (array_key_exists('notes', $data) && $data['notes'] !== null) {
            $payload['notes'] = $data['notes'];
        }

        $order->update($payload);

        AuditsActions::log('order.status', 'orders', $request->user(), [
            'order_id' => $order->id,
            'status' => $data['status'],
        ]);

        $order = $order->fresh()->load(['buyer:id,name,email', 'items']);

        $statusChanged = (string) $previousStatus !== (string) $data['status'];
        $paymentChanged = array_key_exists('payment_status', $data)
            && $data['payment_status'] !== null
            && (string) $previousPaymentStatus !== (string) $data['payment_status'];

        if ($statusChanged || $paymentChanged) {
            BuyerTradeNotifier::orderStatusUpdated($order, $previousStatus, $previousPaymentStatus);
        }

        return response()->json([
            'message' => 'Order status updated.',
            'data' => $order,
        ]);
    }

    public function rfqs(Request $request): JsonResponse
    {
        $query = Rfq::query()->with([
            'buyer:id,name,email',
            'product:id,name,slug',
            'quotations',
            'attachments',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                    ->orWhere('destination', 'like', "%{$search}%");
            });
        }

        $paginator = $query->latest()->paginate($this->perPage($request));
        $paginator->getCollection()->transform(function (Rfq $rfq) {
            $data = $rfq->toArray();
            $data['attachments'] = $rfq->attachments
                ->map(fn (RfqAttachment $a) => $a->toApiArray())
                ->values()
                ->all();

            return $data;
        });

        return response()->json($paginator);
    }
}
