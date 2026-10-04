<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Incoterm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IncotermController extends Controller
{
    public function index(): JsonResponse
    {
        $incoterms = Incoterm::query()
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        return response()->json(['data' => $incoterms]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:10', 'unique:incoterms,code'],
            'label' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['code'] = strtoupper(trim($data['code']));
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        return response()->json(['data' => Incoterm::create($data)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $incoterm = Incoterm::query()->findOrFail($id);

        $data = $request->validate([
            'code' => ['sometimes', 'string', 'max:10', Rule::unique('incoterms', 'code')->ignore($incoterm->id)],
            'label' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (isset($data['code'])) {
            $data['code'] = strtoupper(trim($data['code']));
        }

        $incoterm->update($data);

        return response()->json(['data' => $incoterm->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        Incoterm::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Incoterm deleted.']);
    }
}
