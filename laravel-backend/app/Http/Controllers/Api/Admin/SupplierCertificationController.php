<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupplierCertification;
use App\Support\SupplierMarket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierCertificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SupplierCertification::query()
            ->orderBy('market')
            ->orderBy('sort_order')
            ->orderBy('label');

        if ($market = $request->query('market')) {
            $query->where('market', $market);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label' => [
                'required',
                'string',
                'max:255',
                Rule::unique('supplier_certifications', 'label')->where(fn ($q) => $q->where('market', $request->input('market'))),
            ],
            'market' => ['required', Rule::in(SupplierMarket::values())],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['label'] = trim($data['label']);
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        return response()->json(['data' => SupplierCertification::create($data)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $row = SupplierCertification::query()->findOrFail($id);
        $market = $request->input('market', $row->market);

        $data = $request->validate([
            'label' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('supplier_certifications', 'label')
                    ->where(fn ($q) => $q->where('market', $market))
                    ->ignore($row->id),
            ],
            'market' => ['sometimes', Rule::in(SupplierMarket::values())],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (isset($data['label'])) {
            $data['label'] = trim($data['label']);
        }

        $row->update($data);

        return response()->json(['data' => $row->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        SupplierCertification::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Certification deleted.']);
    }
}
