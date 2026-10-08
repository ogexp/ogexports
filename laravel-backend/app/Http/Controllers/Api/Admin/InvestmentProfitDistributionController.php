<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\Investment;
use App\Models\InvestmentPayoutProgress;
use App\Models\InvestmentProfitDistribution;
use App\Support\AuditsActions;
use App\Support\FinancialTransactionIdResolver;
use App\Support\InvestorNotificationTypes;
use App\Support\InvestorPushBridge;
use App\Support\NotifiesUsers;
use App\Support\UserDisplayCurrency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvestmentProfitDistributionController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = InvestmentProfitDistribution::query()
            ->with([
                'investment:id,reference,status',
                'investment.payoutProgress',
                'project:id,title,type',
                'investor:id,name,email',
            ]);

        if ($projectType = $request->input('project_type')) {
            $query->where('project_type', $projectType);
        }

        if ($projectId = $request->input('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($investorId = $request->input('investor_id')) {
            $query->where('investor_id', $investorId);
        }

        if ($investmentId = $request->input('investment_id')) {
            if (is_scalar($investmentId) && ctype_digit((string) $investmentId)) {
                $investmentId = FinancialTransactionIdResolver::resolveId(
                    Investment::query(),
                    (int) $investmentId,
                );
            }

            $query->where('investment_id', $investmentId);
        }

        $paginator = $query->latest('distributed_at')->paginate($this->perPage($request));

        $paginator->setCollection(
            $paginator->getCollection()->map(fn (InvestmentProfitDistribution $row) => [
                'id' => $row->id,
                'investment_id' => $row->investment_id,
                'investment_reference' => $row->investment?->reference,
                'project_id' => $row->project_id,
                'project_title' => $row->project?->title,
                'project_type' => $row->project_type,
                'investor_id' => $row->investor_id,
                'investor_name' => $row->investor?->name,
                'investor_email' => $row->investor?->email,
                'invested_amount' => (float) $row->invested_amount,
                'profit_amount' => (float) $row->profit_amount,
                'total_return' => (float) $row->total_return,
                'roi_pct' => (float) $row->roi_pct,
                'wallet_transaction_id' => $row->wallet_transaction_id,
                'distributed_at' => $row->distributed_at?->toIso8601String(),
                'distribution_status' => $row->isConfirmed()
                    ? InvestmentProfitDistribution::STATUS_DISTRIBUTED
                    : $row->investment?->payoutProgress?->status,
                'planned_distribution_date' => $row->investment?->payoutProgress?->planned_distribution_date?->toDateString(),
            ])
        );

        return response()->json($paginator);
    }

    public function payoutProgressIndex(Request $request): JsonResponse
    {
        $query = Investment::query()
            ->with([
                'project:id,title,type',
                'investor:id,name,email',
                'investor.profile:id,user_id,country',
                'investor.wallet:id,user_id,currency',
                'profitDistribution',
                'payoutProgress',
            ])
            ->where(function ($investment) {
                $investment
                    ->where('status', 'active')
                    ->orWhere(function ($completed) {
                        $completed
                            ->where('status', 'completed')
                            ->whereHas('profitDistribution', fn ($distribution) => $distribution->whereNotNull('distributed_at'));
                    });
            });

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('reference', 'like', '%'.$search.'%')
                    ->orWhereHas('investor', fn ($investor) => $investor
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%'))
                    ->orWhereHas('project', fn ($project) => $project
                        ->where('title', 'like', '%'.$search.'%'));
            });
        }

        if ($projectType = $request->input('project_type')) {
            $query->whereHas('project', fn ($project) => $project->where('type', $projectType));
        }

        $paginator = $query
            ->latest('invested_at')
            ->latest('id')
            ->paginate($this->perPage($request));

        $paginator->setCollection(
            $paginator->getCollection()->map(function (Investment $investment) {
                $distribution = $investment->profitDistribution;
                $confirmed = $distribution?->isConfirmed() ?? false;

                return [
                    'id' => $investment->id,
                    'investment_id' => $investment->id,
                    'investment_reference' => $investment->reference,
                    'investment_status' => $investment->status,
                    'project_id' => $investment->project_id,
                    'project_title' => $investment->project?->title,
                    'project_type' => $investment->project?->type,
                    'investor_id' => $investment->investor_id,
                    'investor_name' => $investment->investor?->name,
                    'investor_email' => $investment->investor?->email,
                    'invested_amount' => (float) $investment->amount,
                    'amount_currency' => $investment->amount_currency
                        ?: UserDisplayCurrency::currencyForUser($investment->investor),
                    'profit_amount' => $confirmed ? (float) $distribution->profit_amount : null,
                    'total_return' => $confirmed ? (float) $distribution->total_return : null,
                    'payout_status' => $confirmed
                        ? InvestmentProfitDistribution::STATUS_DISTRIBUTED
                        : $investment->payoutProgress?->status,
                    'planned_distribution_date' => $investment->payoutProgress?->planned_distribution_date?->toDateString(),
                    'distributed_at' => $distribution?->distributed_at?->toIso8601String(),
                ];
            })
        );

        return response()->json($paginator);
    }

    public function updatePayoutProgress(Request $request, int $investmentId): JsonResponse
    {
        $data = $request->validate([
            'status' => ['present', 'nullable', 'in:scheduled,processing'],
            'planned_distribution_date' => ['present', 'nullable', 'date'],
        ]);

        if ($data['planned_distribution_date'] && ! $data['status']) {
            throw ValidationException::withMessages([
                'status' => ['Choose Scheduled or Processing before setting a planned payout date.'],
            ]);
        }

        [$investment, $progressChanged] = DB::transaction(function () use ($data, $investmentId) {
            $investment = FinancialTransactionIdResolver::findOrFail(
                Investment::query()->with('profitDistribution')->lockForUpdate(),
                $investmentId,
            );

            if ($investment->profitDistribution?->isConfirmed()) {
                throw ValidationException::withMessages([
                    'status' => ['A confirmed distribution cannot be changed to a pre-payment status.'],
                ]);
            }

            if ($investment->status !== 'active') {
                throw ValidationException::withMessages([
                    'status' => ['Payout progress can only be set for active investments.'],
                ]);
            }

            $existingProgress = InvestmentPayoutProgress::query()
                ->where('investment_id', $investment->id)
                ->lockForUpdate()
                ->first();
            $plannedDate = $data['planned_distribution_date'] ?: null;
            $progressChanged = $data['status'] !== null && (
                ! $existingProgress
                || $existingProgress->status !== $data['status']
                || $existingProgress->planned_distribution_date?->toDateString() !== $plannedDate
            );

            if (! $data['status']) {
                InvestmentPayoutProgress::query()
                    ->where('investment_id', $investment->id)
                    ->delete();
            } else {
                InvestmentPayoutProgress::query()->updateOrCreate(
                    ['investment_id' => $investment->id],
                    [
                        'status' => $data['status'],
                        'planned_distribution_date' => $data['planned_distribution_date'],
                    ]
                );
            }

            return [
                $investment->fresh(['project', 'investor', 'profitDistribution', 'payoutProgress']),
                $progressChanged,
            ];
        });

        AuditsActions::log('investment.payout_progress_updated', 'investments', $request->user(), [
            'investment_id' => $investment->id,
            'payout_status' => $investment->payoutProgress?->status,
            'planned_distribution_date' => $investment->payoutProgress?->planned_distribution_date?->toDateString(),
        ]);

        $distribution = $investment->profitDistribution;
        $confirmed = $distribution?->isConfirmed() ?? false;

        if ($progressChanged && $investment->investor && $investment->payoutProgress) {
            $status = $investment->payoutProgress->status;
            $statusLabel = $status === InvestmentPayoutProgress::STATUS_SCHEDULED
                ? 'Scheduled'
                : 'Processing';
            $plannedDate = $investment->payoutProgress->planned_distribution_date?->toDateString();
            $dateSentence = $plannedDate
                ? " The planned date is {$plannedDate}."
                : '';
            $body = $status === InvestmentPayoutProgress::STATUS_SCHEDULED
                ? "Your payout for investment {$investment->reference} is scheduled.{$dateSentence} This planned date is not proof that payment has been completed."
                : "An administrator has marked the payout for investment {$investment->reference} as processing.{$dateSentence} This update does not confirm that payment has been completed.";
            $title = "Payout update: {$statusLabel}";
            $portalPath = "/position/{$investment->id}";

            NotifiesUsers::notifyAndEmail(
                $investment->investor,
                InvestorNotificationTypes::PAYOUT_PROGRESS,
                $title,
                $body,
                [
                    'investment_id' => $investment->id,
                    'payout_status' => $status,
                    'planned_distribution_date' => $plannedDate,
                    'href' => $portalPath,
                ],
                'investment_payout_progress',
                [
                    'reference' => $investment->reference ?: (string) $investment->id,
                    'project_name' => $investment->project?->title ?? 'your investment',
                    'status' => strtolower($statusLabel),
                    'planned_date' => $plannedDate ?: 'Not provided',
                    'details' => $body,
                    'portal_url' => config('app.frontend_url', config('app.url')).$portalPath,
                ]
            );

            InvestorPushBridge::sendPayoutProgress($investment);
        }

        return response()->json([
            'data' => [
                'investment_id' => $investment->id,
                'payout_status' => $confirmed
                    ? InvestmentProfitDistribution::STATUS_DISTRIBUTED
                    : $investment->payoutProgress?->status,
                'planned_distribution_date' => $investment->payoutProgress?->planned_distribution_date?->toDateString(),
                'distributed_at' => $distribution?->distributed_at?->toIso8601String(),
            ],
        ]);
    }
}
