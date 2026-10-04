<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Deposit;
use App\Models\Investment;
use App\Models\InvestmentProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DepositOptionController extends Controller
{
    private const TYPES = [
        'container',
        'produce',
        'plant',
        'ricemill',
        'feed',
        'cold_storage',
        'domestic_trading',
    ];

    private const DASHBOARD_MODULES = [
        'feed',
        'ricemill',
        'yellow_maize',
    ];

    public function index(): JsonResponse
    {
        $options = InvestmentProject::query()
            ->where('show_in_deposit', true)
            ->orderBy('deposit_sort_order')
            ->orderBy('title')
            ->get()
            ->map(fn (InvestmentProject $p) => $this->transform($p))
            ->values();

        return response()->json(['data' => $options]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $isActive = $data['is_active'] ?? true;

        $project = InvestmentProject::create([
            'title' => $data['title'],
            'type' => $data['type'],
            'status' => $isActive ? 'funding' : 'paused',
            'roi_label' => $data['roi_label'] ?? null,
            'expected_return_pct' => $data['expected_return_pct'] ?? 0,
            'target_amount' => $data['target_amount'] ?? 0,
            'raised_amount' => $data['raised_amount'] ?? 0,
            'min_investment' => $data['min_investment'] ?? 100,
            'show_in_deposit' => true,
            'deposit_sort_order' => $data['deposit_sort_order'] ?? 0,
            'dashboard_module' => $data['dashboard_module'] ?? null,
            'current_project_stage' => $isActive ? 'Funding' : 'Paused',
            'commodity' => $data['commodity'] ?? $data['title'],
            'container_type' => $data['container_type'] ?? null,
            'description' => $data['description'] ?? null,
        ]);

        return response()->json(['data' => $this->transform($project)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $project = InvestmentProject::query()
            ->where('show_in_deposit', true)
            ->findOrFail($id);

        $data = $this->validated($request, true);

        $payload = [];
        foreach ([
            'title',
            'type',
            'roi_label',
            'expected_return_pct',
            'target_amount',
            'raised_amount',
            'min_investment',
            'deposit_sort_order',
            'dashboard_module',
            'commodity',
            'container_type',
            'description',
        ] as $field) {
            if (array_key_exists($field, $data)) {
                $payload[$field] = $data[$field];
            }
        }

        if (array_key_exists('is_active', $data)) {
            $payload['status'] = $data['is_active'] ? 'funding' : 'paused';
            $payload['current_project_stage'] = $data['is_active'] ? 'Funding' : 'Paused';
        }

        $project->update($payload);

        return response()->json(['data' => $this->transform($project->fresh())]);
    }

    public function destroy(int $id): JsonResponse
    {
        $project = InvestmentProject::query()
            ->where('show_in_deposit', true)
            ->findOrFail($id);

        $hasLinked = Investment::query()->where('project_id', $project->id)->exists()
            || Deposit::query()->where('project_id', $project->id)->exists();

        if ($hasLinked) {
            $project->update([
                'show_in_deposit' => false,
                'status' => 'paused',
                'current_project_stage' => 'Paused',
            ]);

            return response()->json(['message' => 'Deposit option removed from deposit list.']);
        }

        $project->delete();

        return response()->json(['message' => 'Deposit option deleted.']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'max:255'],
            'type' => [$required, 'string', Rule::in(self::TYPES)],
            'roi_label' => ['nullable', 'string', 'max:100'],
            'expected_return_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'target_amount' => ['nullable', 'numeric', 'min:0'],
            'raised_amount' => ['nullable', 'numeric', 'min:0'],
            'min_investment' => ['nullable', 'numeric', 'min:0'],
            'deposit_sort_order' => ['nullable', 'integer', 'min:0'],
            'dashboard_module' => ['nullable', 'string', Rule::in(self::DASHBOARD_MODULES)],
            'is_active' => ['nullable', 'boolean'],
            'commodity' => ['nullable', 'string', 'max:255'],
            'container_type' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
        ]);
    }

    private function transform(InvestmentProject $p): array
    {
        $status = strtolower((string) $p->status);
        $isActive = in_array($status, ['funding', 'active'], true);

        return [
            'id' => $p->id,
            'title' => $p->title,
            'type' => $p->type,
            'status' => $p->status,
            'roi_label' => $p->roi_label,
            'expected_return_pct' => (float) ($p->expected_return_pct ?: 0),
            'target_amount' => (float) ($p->target_amount ?: 0),
            'raised_amount' => (float) ($p->raised_amount ?: 0),
            'min_investment' => (float) ($p->min_investment ?: 0),
            'deposit_sort_order' => (int) ($p->deposit_sort_order ?: 0),
            'dashboard_module' => $p->dashboard_module,
            'show_in_deposit' => (bool) $p->show_in_deposit,
            'is_active' => $isActive,
            'commodity' => $p->commodity,
            'container_type' => $p->container_type,
            'description' => $p->description,
        ];
    }
}
