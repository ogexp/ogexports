<?php

namespace App\Support;

use App\Models\Investment;
use App\Models\InvestmentProfitDistribution;
use App\Models\InvestmentProject;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\InvestmentActivation;
use App\Support\InvestmentCapacity;
use App\Support\InvestorMarket;
use App\Support\PlatformWalletService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvestmentReviewService
{
    public function approve(Investment $investment): Investment
    {
        return DB::transaction(function () use ($investment) {
            $project = InvestmentProject::query()
                ->whereKey($investment->project_id)
                ->lockForUpdate()
                ->firstOrFail();

            $investment = Investment::query()
                ->whereKey($investment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($investment->status !== 'pending') {
                throw ValidationException::withMessages([
                    'investment' => ['Only pending investments can be approved.'],
                ]);
            }

            $amount = (float) $investment->amount;
            $walletAmount = $investment->amount_pkr !== null
                ? (float) $investment->amount_pkr
                : $amount;
            $capacity = InvestmentCapacity::snapshot($project);
            $remainingForApprove = max(0, (float) $project->target_amount - $capacity['active_raised']);

            if ($amount > $remainingForApprove + 0.0001) {
                throw ValidationException::withMessages([
                    'investment' => ['Insufficient remaining capacity to approve this investment.'],
                ]);
            }

            $wallet = Wallet::query()
                ->where('user_id', $investment->investor_id)
                ->lockForUpdate()
                ->first();

            if ($wallet) {
                $wallet->decrement('pending_balance', min((float) $wallet->pending_balance, $walletAmount));
            }

            $oldRef = $investment->reference ?: 'INV-'.$investment->id;

            $investment->setRelation('project', $project);
            $investment = InvestmentReferenceGenerator::assign($investment);
            $ref = (string) $investment->reference;

            WalletTransaction::query()
                ->whereIn('reference', array_values(array_unique([$oldRef, $ref, 'INV-'.$investment->id])))
                ->where('type', 'investment')
                ->where('status', 'pending')
                ->update(['status' => 'completed', 'reference' => $ref]);

            $investment->update([
                'status' => 'active',
                'approved_at' => now(),
                'reference' => $ref,
            ]);

            InvestmentActivation::applyToProject($project, $investment);

            return $investment->fresh();
        });
    }

    public function reject(Investment $investment): Investment
    {
        return DB::transaction(function () use ($investment) {
            InvestmentProject::query()
                ->whereKey($investment->project_id)
                ->lockForUpdate()
                ->firstOrFail();

            $investment = Investment::query()
                ->whereKey($investment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($investment->status !== 'pending') {
                throw ValidationException::withMessages([
                    'investment' => ['Only pending investments can be rejected.'],
                ]);
            }

            $amount = (float) $investment->amount;
            $walletAmount = $investment->amount_pkr !== null
                ? (float) $investment->amount_pkr
                : $amount;

            $wallet = Wallet::query()
                ->where('user_id', $investment->investor_id)
                ->lockForUpdate()
                ->first();

            if ($wallet) {
                $wallet->decrement('pending_balance', min((float) $wallet->pending_balance, $walletAmount));
                $wallet->increment('available_balance', $walletAmount);
            }

            WalletTransaction::query()
                ->where('reference', $investment->reference ?: 'INV-'.$investment->id)
                ->where('type', 'investment')
                ->where('status', 'pending')
                ->update(['status' => 'rejected']);

            $investment->update(['status' => 'cancelled']);

            return $investment->fresh();
        });
    }

    public function complete(Investment $investment): Investment
    {
        return DB::transaction(function () use ($investment) {
            $project = InvestmentProject::query()
                ->whereKey($investment->project_id)
                ->lockForUpdate()
                ->firstOrFail();

            $investment = Investment::query()
                ->whereKey($investment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($investment->status === 'completed') {
                return $investment;
            }

            if ($investment->status !== 'active') {
                throw ValidationException::withMessages([
                    'investment' => ['Only active investments can be marked completed.'],
                ]);
            }

            if (InvestmentProfitDistribution::query()->where('investment_id', $investment->id)->exists()) {
                $investment->update(['status' => 'completed']);

                return $investment->fresh();
            }

            $investedAmount = (float) $investment->amount;
            $investedAmountPkr = $investment->amount_pkr !== null ? (float) $investment->amount_pkr : null;
            $roiPct = (float) ($project->expected_return_pct ?: 0);
            $profit = round($investedAmount * ($roiPct / 100), 2);
            $profitPkr = $investedAmountPkr !== null
                ? round($investedAmountPkr * ($roiPct / 100), 2)
                : null;
            $totalReturnUsd = round($investedAmount + $profit, 2);
            $totalReturnWallet = $investedAmountPkr !== null && $profitPkr !== null
                ? round($investedAmountPkr + $profitPkr, 2)
                : $totalReturnUsd;
            $ref = $investment->reference ?: 'INV-'.$investment->id;

            $investment->update([
                'status' => 'completed',
                'profit_amount' => $profit,
                'profit_amount_pkr' => $profitPkr,
            ]);

            $wallet = Wallet::query()
                ->where('user_id', $investment->investor_id)
                ->lockForUpdate()
                ->first();

            $investment->loadMissing('investor');

            if (! $wallet) {
                $wallet = Wallet::query()->create([
                    'user_id' => $investment->investor_id,
                    'currency' => InvestorMarket::currencyForUser($investment->investor),
                    'available_balance' => 0,
                    'pending_balance' => 0,
                ]);
            }

            $walletCurrency = $wallet->currency ?: InvestorMarket::currencyForUser($investment->investor);

            $platformTx = PlatformWalletService::debit(
                $totalReturnWallet,
                'investment_return_out',
                $ref.'-return',
                [
                    'investment_id' => $investment->id,
                    'project_id' => $project->id,
                    'investor_id' => $investment->investor_id,
                    'invested_amount' => $investedAmount,
                    'invested_amount_pkr' => $investedAmountPkr,
                    'profit_amount' => $profit,
                    'profit_amount_pkr' => $profitPkr,
                ],
                $walletCurrency,
            );

            $wallet->increment('available_balance', $totalReturnWallet);

            $walletTx = WalletTransaction::query()->create([
                'wallet_id' => $wallet->id,
                'type' => 'investment_return',
                'amount' => $totalReturnWallet,
                'direction' => 'credit',
                'reference' => $ref,
                'status' => 'completed',
                'meta' => [
                    'investment_id' => $investment->id,
                    'project_id' => $project->id,
                    'project_type' => $project->type,
                    'project_title' => $project->title,
                    'invested_amount' => $investedAmount,
                    'invested_amount_pkr' => $investedAmountPkr,
                    'profit_amount' => $profit,
                    'profit_amount_pkr' => $profitPkr,
                    'roi_pct' => $roiPct,
                    'platform_wallet_transaction_id' => $platformTx->id,
                ],
            ]);

            InvestmentProfitDistribution::query()->create([
                'investment_id' => $investment->id,
                'project_id' => $project->id,
                'investor_id' => $investment->investor_id,
                'project_type' => (string) $project->type,
                'invested_amount' => $investedAmount,
                'invested_amount_pkr' => $investedAmountPkr,
                'profit_amount' => $profit,
                'profit_amount_pkr' => $profitPkr,
                'total_return' => $totalReturnUsd,
                'roi_pct' => $roiPct,
                'wallet_transaction_id' => $walletTx->id,
                'distributed_at' => now(),
            ]);

            $investment->loadMissing('investor');
            if ($investment->investor) {
                $returnLabel = $investedAmountPkr !== null
                    ? 'PKR '.number_format($totalReturnWallet, 2).' ($'.number_format($totalReturnUsd, 2).')'
                    : '$'.number_format($totalReturnUsd, 2);
                NotifiesUsers::notifyAndEmail(
                    $investment->investor,
                    InvestorNotificationTypes::INVESTMENT,
                    'Investment completed — '.$ref,
                    'Your investment in '.$project->title.' has completed. '.$returnLabel.' (principal + profit) credited to your wallet.',
                    ['investment_id' => $investment->id, 'href' => '/invest/dashboard'],
                    'investment_completed',
                    [
                        'reference' => $ref,
                        'invested_amount' => number_format($investedAmount, 2),
                        'profit_amount' => number_format($profit, 2),
                        'total_return' => number_format($totalReturnUsd, 2),
                        'project_name' => $project->title,
                        'project_type' => $project->type,
                    ]
                );
            }

            return $investment->fresh();
        });
    }

    /**
     * Complete all active investments on a project (idempotent per investment).
     */
    public function completeAllActiveForProject(InvestmentProject $project): void
    {
        Investment::query()
            ->where('project_id', $project->id)
            ->where('status', 'active')
            ->each(function (Investment $investment) {
                $this->complete($investment);
            });
    }

    /**
     * @param  'pending'|'active'|'completed'|'cancelled'  $targetStatus
     */
    public function transition(Investment $investment, string $targetStatus): Investment
    {
        $current = $investment->status;

        if ($current === $targetStatus) {
            return $investment;
        }

        return match ([$current, $targetStatus]) {
            ['pending', 'active'] => $this->approve($investment),
            ['pending', 'cancelled'] => $this->reject($investment),
            ['active', 'completed'] => $this->complete($investment),
            default => throw ValidationException::withMessages([
                'status' => ["Cannot transition investment from {$current} to {$targetStatus}."],
            ]),
        };
    }
}
