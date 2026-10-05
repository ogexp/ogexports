<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvestmentProjectStageUpdateResource;
use App\Models\InvestmentProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InvestmentProjectStageUpdateController extends Controller
{
    private const STAGES = [
        'funding',
        'investment_confirmed',
        'cargo_loaded',
        'in_transit',
        'custom_clearance',
        'settled',
    ];

    private const STATUSES = [
        'not_started',
        'in_progress',
        'completed',
    ];

    public function index(int $id)
    {
        $project = InvestmentProject::query()->findOrFail($id);
        $this->ensureContainerProject($project);

        return InvestmentProjectStageUpdateResource::collection(
            $project->stageUpdates()
                ->orderBy('created_at')
                ->orderBy('id')
                ->get()
        );
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $project = InvestmentProject::query()->findOrFail($id);
        $this->ensureContainerProject($project);

        $data = $request->validate([
            'stage' => ['required', 'string', Rule::in(self::STAGES)],
            'status' => ['required', 'string', Rule::in(self::STATUSES)],
            'description' => ['required', 'string', 'min:1', 'max:5000'],
            'occurred_at' => ['required', 'date'],
        ]);

        $update = $project->stageUpdates()->create($data);

        return (new InvestmentProjectStageUpdateResource($update))
            ->response()
            ->setStatusCode(201);
    }

    private function ensureContainerProject(InvestmentProject $project): void
    {
        if (strtolower((string) $project->type) !== 'container') {
            throw ValidationException::withMessages([
                'project' => ['Stage updates are only available for container projects.'],
            ]);
        }
    }
}
