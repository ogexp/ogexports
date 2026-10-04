<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\CrmActivity;
use App\Models\CrmLead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = CrmLead::query()->with(['owner:id,name,email', 'activities']);

        if ($status = $request->input('status') ?? $request->input('stage')) {
            $query->where('stage', $status);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('product', 'like', "%{$search}%");
            });
        }

        return response()->json($query->latest()->paginate($this->perPage($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:100'],
            'value' => ['nullable', 'string', 'max:100'],
            'product' => ['nullable', 'string', 'max:255'],
            'contact' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'stage' => ['nullable', 'string', 'max:50'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        $lead = CrmLead::create([
            ...$data,
            'stage' => $data['stage'] ?? 'new',
            'owner_id' => $data['owner_id'] ?? $request->user()->id,
        ]);

        return response()->json(['data' => $lead->load('owner:id,name,email')], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => CrmLead::query()
                ->with(['owner:id,name,email', 'activities.user:id,name'])
                ->findOrFail($id),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $lead = CrmLead::query()->findOrFail($id);

        $lead->update($request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:100'],
            'value' => ['nullable', 'string', 'max:100'],
            'product' => ['nullable', 'string', 'max:255'],
            'contact' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'stage' => ['nullable', 'string', 'max:50'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]));

        return response()->json(['data' => $lead->fresh()->load(['owner:id,name,email', 'activities'])]);
    }

    public function destroy(int $id): JsonResponse
    {
        CrmLead::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Lead deleted.']);
    }

    public function storeActivity(Request $request, int $id): JsonResponse
    {
        $lead = CrmLead::query()->findOrFail($id);

        $data = $request->validate([
            'type' => ['required', 'string', 'max:50'],
            'note' => ['required', 'string'],
            'occurred_at' => ['nullable', 'date'],
        ]);

        $activity = CrmActivity::create([
            'lead_id' => $lead->id,
            'type' => $data['type'],
            'note' => $data['note'],
            'user_id' => $request->user()->id,
            'occurred_at' => $data['occurred_at'] ?? now(),
        ]);

        return response()->json(['data' => $activity->load('user:id,name')], 201);
    }
}
