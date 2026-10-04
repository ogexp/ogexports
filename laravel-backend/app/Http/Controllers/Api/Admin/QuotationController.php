<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\FobPrice;
use App\Models\Quotation;
use App\Models\Rfq;
use App\Services\BuyerTradeNotifier;
use App\Support\AuditsActions;
use App\Support\NotifiesUsers;
use App\Support\UserDisplayCurrency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    use PaginatesQueries;

    public function fobIndex(Request $request): JsonResponse
    {
        $query = FobPrice::query()->with('product:id,name,slug');

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                    ->orWhereHas('product', fn ($p) => $p->where('name', 'like', "%{$search}%"));
            });
        }

        return response()->json($query->latest()->paginate($this->perPage($request)));
    }

    public function fobStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['nullable', 'exists:products,id'],
            'product_name' => ['required', 'string', 'max:255'],
            'price_per_mt' => ['required', 'numeric', 'min:0'],
        ]);

        $fob = FobPrice::create($data);

        return response()->json(['data' => $fob], 201);
    }

    public function fobUpdate(Request $request, int $id): JsonResponse
    {
        $fob = FobPrice::query()->findOrFail($id);
        $fob->update($request->validate([
            'product_id' => ['nullable', 'exists:products,id'],
            'product_name' => ['sometimes', 'string', 'max:255'],
            'price_per_mt' => ['sometimes', 'numeric', 'min:0'],
        ]));

        return response()->json(['data' => $fob->fresh()]);
    }

    public function fobDestroy(int $id): JsonResponse
    {
        FobPrice::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'FOB price deleted.']);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Quotation::query()
            ->with([
                'buyer:id,name,email',
                'buyer.profile:id,user_id,country',
                'rfq',
            ])
            ->withCount([
                'messages as unread_messages_count' => function ($q) use ($request) {
                    $q->whereNull('read_at')->where('user_id', '!=', $request->user()->id);
                },
                'messages as messages_count',
            ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where('product_name', 'like', "%{$search}%");
        }

        $paginator = $query->latest()->paginate($this->perPage($request));
        $paginator->getCollection()->transform(function (Quotation $quotation) {
            $data = $quotation->toArray();
            $data['buyer'] = UserDisplayCurrency::userPayload($quotation->buyer);

            return $data;
        });

        return response()->json($paginator);
    }

    public function storeFromRfq(Request $request, int $rfqId): JsonResponse
    {
        $rfq = Rfq::query()->findOrFail($rfqId);

        $data = $request->validate([
            'qty_mt' => ['nullable', 'numeric'],
            'incoterm' => ['nullable', 'string', 'max:50'],
            'destination' => ['nullable', 'string', 'max:255'],
            'payment_terms' => ['nullable', 'string', 'max:255'],
            'valid_until' => ['nullable', 'date'],
            'fob_unit_price' => ['required', 'numeric', 'min:0'],
            'freight' => ['nullable', 'numeric', 'min:0'],
            'insurance' => ['nullable', 'numeric', 'min:0'],
            'doc_fee' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'send' => ['nullable', 'boolean'],
        ]);

        $quotation = DB::transaction(function () use ($rfq, $data) {
            $status = ! empty($data['send']) ? 'sent' : 'draft';

            $qtyMt = $data['qty_mt'] ?? null;
            if ($qtyMt === null || $qtyMt === '') {
                if (preg_match('/[\d.]+/', (string) $rfq->qty, $m)) {
                    $qtyMt = (float) $m[0];
                } else {
                    $qtyMt = 0;
                }
            }

            $quotation = Quotation::create([
                'rfq_id' => $rfq->id,
                'buyer_id' => $rfq->buyer_id,
                'product_name' => $rfq->product_name,
                'qty_mt' => $qtyMt,
                'incoterm' => $data['incoterm'] ?? $rfq->incoterm,
                'destination' => $data['destination'] ?? $rfq->destination,
                'payment_terms' => $data['payment_terms'] ?? $rfq->payment_terms,
                'valid_until' => $data['valid_until'] ?? null,
                'status' => $status,
                'source' => 'admin',
                'fob_unit_price' => $data['fob_unit_price'],
                'freight' => $data['freight'] ?? 0,
                'insurance' => $data['insurance'] ?? 0,
                'doc_fee' => $data['doc_fee'] ?? 0,
                'notes' => $data['notes'] ?? null,
                'issued_at' => $status === 'sent' ? now() : null,
            ]);

            $rfq->update(['status' => $status === 'sent' ? 'quoted' : $rfq->status]);

            return $quotation;
        });

        AuditsActions::log('quotation.created', 'quotations', $request->user(), [
            'quotation_id' => $quotation->id,
            'rfq_id' => $rfq->id,
        ]);

        $quotation->load(['buyer:id,name,email', 'rfq']);

        if ($quotation->status === 'sent') {
            $this->notifyBuyerOfQuotation($quotation, isUpdate: false);
        }

        return response()->json([
            'message' => 'Quotation created.',
            'data' => $quotation,
        ], 201);
    }

    public function send(Request $request, int $id): JsonResponse
    {
        $quotation = Quotation::query()->findOrFail($id);
        $wasAlreadySent = $quotation->status === 'sent';

        $quotation->update([
            'status' => 'sent',
            'issued_at' => $quotation->issued_at ?? now(),
        ]);

        if ($quotation->rfq_id) {
            Rfq::query()->whereKey($quotation->rfq_id)->update(['status' => 'quoted']);
        }

        AuditsActions::log('quotation.sent', 'quotations', $request->user(), [
            'quotation_id' => $quotation->id,
        ]);

        $quotation = $quotation->fresh(['buyer:id,name,email', 'rfq']);
        $this->notifyBuyerOfQuotation($quotation, isUpdate: $wasAlreadySent);

        return response()->json([
            'message' => 'Quotation sent.',
            'data' => $quotation,
        ]);
    }

    public function messages(Request $request, int $id): JsonResponse
    {
        $quotation = Quotation::query()->findOrFail($id);

        $messages = \App\Models\QuotationMessage::query()
            ->where('quotation_id', $quotation->id)
            ->with('user:id,name,email')
            ->orderBy('created_at')
            ->get();

        \App\Models\QuotationMessage::query()
            ->where('quotation_id', $quotation->id)
            ->where('user_id', '!=', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['data' => $messages]);
    }

    public function storeMessage(Request $request, int $id): JsonResponse
    {
        $quotation = Quotation::query()->findOrFail($id);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = \App\Models\QuotationMessage::create([
            'quotation_id' => $quotation->id,
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        $quotation->loadMissing('buyer');
        BuyerTradeNotifier::quotationReply($quotation, $data['body']);

        return response()->json([
            'message' => 'Reply sent.',
            'data' => $message->load('user:id,name,email'),
        ], 201);
    }

    private function notifyBuyerOfQuotation(Quotation $quotation, bool $isUpdate = false): void
    {
        $buyer = $quotation->buyer;
        if (! $buyer) {
            $quotation->loadMissing('buyer');
            $buyer = $quotation->buyer;
        }

        if (! $buyer) {
            return;
        }

        $total = (float) $quotation->qty_mt * (float) $quotation->fob_unit_price
            + (float) $quotation->freight
            + (float) $quotation->insurance
            + (float) $quotation->doc_fee;

        $ref = 'QT-'.$quotation->id;
        $product = $quotation->product_name ?: 'Product';
        $qty = $quotation->qty_mt ? ((float) $quotation->qty_mt).' MT' : '—';
        $incoterm = $quotation->incoterm ?: '—';
        $totalFormatted = number_format($total, 2);
        $portalUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/').'/buyer/quotations';

        $title = $isUpdate
            ? "Quotation updated — {$ref}"
            : "New quotation — {$ref}";
        $body = $isUpdate
            ? "Your quotation for {$qty} {$product} ({$incoterm}) has been updated. Estimated total: \${$totalFormatted}."
            : "A quotation for {$qty} {$product} ({$incoterm}) is ready. Estimated total: \${$totalFormatted}.";

        NotifiesUsers::notifyAndEmail(
            $buyer,
            'quotation',
            $title,
            $body,
            [
                'quotation_id' => $quotation->id,
                'rfq_id' => $quotation->rfq_id,
                'href' => '/buyer/quotations',
                'status' => $quotation->status,
            ],
            'quotation_sent',
            [
                'quotation_ref' => $ref,
                'product_name' => $product,
                'qty' => $qty,
                'incoterm' => $incoterm,
                'total' => $totalFormatted,
                'status' => $isUpdate ? 'Updated' : 'Sent',
                'portal_url' => $portalUrl,
            ]
        );
    }
}
