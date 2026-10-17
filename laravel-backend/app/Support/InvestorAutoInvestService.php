<?php

namespace App\Support;

use App\Models\InvestmentProject;
use App\Models\InvestorAutoInvestExecution;
use App\Models\InvestorAutoInvestSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

final class InvestorAutoInvestService
{
    public function processNewFundingProject(int $projectId): void
    {
        $project = InvestmentProject::query()->find($projectId);
        if (! $project || strtolower((string) $project->type) !== 'container'
            || ! in_array(strtolower((string) $project->status), ContainerProjectStatus::investableStatuses(), true)
            || blank($project->commodity) || blank($project->container_type)) {
            return;
        }

        $settings = InvestorAutoInvestSetting::query()
            ->with('user.profile')
            ->where('enabled', true)
            ->whereRaw('LOWER(commodity) = ?', [mb_strtolower(trim((string) $project->commodity))])
            ->whereRaw('LOWER(container_type) = ?', [mb_strtolower(trim((string) $project->container_type))])
            ->get();

        foreach ($settings as $setting) {
            $execution = InvestorAutoInvestExecution::query()->firstOrCreate(
                ['user_id' => $setting->user_id, 'project_id' => $project->id],
                ['status' => 'processing', 'amount' => $setting->amount],
            );
            if (! $execution->wasRecentlyCreated) continue;

            try {
                KycGate::ensureApproved($setting->user);
                if (UserDisplayCurrency::currencyForUser($setting->user) !== 'USD') {
                    throw ValidationException::withMessages(['wallet' => ['Auto-invest requires a confirmed USD wallet.']]);
                }
                $result = app(WalletInvestmentService::class)->investFromWallet(
                    $setting->user,
                    $project,
                    (float) $setting->amount,
                );
                $execution->update([
                    'status' => 'invested',
                    'investment_id' => $result['investment']->id,
                    'message' => 'Investment placed automatically.',
                ]);
                try {
                    NotifiesUsers::notify(
                        $setting->user,
                        InvestorNotificationTypes::INVESTMENT,
                        'Auto-invest completed',
                        'Your saved auto-invest rule placed an investment in '.($project->title ?: 'a new container opportunity').'.',
                        ['investment_id' => $result['investment']->id, 'href' => '/invest/positions/'.$result['investment']->id],
                    );
                } catch (Throwable $notificationError) {
                    Log::warning('Auto-invest completed but its investor notification could not be created.', [
                        'user_id' => $setting->user_id,
                        'project_id' => $project->id,
                        'error' => $notificationError->getMessage(),
                    ]);
                }
            } catch (Throwable $error) {
                $execution->update([
                    'status' => 'skipped',
                    'message' => 'Not placed: '.mb_substr($error->getMessage(), 0, 450),
                ]);
                Log::info('Investor auto-invest skipped for a new opportunity.', [
                    'user_id' => $setting->user_id,
                    'project_id' => $project->id,
                ]);
            }
        }
    }
}
