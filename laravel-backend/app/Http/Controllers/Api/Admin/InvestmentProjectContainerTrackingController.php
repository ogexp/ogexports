<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContainerTrackingResource;
use App\Models\InvestmentProject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvestmentProjectContainerTrackingController extends Controller
{
    private const STAGES = [
        'origin',
        'port',
        'vessel',
        'destination',
        'buyer',
        'settlement',
    ];

    private const TRACKING_FIELDS = [
        'container_number',
        'bill_of_lading_number',
        'vessel_name',
        'port_of_loading',
        'destination_port',
        'etd',
        'eta',
        'latest_tracking_update',
        'trade_status',
    ];

    private const FIELD_LIMITS = [
        'container_number' => 80,
        'bill_of_lading_number' => 120,
        'vessel_name' => 160,
        'port_of_loading' => 160,
        'destination_port' => 160,
        'etd' => 64,
        'eta' => 64,
        'latest_tracking_update' => 1000,
        'trade_status' => 80,
    ];

    public function show(int $id): JsonResponse
    {
        $project = InvestmentProject::query()->findOrFail($id);
        $tracking = $project->containerTracking()->firstOrFail();

        return response()->json(
            (new ContainerTrackingResource($tracking))->resolve(request())
        );
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $rules = [];
        foreach (self::FIELD_LIMITS as $field => $maxLength) {
            $rules[$field] = ['sometimes', 'nullable', 'string', 'max:'.$maxLength];
        }

        $rules['container_journey'] = [
            'sometimes',
            'array:'.implode(',', self::STAGES),
            'min:1',
        ];
        foreach (self::STAGES as $stage) {
            $rules["container_journey.{$stage}"] = [
                'sometimes',
                'array:status,date,details',
                'min:1',
            ];
            foreach (['status' => 80, 'date' => 64, 'details' => 1000] as $field => $maxLength) {
                $rules["container_journey.{$stage}.{$field}"] = [
                    'sometimes',
                    'nullable',
                    'string',
                    'max:'.$maxLength,
                ];
            }
        }

        $allowedFields = [...array_keys(self::FIELD_LIMITS), 'container_journey'];
        $unknownFields = array_diff(array_keys($request->all()), $allowedFields);
        if ($unknownFields !== []) {
            throw ValidationException::withMessages([
                'body' => ['Unsupported container tracking field(s): '.implode(', ', $unknownFields).'.'],
            ]);
        }

        if ($request->all() === []) {
            throw ValidationException::withMessages([
                'body' => ['At least one container tracking field is required.'],
            ]);
        }

        $data = $request->validate($rules);

        $tracking = DB::transaction(function () use ($data, $id) {
            $project = InvestmentProject::query()
                ->lockForUpdate()
                ->findOrFail($id);

            $tracking = $project->containerTracking()->firstOrNew();
            $isNew = $tracking->exists === false;
            $journey = $isNew
                ? $this->emptyJourney()
                : ($tracking->container_journey ?? $this->emptyJourney());

            $journeyUpdate = $data['container_journey'] ?? [];
            unset($data['container_journey']);

            if ($isNew) {
                foreach (self::TRACKING_FIELDS as $field) {
                    $tracking->{$field} = null;
                }
            }

            $tracking->fill($data);
            foreach ($journeyUpdate as $stage => $stageUpdate) {
                $journey[$stage] = array_replace($journey[$stage], $stageUpdate);
            }

            $tracking->container_journey = $journey;
            $tracking->tracking_updated_at = now();
            $tracking->save();

            return $tracking->refresh();
        });

        return response()->json(
            (new ContainerTrackingResource($tracking))->resolve($request)
        );
    }

    private function emptyJourney(): array
    {
        $journey = [];
        foreach (self::STAGES as $stage) {
            $journey[$stage] = [
                'status' => null,
                'date' => null,
                'details' => null,
            ];
        }

        return $journey;
    }
}
