<?php

namespace App\Http\Controllers\Api\Buyer;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Support\DepositReviewStatuses;
use App\Support\AdminNotificationTypes;
use App\Support\NotifiesAdmins;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    use PaginatesQueries;

    public function bankAccounts(): JsonResponse
    {
        $accounts = BankAccount::query()
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->get();

        return response()->json(['data' => $accounts]);
    }

    public function markPaid(Request $request, int $orderId): JsonResponse
    {
        $data = $request->validate([
            'payment_method' => [
                'required',
                'string',
                'max:50',
                Rule::exists('payment_methods', 'code')->where(fn ($q) => $q->where('is_active', true)),
            ],
            'payment_field1' => ['nullable', 'string', 'max:255'],
            'payment_field2' => ['nullable', 'string', 'max:255'],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $method = PaymentMethod::query()
            ->where('code', $data['payment_method'])
            ->where('is_active', true)
            ->firstOrFail();

        $fields = is_array($method->fields) ? array_values($method->fields) : [];
        if (! empty($fields[0]) && blank($data['payment_field1'] ?? null)) {
            throw ValidationException::withMessages([
                'payment_field1' => [($fields[0]).' is required.'],
            ]);
        }

        $order = DB::transaction(function () use ($request, $orderId, $data, $method, $fields) {
            $order = Order::query()
                ->where('buyer_id', $request->user()->id)
                ->lockForUpdate()
                ->findOrFail($orderId);

            if (in_array($order->payment_status, DepositReviewStatuses::buyerBlocksResubmit(), true)) {
                $normalized = DepositReviewStatuses::normalize($order->payment_status);
                throw ValidationException::withMessages([
                    'payment_status' => [
                        $normalized === DepositReviewStatuses::APPROVED
                            ? 'Order already paid.'
                            : 'Payment already submitted for verification.',
                    ],
                ]);
            }

            $field1Label = ! empty($fields[0]) ? (string) $fields[0] : null;
            $field2Label = ! empty($fields[1]) ? (string) $fields[1] : null;
            $field1Value = trim((string) ($data['payment_field1'] ?? ''));
            $field2Value = trim((string) ($data['payment_field2'] ?? ''));
            $reference = trim((string) ($data['reference'] ?? $field2Value));

            $noteParts = [];
            if (! empty($data['notes'])) {
                $noteParts[] = trim((string) $data['notes']);
            }
            if ($field1Label && $field1Value !== '') {
                $noteParts[] = $field1Label.': '.$field1Value;
            }
            if ($field2Label && $field2Value !== '') {
                $noteParts[] = $field2Label.': '.$field2Value;
            }
            if ($reference !== '' && $field2Value === '') {
                $noteParts[] = 'Ref: '.$reference;
            }

            $extra = implode(' | ', $noteParts);

            $order->update([
                'payment_method' => $method->label,
                'payment_method_code' => $method->code,
                'payment_field1_label' => $field1Label,
                'payment_field1_value' => $field1Value !== '' ? $field1Value : null,
                'payment_field2_label' => $field2Label,
                'payment_field2_value' => $field2Value !== '' ? $field2Value : null,
                'payment_reference' => $reference !== '' ? $reference : null,
                'payment_submitted_at' => now(),
                // Keep legacy storage value so existing admin filters still work;
                // DepositReviewStatuses normalizes this to "pending".
                'payment_status' => 'pending_verification',
                'notes' => trim(($order->notes ? $order->notes."\n" : '').$extra),
            ]);

            return $order->fresh();
        });

        NotifiesAdmins::notify(
            AdminNotificationTypes::BUYER_DEPOSIT_SUBMITTED,
            'Buyer payment submitted: '.($order->order_number ?? ('#'.$order->id)),
            ($request->user()->name ?? 'Buyer').' marked order as paid for review.',
            [
                'href' => '/admin/finance?tab=buyer-deposits',
                'order_id' => $order->id,
                'user_id' => $request->user()->id,
            ]
        );

        return response()->json([
            'message' => 'Payment submitted for verification.',
            'data' => $this->transformOrder($order),
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->where('buyer_id', $request->user()->id)
            ->whereIn('payment_status', DepositReviewStatuses::buyerListedStorage())
            ->latest()
            ->paginate($this->perPage($request));

        $orders->setCollection(
            $orders->getCollection()->map(fn (Order $order) => $this->transformOrder($order))
        );

        return response()->json($orders);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformOrder(Order $order): array
    {
        $raw = $order->toArray();
        $raw['review_status'] = DepositReviewStatuses::normalize($order->payment_status);
        $raw['review_status_label'] = DepositReviewStatuses::label($order->payment_status);

        return $raw;
    }
}
