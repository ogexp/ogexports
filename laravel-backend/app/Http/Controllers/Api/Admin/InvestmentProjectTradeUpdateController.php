<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvestmentProjectTradeUpdateResource;
use App\Models\InvestmentProject;
use App\Models\InvestmentProjectTradeUpdate;
use App\Models\User;
use App\Support\InvestorNotificationTypes;
use App\Support\NotifiesUsers;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Throwable;

class InvestmentProjectTradeUpdateController extends Controller
{
    public function index(int $id): AnonymousResourceCollection
    {
        $project = InvestmentProject::query()->findOrFail($id);

        return InvestmentProjectTradeUpdateResource::collection(
            $project->tradeUpdates()
                ->orderBy('occurred_at')
                ->orderBy('id')
                ->get()
        );
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $project = InvestmentProject::query()->findOrFail($id);
        $request->merge([
            'status' => is_string($request->input('status')) ? trim($request->input('status')) : $request->input('status'),
            'description' => is_string($request->input('description')) ? trim($request->input('description')) : $request->input('description'),
        ]);
        $data = $request->validate([
            'status' => ['required', 'string', 'min:1', 'max:120'],
            'description' => ['required', 'string', 'min:1', 'max:5000'],
            'occurred_at' => ['required', 'date'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
        ]);

        $stored = null;
        if ($request->hasFile('attachment')) {
            /** @var \Illuminate\Http\UploadedFile $file */
            $file = $request->file('attachment');
            $stored = MediaStorage::store(
                $file,
                'trade-documents',
                $project->id,
                $request->user(),
            );
        }

        try {
            $update = DB::transaction(function () use ($project, $data, $stored) {
                $update = InvestmentProjectTradeUpdate::query()->create([
                    'investment_project_id' => $project->id,
                    'status' => trim($data['status']),
                    'description' => trim($data['description']),
                    'occurred_at' => $data['occurred_at'],
                    'attachment_path' => $stored['path'] ?? null,
                    'attachment_name' => isset($stored['name']) ? mb_substr($stored['name'], 0, 255) : null,
                    'attachment_mime' => $stored['mime'] ?? null,
                    'attachment_size_bytes' => is_int($stored['size'] ?? null) ? $stored['size'] : null,
                ]);

                $investorIds = $project->investments()
                    ->where('status', 'active')
                    ->distinct()
                    ->pluck('investor_id');

                foreach (User::query()->whereKey($investorIds)->get() as $investor) {
                    NotifiesUsers::notify(
                        $investor,
                        InvestorNotificationTypes::SHIPMENT_UPDATE,
                        'Trade update: '.$update->status,
                        $update->description,
                        [
                            'project_id' => $project->id,
                            'trade_update_id' => $update->id,
                            'deep_link' => '/project/'.$project->id,
                        ],
                    );
                }

                return $update;
            });
        } catch (Throwable $error) {
            if (isset($stored['path']) && MediaStorage::exists($stored['path'])) {
                MediaStorage::delete($stored['path']);
            }

            throw $error;
        }

        return (new InvestmentProjectTradeUpdateResource($update))
            ->response()
            ->setStatusCode(201);
    }
}