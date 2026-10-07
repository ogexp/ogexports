<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminProjectInvestmentResource;
use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Support\AuditsActions;
use App\Support\InvestmentCapacity;
use App\Support\InvestmentReviewService;
use App\Support\InvestorNotificationTypes;
use App\Support\NotifiesUsers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProjectInvestmentController extends Controller
{
    use PaginatesQueries;

    public function __construct(
        private readonly InvestmentReviewService $reviewService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Investment::query()
            ->with([
                'project',
                'investor:id,name,email',
                'investor.profile:id,user_id,country,avatar_url',
                'investor.wallet:id,user_id,currency',
            ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($projectId = $request->input('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($projectType = $request->input('project_type')) {
            $query->whereHas('project', fn ($q) => $q->where('type', $projectType));
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('investor', fn ($iq) => $iq
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"))
                    ->orWhereHas('project', fn ($pq) => $pq->where('title', 'like', "%{$search}%"))
                    ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        $paginator = $query->latest('invested_at')->orderByDesc('created_at')->latest('id')->paginate($this->perPage($request));
        $paginator->setCollection(
            $paginator->getCollection()->map(fn (Investment $investment) => (new AdminProjectInvestmentResource($investment))->resolve())
        );

        return response()->json($paginator);
    }

    public function show(int $id): JsonResponse
    {
        $investment = Investment::query()
            ->with([
                'project',
                'investor:id,name,email',
                'investor.profile:id,user_id,country,avatar_url',
                'investor.wallet:id,user_id,currency',
            ])
            ->findOrFail($id);

        return response()->json([
            'data' => new AdminProjectInvestmentResource($investment),
        ]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $investment = Investment::query()->findOrFail($id);
        $result = $this->reviewService->approve($investment);

        AuditsActions::log('investment.approved', 'investments', $request->user(), [
            'project_id' => $investment->project_id,
            'investment_id' => $id,
        ]);

        $this->notifyApproved($result);

        return $this->actionResponse($result, 'Investment approved.');
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $investment = Investment::query()->findOrFail($id);
        $result = $this->reviewService->reject($investment);

        AuditsActions::log('investment.rejected', 'investments', $request->user(), [
            'project_id' => $investment->project_id,
            'investment_id' => $id,
        ]);

        $this->notifyRejected($result, $request->input('note'));

        return $this->actionResponse($result, 'Investment rejected and wallet refunded.');
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'active', 'completed', 'cancelled'])],
        ]);

        $investment = Investment::query()->findOrFail($id);
        $targetStatus = $data['status'];

        if ($investment->status === $targetStatus) {
            return $this->actionResponse($investment, 'Status unchanged.');
        }

        $result = $this->reviewService->transition($investment, $targetStatus);

        $action = match ($targetStatus) {
            'active' => 'investment.approved',
            'cancelled' => 'investment.rejected',
            'completed' => 'investment.completed',
            default => 'investment.status_updated',
        };

        AuditsActions::log($action, 'investments', $request->user(), [
            'project_id' => $investment->project_id,
            'investment_id' => $id,
            'status' => $targetStatus,
        ]);

        if ($targetStatus === 'active') {
            $this->notifyApproved($result);
        } elseif ($targetStatus === 'cancelled') {
            $this->notifyRejected($result, $request->input('note'));
        } elseif ($targetStatus === 'completed') {
            $this->notifyCompleted($result);
        }

        return $this->actionResponse($result, 'Investment status updated.');
    }

    private function actionResponse(Investment $investment, string $message): JsonResponse
    {
        $investment->load([
            'project',
            'investor:id,name,email',
            'investor.profile:id,user_id,avatar_url',
        ]);

        $stats = null;
        if ($investment->project_id) {
            $project = InvestmentProject::query()->find($investment->project_id);
            if ($project) {
                $stats = InvestmentCapacity::snapshot($project);
            }
        }

        return response()->json([
            'message' => $message,
            'data' => new AdminProjectInvestmentResource($investment),
            'stats' => $stats,
        ]);
    }

    private function notifyApproved(Investment $investment): void
    {
        $investment->loadMissing('investor');
        $project = InvestmentProject::query()->find($investment->project_id);
        $investor = $investment->investor;

        if (! $investor) {
            return;
        }

        $ref = $investment->reference ?: 'INV-'.$investment->id;
        NotifiesUsers::notifyAndEmail(
            $investor,
            InvestorNotificationTypes::INVESTMENT_APPROVED,
            'Investment approved — '.$ref,
            'Your investment in '.($project?->title ?? 'the project').' has been approved.',
            [
                'investment_id' => $investment->id,
                'transaction_type' => 'investment',
                'transaction_status' => $investment->status,
                'reference' => $ref,
                'href' => '/invest/positions/'.$investment->id,
            ],
            'investment_approved',
            [
                'reference' => $ref,
                'amount' => number_format((float) $investment->amount, 2),
                'currency' => strtoupper($project?->currency ?? 'USD'),
                'project_name' => $project?->title ?? 'Investment Project',
                'portal_url' => config('app.frontend_url', config('app.url')).'/invest/positions/'.$investment->id,
            ]
        );
    }

    private function notifyRejected(Investment $investment, ?string $note): void
    {
        $investment->loadMissing('investor');
        $project = InvestmentProject::query()->find($investment->project_id);
        $investor = $investment->investor;

        if (! $investor) {
            return;
        }

        $ref = $investment->reference ?: 'INV-'.$investment->id;
        NotifiesUsers::notifyAndEmail(
            $investor,
            InvestorNotificationTypes::INVESTMENT_REJECTED,
            'Investment not approved — '.$ref,
            'Your investment in '.($project?->title ?? 'the project').' was not approved. Its server status is cancelled; review your wallet transaction history for any balance adjustment.',
            [
                'investment_id' => $investment->id,
                'transaction_type' => 'investment',
                'transaction_status' => $investment->status,
                'decision' => 'rejected',
                'reference' => $ref,
                'href' => '/invest/positions/'.$investment->id,
            ],
            'investment_rejected',
            [
                'reference' => $ref,
                'amount' => number_format((float) $investment->amount, 2),
                'currency' => strtoupper($project?->currency ?? 'USD'),
                'project_name' => $project?->title ?? 'Investment Project',
                'notes' => $note ?? '',
                'portal_url' => config('app.frontend_url', config('app.url')).'/invest/positions/'.$investment->id,
            ]
        );
    }

    private function notifyCompleted(Investment $investment): void
    {
        // Notification is sent from InvestmentReviewService::complete()
    }
}
