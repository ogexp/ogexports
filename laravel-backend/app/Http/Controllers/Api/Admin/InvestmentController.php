<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Http\Resources\InvestmentProjectResource;
use App\Http\Resources\InvestmentResource;
use App\Models\Deposit;
use App\Models\Investment;
use App\Models\InvestmentProfitDistribution;
use App\Models\InvestmentProject;
use App\Models\Withdrawal;
use App\Support\AuditsActions;
use App\Support\ProjectReferenceGenerator;
use App\Support\InvestmentCapacity;
use App\Support\InvestmentReviewService;
use App\Support\InvestorNotificationTypes;
use App\Support\MediaStorage;
use App\Support\MediaPath;
use App\Support\NotifiesUsers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InvestmentController extends Controller
{
    use PaginatesQueries;

    private const IMAGE_DIR = 'investment_images';

    public function __construct(
        private readonly InvestmentReviewService $reviewService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = InvestmentProject::query();

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('commodity', 'like', "%{$search}%")
                    ->orWhere('vessel', 'like', "%{$search}%");
            });
        }

        return InvestmentProjectResource::collection(
            $query->with('documents')->latest()->paginate($this->perPage($request))
        );
    }

    public function activeProjects(Request $request): JsonResponse
    {
        // Keep settled/completed visible so admins can filter them; only drop cancelled.
        $excludedStatuses = ['cancelled', 'canceled'];

        $query = InvestmentProject::query()
            ->whereNotIn('status', $excludedStatuses)
            ->with([
                'documents',
                'investments' => fn ($q) => $q->with('investor:id,name,email')->latest('invested_at'),
            ])
            ->latest();

        if ($type = $request->input('project_type')) {
            $query->where('type', $type);
        } elseif ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%")
                    ->orWhere('commodity', 'like', "%{$search}%")
                    ->orWhere('vessel', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($this->perPage($request));
        $paginator->setCollection(
            $paginator->getCollection()->map(function (InvestmentProject $project) {
                $capacity = InvestmentCapacity::snapshot($project);

                return [
                    'project' => (new InvestmentProjectResource($project))->resolve(),
                    'investments' => $project->investments->map(fn (Investment $investment) => [
                        'id' => $investment->id,
                        'reference' => $investment->reference ?: 'INV-'.$investment->id,
                        'amount' => (float) $investment->amount,
                        'status' => $investment->status,
                        'invested_at' => $investment->invested_at?->toIso8601String(),
                        'approved_at' => $investment->approved_at?->toIso8601String(),
                        'investor' => [
                            'id' => $investment->investor?->id,
                            'name' => $investment->investor?->name,
                            'email' => $investment->investor?->email,
                        ],
                    ])->values(),
                    'capacity' => $capacity,
                ];
            })
        );

        return response()->json($paginator);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        if (array_key_exists('image_url', $data)) {
            $data['image_url'] = MediaPath::normalize($data['image_url']);
        }
        if (empty($data['status']) && strtolower((string) ($data['type'] ?? 'container')) === 'container') {
            $data['status'] = 'funding';
        }
        if (empty($data['status']) && in_array(strtolower((string) ($data['type'] ?? '')), ['plant', 'ricemill', 'feed', 'produce'], true)) {
            $data['status'] = 'funding';
        }
        if (strtolower((string) ($data['type'] ?? 'container')) === 'container' && empty($data['trade_direction'])) {
            $data['trade_direction'] = 'export';
        }
        $project = InvestmentProject::create([
            ...$data,
            'raised_amount' => $data['raised_amount'] ?? 0,
            'investors_count' => $data['investors_count'] ?? 0,
        ]);

        ProjectReferenceGenerator::assign($project);

        AuditsActions::log('investment_project.created', 'investments', $request->user(), [
            'project_id' => $project->id,
        ]);

        return response()->json([
            'message' => 'Project created.',
            'data' => new InvestmentProjectResource($project->load('documents')),
        ], 201);
    }

    public function show(int $id): InvestmentProjectResource
    {
        return new InvestmentProjectResource(
            InvestmentProject::query()->with(['investments', 'documents'])->findOrFail($id)
        );
    }

    public function detail(int $id): JsonResponse
    {
        $project = InvestmentProject::query()
            ->with(['documents', 'investments' => fn ($q) => $q->with([
                'investor:id,name,email',
                'investor.profile:id,user_id,country',
                'investor.wallet:id,user_id,currency',
            ])->latest('invested_at')])
            ->findOrFail($id);

        $capacity = InvestmentCapacity::snapshot($project);

        return response()->json([
            'data' => [
                'project' => (new InvestmentProjectResource($project))->resolve(),
                'stats' => [
                    'target_amount' => $capacity['target_amount'],
                    'raised_amount' => $capacity['active_raised'],
                    'pending_reserved' => $capacity['pending_reserved'],
                    'remaining_amount' => $capacity['remaining_capacity'],
                    'investors_count' => $capacity['eligible_investors_count'],
                    'pending_count' => $capacity['pending_count'],
                    'is_full' => $capacity['is_full'],
                    'slots_remaining' => $capacity['slots_remaining'],
                ],
                'investments' => InvestmentResource::collection($project->investments)->resolve(),
            ],
        ]);
    }

    public function approveInvestment(Request $request, int $id, int $investmentId): JsonResponse
    {
        $investment = Investment::query()
            ->where('project_id', $id)
            ->whereKey($investmentId)
            ->firstOrFail();

        $result = $this->reviewService->approve($investment)->load('investor:id,name,email');

        AuditsActions::log('investment.approved', 'investments', $request->user(), [
            'project_id' => $id,
            'investment_id' => $investmentId,
        ]);

        $project = InvestmentProject::query()->find($id);
        $investor = $result->investor;
        if ($investor) {
            $ref = $result->reference ?: 'INV-'.$result->id;
            NotifiesUsers::notifyAndEmail(
                $investor,
                InvestorNotificationTypes::INVESTMENT,
                'Investment approved — '.$ref,
                'Your investment in '.($project?->title ?? 'the project').' has been approved.',
                ['investment_id' => $result->id, 'href' => '/invest/containers'],
                'investment_approved',
                [
                    'reference' => $ref,
                    'amount' => number_format((float) $result->amount, 2),
                    'currency' => strtoupper($project?->currency ?? 'USD'),
                    'project_name' => $project?->title ?? 'Investment Project',
                    'portal_url' => config('app.frontend_url', config('app.url')).'/invest/containers',
                ]
            );
        }

        return response()->json([
            'message' => 'Investment approved.',
            'data' => new InvestmentResource($result),
            'stats' => InvestmentCapacity::snapshot(InvestmentProject::query()->findOrFail($id)),
        ]);
    }

    public function rejectInvestment(Request $request, int $id, int $investmentId): JsonResponse
    {
        $investment = Investment::query()
            ->where('project_id', $id)
            ->whereKey($investmentId)
            ->firstOrFail();

        $result = $this->reviewService->reject($investment)->load('investor:id,name,email');

        AuditsActions::log('investment.rejected', 'investments', $request->user(), [
            'project_id' => $id,
            'investment_id' => $investmentId,
        ]);

        $project = InvestmentProject::query()->find($id);
        $investor = $result->investor;
        if ($investor) {
            $ref = $result->reference ?: 'INV-'.$result->id;
            NotifiesUsers::notifyAndEmail(
                $investor,
                InvestorNotificationTypes::INVESTMENT,
                'Investment not approved — '.$ref,
                'Your investment in '.($project?->title ?? 'the project').' was not approved. Funds returned to wallet.',
                ['investment_id' => $result->id, 'href' => '/invest/containers'],
                'investment_rejected',
                [
                    'reference' => $ref,
                    'amount' => number_format((float) $result->amount, 2),
                    'currency' => strtoupper($project?->currency ?? 'USD'),
                    'project_name' => $project?->title ?? 'Investment Project',
                    'notes' => $request->input('note') ?? '',
                ]
            );
        }

        return response()->json([
            'message' => 'Investment rejected and wallet refunded.',
            'data' => new InvestmentResource($result),
            'stats' => InvestmentCapacity::snapshot(InvestmentProject::query()->findOrFail($id)),
        ]);
    }

    public function approveNextInvestment(Request $request, int $id): JsonResponse
    {
        $next = Investment::query()
            ->where('project_id', $id)
            ->where('status', 'pending')
            ->orderBy('invested_at')
            ->orderBy('id')
            ->first();

        if (! $next) {
            return response()->json([
                'message' => 'No pending investments to approve.',
                'data' => null,
            ], 404);
        }

        $project = InvestmentProject::query()->findOrFail($id);
        $capacity = InvestmentCapacity::snapshot($project);
        $remainingForApprove = max(0, (float) $project->target_amount - $capacity['active_raised']);

        if ((float) $next->amount > $remainingForApprove + 0.0001) {
            throw ValidationException::withMessages([
                'investment' => ['Next pending investment exceeds remaining capacity. Reject it or increase target.'],
            ]);
        }

        return $this->approveInvestment($request, $id, $next->id);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $project = InvestmentProject::query()->findOrFail($id);
        $previous = $project->only([
            'status',
            'current_project_stage',
            'eta',
            'etd',
            'vessel',
        ]);

        $data = $this->validated($request, true);
        if (array_key_exists('image_url', $data)) {
            $data['image_url'] = MediaPath::normalize($data['image_url']);
        }
        if (isset($data['meta']) && is_array($data['meta'])) {
            $existingMeta = is_array($project->meta) ? $project->meta : [];
            $data['meta'] = array_merge($existingMeta, $data['meta']);
        }

        $effectiveType = strtolower((string) ($data['type'] ?? $project->type ?? 'container'));
        if ($effectiveType === 'container' && array_key_exists('trade_direction', $data) && empty($data['trade_direction'])) {
            $data['trade_direction'] = 'export';
        }

        if (array_key_exists('target_amount', $data)) {
            $newTarget = (float) $data['target_amount'];
            $activeRaised = InvestmentCapacity::snapshot($project)['active_raised'];

            if ($newTarget < $activeRaised - 0.0001) {
                throw ValidationException::withMessages([
                    'target_amount' => [
                        'Cannot set target below already raised amount ($'.number_format($activeRaised, 2, '.', '').').',
                    ],
                ]);
            }
        }

        $project->update($data);
        $project->refresh();

        $settlement = null;
        $previousStatus = (string) ($previous['status'] ?? '');
        $newStatus = (string) $project->status;
        $settlementStatuses = ['settled', 'completed'];

        if (! in_array($previousStatus, $settlementStatuses, true)
            && in_array($newStatus, $settlementStatuses, true)
        ) {
            $beforeIds = InvestmentProfitDistribution::query()
                ->where('project_id', $project->id)
                ->pluck('id')
                ->all();

            $this->completeProjectInvestments($project);

            $newRows = InvestmentProfitDistribution::query()
                ->where('project_id', $project->id)
                ->when($beforeIds !== [], fn ($q) => $q->whereNotIn('id', $beforeIds))
                ->get();

            // If idempotent re-settle, report existing distributions for this project
            if ($newRows->isEmpty()) {
                $newRows = InvestmentProfitDistribution::query()
                    ->where('project_id', $project->id)
                    ->get();
            }

            $settlement = [
                'settled_count' => $newRows->count(),
                'principal' => round((float) $newRows->sum('invested_amount'), 2),
                'profit' => round((float) $newRows->sum('profit_amount'), 2),
                'total_return' => round((float) $newRows->sum('total_return'), 2),
                'settlement_date' => now()->toIso8601String(),
            ];
        }

        $this->notifyProjectInvestorsOfUpdate($project, $previous);

        AuditsActions::log('investment_project.updated', 'investments', $request->user(), [
            'project_id' => $project->id,
        ]);

        $payload = [
            'message' => 'Project updated.',
            'data' => new InvestmentProjectResource($project->fresh()->load('documents')),
        ];

        if ($settlement !== null) {
            $payload['settlement'] = $settlement;
        }

        return response()->json($payload);
    }

    private function completeProjectInvestments(InvestmentProject $project): void
    {
        $this->reviewService->completeAllActiveForProject($project);
    }

    /**
     * @param  array<string, mixed>  $previous
     */
    private function notifyProjectInvestorsOfUpdate(InvestmentProject $project, array $previous): void
    {
        $tracked = ['status', 'current_project_stage', 'eta', 'etd', 'vessel'];
        $changes = [];

        foreach ($tracked as $field) {
            $old = $previous[$field] ?? null;
            $new = $project->{$field};
            if ((string) $old !== (string) $new && filled($new)) {
                $changes[$field] = $new;
            }
        }

        if ($changes === []) {
            return;
        }

        $investors = Investment::query()
            ->where('project_id', $project->id)
            ->with('investor')
            ->get()
            ->pluck('investor')
            ->filter()
            ->unique('id')
            ->values();

        if ($investors->isEmpty()) {
            return;
        }

        $statusChanged = isset($changes['status']);
        $type = $statusChanged && in_array($changes['status'], [
            'investment_confirmed', 'cargo_loaded', 'in_transit', 'custom_clearance', 'settled',
            'ready_to_ship', 'shipping', 'customs', 'completed',
        ], true)
            ? InvestorNotificationTypes::SHIPMENT_UPDATE
            : InvestorNotificationTypes::UPDATE;

        $title = $statusChanged
            ? "Project update — {$project->title}"
            : "Investment update — {$project->title}";

        $parts = [];
        if (isset($changes['status'])) {
            $parts[] = 'Status: '.ucfirst(str_replace('_', ' ', (string) $changes['status']));
        }
        if (isset($changes['current_project_stage'])) {
            $parts[] = 'Stage: '.$changes['current_project_stage'];
        }
        if (isset($changes['vessel'])) {
            $parts[] = 'Vessel: '.$changes['vessel'];
        }
        if (isset($changes['eta'])) {
            $parts[] = 'ETA: '.$changes['eta'];
        }

        $body = implode('. ', $parts).'.';

        $isContainer = (string) $project->type === 'container';
        $emailSlug = $isContainer ? 'container_status_update' : 'project_status_update';
        $portalPath = $isContainer ? '/invest/containers' : '/invest/dashboard';
        $statusLabel = isset($changes['status'])
            ? ucfirst(str_replace('_', ' ', (string) $changes['status']))
            : 'Updated';
        $stageLabel = (string) ($changes['current_project_stage'] ?? $project->current_project_stage ?? '—');

        NotifiesUsers::notifyManyAndEmail(
            $investors,
            $type,
            $title,
            $body,
            [
                'project_id' => $project->id,
                'href' => $portalPath,
            ],
            $emailSlug,
            [
                'container_name' => $project->title,
                'project_name' => $project->title,
                'status' => $statusLabel,
                'stage' => $stageLabel,
                'details' => $body,
                'portal_url' => config('app.frontend_url', config('app.url')).$portalPath,
            ]
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        InvestmentProject::query()->findOrFail($id)->delete();

        AuditsActions::log('investment_project.deleted', 'investments', $request->user(), [
            'project_id' => $id,
        ]);

        return response()->json(['message' => 'Project deleted.']);
    }

    public function stats(): JsonResponse
    {
        $portfolio = InvestmentCapacity::portfolioTotals();

        $pendingDeposits = Deposit::query()->where('status', 'pending')->count();
        $pendingWithdrawals = Withdrawal::query()->whereIn('status', ['pending', 'review'])->count();

        $start = now()->startOfMonth()->subMonths(11);
        $monthExpr = $this->monthBucketExpression('COALESCE(invested_at, created_at)');

        $monthlyRaised = Investment::query()
            ->whereIn('status', ['active', 'completed'])
            ->where(function ($q) use ($start) {
                $q->where('invested_at', '>=', $start)
                    ->orWhere(function ($q2) use ($start) {
                        $q2->whereNull('invested_at')->where('created_at', '>=', $start);
                    });
            })
            ->select(
                DB::raw("{$monthExpr} as ym"),
                DB::raw('SUM(amount) as total')
            )
            ->groupBy('ym')
            ->pluck('total', 'ym');

        $priorRaised = (float) Investment::query()
            ->whereIn('status', ['active', 'completed'])
            ->where(function ($q) use ($start) {
                $q->where('invested_at', '<', $start)
                    ->orWhere(function ($q2) use ($start) {
                        $q2->whereNull('invested_at')->where('created_at', '<', $start);
                    });
            })
            ->sum('amount');

        $growthTrend = [];
        $cumulative = $priorRaised;
        for ($i = 0; $i < 12; $i++) {
            $month = $start->copy()->addMonths($i);
            $key = $month->format('Y-m');
            $cumulative += (float) ($monthlyRaised[$key] ?? 0);
            $growthTrend[] = [
                'month' => $month->format('M'),
                'amount' => round($cumulative, 2),
            ];
        }

        return response()->json([
            'data' => [
                'growth_trend' => $growthTrend,
                'totals' => [
                    'total_raised' => $portfolio['total_raised'],
                    'active_projects' => $portfolio['active_projects'],
                    'pending_deposits' => $pendingDeposits,
                    'pending_withdrawals' => $pendingWithdrawals,
                    'total_investors' => $portfolio['total_investors'],
                    'container_count' => $portfolio['container_count'],
                    'produce_count' => $portfolio['produce_count'],
                    'plant_count' => $portfolio['plant_count'],
                    'ricemill_count' => $portfolio['ricemill_count'],
                    'feed_count' => $portfolio['feed_count'],
                ],
            ],
        ]);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'project_id' => ['nullable', 'integer', 'min:1'],
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:8192'],
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('image');
        $projectId = $request->input('project_id') ? (int) $request->input('project_id') : null;
        $stored = MediaStorage::store($file, 'investmentproject', $projectId, $request->user());

        if ($projectId) {
            InvestmentProject::query()->findOrFail($projectId)
                ->update(['image_url' => $stored['path']]);
        }

        AuditsActions::log('investment_project.image_uploaded', 'investments', $request->user(), [
            'path' => $stored['path'],
            'title' => $request->input('title'),
        ]);

        return response()->json([
            'message' => 'Image uploaded.',
            'data' => [
                'path' => $stored['path'],
                'url' => $stored['url'],
            ],
        ], 201);
    }

    private function monthBucketExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'pgsql' => "TO_CHAR({$column}, 'YYYY-MM')",
            default => "DATE_FORMAT({$column}, '%Y-%m')",
        };
    }

    private function validated(Request $request, bool $update = false): array
    {
        $req = $update ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$req, 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'trade_direction' => ['nullable', 'string', 'in:export,import'],
            'status' => ['nullable', 'string', 'max:50'],
            'target_amount' => [$req, 'numeric', 'min:0'],
            'raised_amount' => ['nullable', 'numeric', 'min:0'],
            'investors_count' => ['nullable', 'integer', 'min:0'],
            'roi_label' => ['nullable', 'string', 'max:100'],
            'expected_return_pct' => ['nullable', 'numeric'],
            'min_investment' => ['nullable', 'numeric'],
            'max_investment' => ['nullable', 'numeric'],
            'location' => ['nullable', 'string', 'max:255'],
            'origin' => ['nullable', 'string', 'max:255'],
            'destination' => ['nullable', 'string', 'max:255'],
            'destination_country' => ['nullable', 'string', 'max:100'],
            'destination_flag' => ['nullable', 'string', 'max:20'],
            'port_of_loading' => ['nullable', 'string', 'max:255'],
            'port_of_discharge' => ['nullable', 'string', 'max:255'],
            'vessel' => ['nullable', 'string', 'max:255'],
            'shipping_line' => ['nullable', 'string', 'max:255'],
            'commodity' => ['nullable', 'string', 'max:255'],
            'variety' => ['nullable', 'string', 'max:255'],
            'container_type' => ['nullable', 'string', 'max:100'],
            'incoterm' => ['nullable', 'string', 'max:50'],
            'payment_terms' => ['nullable', 'string', 'max:255'],
            'current_project_stage' => ['nullable', 'string', 'max:100'],
            'etd' => ['nullable', 'date'],
            'eta' => ['nullable', 'date'],
            'funding_deadline' => ['nullable', 'date'],
            'image_url' => ['nullable', 'string', 'max:1000'],
            'description' => ['nullable', 'string'],
            'risk_level' => ['nullable', 'string', 'max:50'],
            'investment_period_days' => ['nullable', 'integer'],
            'container_value' => ['nullable', 'numeric'],
            'meta' => ['nullable', 'array'],
            'meta.container_no' => ['nullable', 'string', 'max:100'],
        ]);
    }
}
