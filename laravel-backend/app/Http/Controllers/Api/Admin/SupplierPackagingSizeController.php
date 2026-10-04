<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupplierPackagingSize;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierPackagingSizeController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = SupplierPackagingSize::query()
            ->orderBy('sort_order')
            ->orderBy('label')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:255', 'unique:supplier_packaging_sizes,label'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['label'] = trim($data['label']);
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        return response()->json(['data' => SupplierPackagingSize::create($data)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $row = SupplierPackagingSize::query()->findOrFail($id);

        $data = $request->validate([
            'label' => ['sometimes', 'string', 'max:255', Rule::unique('supplier_packaging_sizes', 'label')->ignore($row->id)],
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
        SupplierPackagingSize::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Packaging size deleted.']);
    }
}
