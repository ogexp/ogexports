<?php

namespace App\Http\Controllers\Api\Supplier;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\SupplierCertification;
use App\Models\SupplierOffer;
use App\Models\SupplierPackagingSize;
use App\Models\SupplierPaymentTerm;
use App\Support\SupplierMarket;
use App\Support\TradeAmountSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OfferController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = SupplierOffer::query()
            ->where('supplier_id', $request->user()->id)
            ->with('notes');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        return response()->json(
            $query->latest('submitted_at')->paginate($this->perPage($request, 10))
        );
    }

    public function stats(Request $request): JsonResponse
    {
        $base = SupplierOffer::query()->where('supplier_id', $request->user()->id);

        return response()->json([
            'data' => [
                'total' => (clone $base)->count(),
                'pending' => (clone $base)->where('status', 'pending')->count(),
                'approved' => (clone $base)->where('status', 'approved')->count(),
                'hold' => (clone $base)->where('status', 'hold')->count(),
                'rejected' => (clone $base)->where('status', 'rejected')->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedOffer($request);
        $this->assertOfferOptions($request, $data);

        $market = SupplierMarket::fromUser($request->user());
        $data['currency'] = $data['currency'] ?? ($market === SupplierMarket::PAKISTAN ? 'PKR' : 'USD');
        $data['incoterm'] = $data['incoterm'] ?? ($market === SupplierMarket::PAKISTAN ? 'DAP' : 'FOB');
        $data['images'] = $data['images'] ?? [];
        $data = array_merge($data, $this->lineValueSnapshot($data));

        $offer = SupplierOffer::create([
            ...$data,
            'supplier_id' => $request->user()->id,
            'status' => 'pending',
            'submitted_at' => now(),
        ]);

        return response()->json(['data' => $offer->fresh()->load('notes')], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $offer = SupplierOffer::query()
            ->where('supplier_id', $request->user()->id)
            ->with('notes')
            ->findOrFail($id);

        return response()->json(['data' => $offer]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $offer = SupplierOffer::query()
            ->where('supplier_id', $request->user()->id)
            ->findOrFail($id);

        $data = $this->validatedOffer($request, updating: true);
        $this->assertOfferOptions($request, array_merge($offer->toArray(), $data));

        $merged = array_merge($offer->only([
            'available_qty',
            'price_fob',
            'currency',
        ]), $data);

        if (array_key_exists('price_fob', $data)
            || array_key_exists('available_qty', $data)
            || array_key_exists('currency', $data)
        ) {
            $data = array_merge($data, $this->lineValueSnapshot($merged));
        }

        $offer->update($data);

        return response()->json(['data' => $offer->fresh()->load('notes')]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{exchange_rate: float, line_value_usd: float, line_value_pkr: float}
     */
    private function lineValueSnapshot(array $data): array
    {
        $price = $this->parseNumber($data['price_fob'] ?? null);
        $qty = $this->parseNumber($data['available_qty'] ?? null);
        $lineValue = round($price * $qty, 2);
        $currency = strtoupper((string) ($data['currency'] ?? 'USD'));
        $snap = TradeAmountSnapshot::fromNative($lineValue, $currency);

        return [
            'exchange_rate' => $snap['exchange_rate'],
            'line_value_usd' => $snap['amount_usd'],
            'line_value_pkr' => $snap['amount_pkr'],
        ];
    }

    private function parseNumber(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        if (preg_match('/[\d.]+/', str_replace(',', '', (string) $value), $m)) {
            return (float) $m[0];
        }

        return 0.0;
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedOffer(Request $request, bool $updating = false): array
    {
        $required = $updating ? 'sometimes' : 'required';

        return $request->validate([
            'category' => [$required, 'string', 'max:100'],
            'product_name' => [$required, 'string', 'max:255'],
            'origin' => [$required, 'string', 'max:255'],
            'specifications' => [$required, 'string'],
            'available_qty' => [$required, 'string', 'max:100'],
            'price_fob' => [$required, 'string', 'max:100'],
            'currency' => ['nullable', 'string', 'in:PKR,USD'],
            'incoterm' => ['nullable', 'string', 'max:50'],
            'price_unit' => ['nullable', 'string', 'max:50'],
            'moq' => [$required, 'string', 'max:100'],
            'lead_time' => [$required, 'string', 'max:100'],
            'packaging' => [$required, 'string', 'max:255'],
            'payment_terms' => [$required, 'string', 'max:255'],
            'certifications' => ['nullable', 'array'],
            'certifications.*' => ['string', 'max:255'],
            'valid_until' => ['nullable', 'date'],
            'hs_code' => ['nullable', 'string', 'max:50'],
            'images' => ['nullable', 'array', 'max:3'],
            'images.*' => ['required', 'string', 'max:2048'],
            'video' => ['nullable', 'string', 'max:2048'],
            'remarks' => ['nullable', 'string', 'max:5000'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertOfferOptions(Request $request, array $data): void
    {
        $market = SupplierMarket::fromUser($request->user());
        $errors = [];

        if (! empty($data['payment_terms'])) {
            $exists = SupplierPaymentTerm::query()
                ->where('market', $market)
                ->where('is_active', true)
                ->where('label', $data['payment_terms'])
                ->exists();

            if (! $exists) {
                $errors['payment_terms'] = ['Selected payment terms are not available for your market.'];
            }
        }

        if (! empty($data['price_unit'])) {
            $exists = SupplierPackagingSize::query()
                ->where('is_active', true)
                ->where('label', $data['price_unit'])
                ->exists();

            if (! $exists) {
                $errors['price_unit'] = ['Selected unit / packaging size is not available.'];
            }
        }

        $certs = $data['certifications'] ?? [];
        if (is_array($certs) && $certs !== []) {
            $allowed = SupplierCertification::query()
                ->where('market', $market)
                ->where('is_active', true)
                ->whereIn('label', $certs)
                ->pluck('label')
                ->all();

            $invalid = array_values(array_diff($certs, $allowed));
            if ($invalid !== []) {
                $errors['certifications'] = ['One or more certifications are not available for your market.'];
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
