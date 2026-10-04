<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentMethodController extends Controller
{
    public function index(): JsonResponse
    {
        $methods = PaymentMethod::query()
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        return response()->json(['data' => $methods]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['code'] = strtolower(trim($data['code']));
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['fields'] = array_values(array_filter(
            array_map(fn ($f) => is_string($f) ? trim($f) : '', $data['fields'] ?? []),
            fn ($f) => $f !== '',
        ));

        return response()->json(['data' => PaymentMethod::create($data)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $method = PaymentMethod::query()->findOrFail($id);
        $data = $this->validated($request, $method->id);

        if (isset($data['code'])) {
            $data['code'] = strtolower(trim($data['code']));
        }
        if (array_key_exists('fields', $data)) {
            $data['fields'] = array_values(array_filter(
                array_map(fn ($f) => is_string($f) ? trim($f) : '', $data['fields'] ?? []),
                fn ($f) => $f !== '',
            ));
        }

        $method->update($data);

        return response()->json(['data' => $method->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        PaymentMethod::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Payment method deleted.']);
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'code' => [
                $ignoreId ? 'sometimes' : 'required',
                'string',
                'max:50',
                Rule::unique('payment_methods', 'code')->ignore($ignoreId),
            ],
            'label' => [$ignoreId ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'badge' => ['nullable', 'string', 'max:100'],
            'fields' => ['nullable', 'array', 'max:2'],
            'fields.*' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
