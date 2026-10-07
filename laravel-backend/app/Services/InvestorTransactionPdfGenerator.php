<?php

namespace App\Services;

use App\Models\Deposit;
use App\Models\Investment;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use App\Support\ContainerProjectStatus;
use App\Support\DepositReviewStatuses;
use App\Support\InvestorWithdrawalBreakdown;
use App\Support\InvestmentReferenceGenerator;
use Dompdf\Dompdf;
use Dompdf\Options;

class InvestorTransactionPdfGenerator
{
    public function walletTransaction(WalletTransaction $transaction, User $user): \Symfony\Component\HttpFoundation\Response
    {
        $transaction->loadMissing('wallet');
        $meta = is_array($transaction->meta) ? $transaction->meta : [];
        $withdrawal = $transaction->type === 'withdrawal' && is_numeric($meta['withdrawal_id'] ?? null)
            ? Withdrawal::query()
                ->where('investor_id', $user->id)
                ->find($meta['withdrawal_id'])
            : null;

        $html = view('pdf.wallet-transaction', [
            'transaction' => $transaction,
            'withdrawalBreakdown' => $withdrawal
                ? InvestorWithdrawalBreakdown::fromWithdrawal($withdrawal, $transaction)
                : null,
            'user' => $user,
            'generatedAt' => now()->format('d M Y H:i'),
        ])->render();

        $ref = $transaction->reference ?: 'TXN-'.$transaction->id;

        return $this->download($html, 'Wallet-'.preg_replace('/[^A-Za-z0-9_\-]/', '_', $ref));
    }

    public function deposit(Deposit $deposit, User $user): \Symfony\Component\HttpFoundation\Response
    {
        $deposit->loadMissing('project');

        $html = view('pdf.deposit-receipt', [
            'deposit' => $deposit,
            'user' => $user,
            'statusLabel' => DepositReviewStatuses::label($deposit->status),
            'generatedAt' => now()->format('d M Y H:i'),
        ])->render();

        $ref = $deposit->reference ?: sprintf('OGDEP-INV-%03d', $deposit->id);

        return $this->download($html, 'Deposit-'.preg_replace('/[^A-Za-z0-9_\-]/', '_', $ref));
    }

    public function withdrawal(Withdrawal $withdrawal, User $user): \Symfony\Component\HttpFoundation\Response
    {
        $html = view('pdf.withdrawal-receipt', [
            'withdrawal' => $withdrawal,
            'withdrawalBreakdown' => InvestorWithdrawalBreakdown::fromWithdrawal($withdrawal),
            'user' => $user,
            'generatedAt' => now()->format('d M Y H:i'),
        ])->render();

        $ref = $withdrawal->reference ?: 'WDR-'.$withdrawal->id;

        return $this->download($html, 'Withdrawal-'.preg_replace('/[^A-Za-z0-9_\-]/', '_', $ref));
    }

    public function investment(Investment $investment, User $user): \Symfony\Component\HttpFoundation\Response
    {
        $investment->loadMissing('project');

        $project = $investment->project;
        $meta = is_array($project?->meta) ? $project->meta : [];
        $roi = (float) ($project?->expected_return_pct ?: 0);
        $amount = (float) $investment->amount;
        $profit = $investment->profit_amount !== null
            ? (float) $investment->profit_amount
            : round($amount * ($roi / 100), 2);
        $amountPkr = $investment->amount_pkr !== null ? (float) $investment->amount_pkr : null;
        $profitPkr = $investment->profit_amount_pkr !== null
            ? (float) $investment->profit_amount_pkr
            : ($amountPkr !== null ? round($amountPkr * ($roi / 100), 2) : null);
        $exchangeRate = $investment->exchange_rate !== null ? (float) $investment->exchange_rate : null;

        $projectType = strtolower((string) ($project?->type ?: 'container'));
        $tradeLabel = match (true) {
            in_array($projectType, ['project', 'plant', 'ricemill', 'feed', 'produce'], true) => 'Project',
            $projectType === 'import' => 'Import',
            default => 'Export',
        };

        $normalizedStatus = ContainerProjectStatus::normalize($project?->status);
        $exportStages = array_values(array_filter(
            ContainerProjectStatus::STATUSES,
            fn (string $status) => $status !== 'cancelled',
        ));
        $currentIndex = array_search($normalizedStatus, $exportStages, true);
        if ($currentIndex === false) {
            $currentIndex = 0;
        }
        $isSettled = $normalizedStatus === 'settled';

        $stages = [];
        foreach ($exportStages as $i => $status) {
            $state = $i < $currentIndex || ($i === $currentIndex && $isSettled)
                ? 'done'
                : ($i === $currentIndex ? 'current' : 'pending');
            $stages[] = [
                'label' => ContainerProjectStatus::label($status),
                'state' => $state,
                'class' => 'stage-'.$state,
            ];
        }

        $containerNo = (string) ($meta['container_no'] ?? $meta['container_number'] ?? $meta['containerNumber'] ?? '');
        $containerType = (string) ($project?->container_type ?: '');
        $containerLabel = trim(($containerNo !== '' ? $containerNo : '—').($containerType !== '' ? ' ('.$containerType.')' : ''));

        $investmentReference = InvestmentReferenceGenerator::display($investment);
        $fmtMoney = fn (float $value) => '$'.number_format($value, 2);
        $fmtPkr = fn (float $value) => 'PKR '.number_format($value, 2);

        $html = view('pdf.investment-position', [
            'user' => $user,
            'generatedAt' => now()->format('d M Y H:i'),
            'projectTitle' => (string) ($project?->title ?: 'Investment'),
            'tradeLabel' => $tradeLabel,
            'projectStatusLabel' => ContainerProjectStatus::label($project?->status),
            'investmentStatusLabel' => ucwords(str_replace('_', ' ', (string) $investment->status)),
            'investmentReference' => $investmentReference,
            'projectReference' => (string) ($project?->reference ?: ''),
            'containerLabel' => $containerLabel,
            'commodity' => (string) ($project?->commodity ?: $project?->variety ?: '—'),
            'vessel' => (string) ($project?->vessel ?: '—'),
            'shippingLine' => (string) ($project?->shipping_line ?: '—'),
            'voyage' => (string) ($meta['voyage'] ?? $project?->current_project_stage ?? ''),
            'portOfLoading' => (string) ($project?->port_of_loading ?: $project?->origin ?: '—'),
            'portOfDischarge' => (string) ($project?->port_of_discharge ?: $project?->destination ?: '—'),
            'incoterm' => (string) ($project?->incoterm ?: '—'),
            'investedAt' => $investment->invested_at?->format('d M Y')
                ?: ($investment->created_at?->format('d M Y') ?: '—'),
            'etd' => $project?->etd?->format('d M Y') ?: '—',
            'eta' => $project?->eta?->format('d M Y') ?: '—',
            'periodDays' => (string) ($project?->investment_period_days ?: '—'),
            'stages' => $stages,
            'amountFormatted' => $fmtMoney($amount),
            'amountPkrFormatted' => $amountPkr !== null ? $fmtPkr($amountPkr) : null,
            'profitFormatted' => $fmtMoney($profit),
            'profitPkrFormatted' => $profitPkr !== null ? $fmtPkr($profitPkr) : null,
            'roiFormatted' => number_format($roi, 2, '.', ''),
            'totalReturnFormatted' => $fmtMoney($amount + $profit),
            'totalReturnPkrFormatted' => ($amountPkr !== null && $profitPkr !== null)
                ? $fmtPkr($amountPkr + $profitPkr)
                : null,
            'exchangeRateFormatted' => $exchangeRate !== null
                ? '1 USD = '.number_format($exchangeRate, 4).' PKR'
                : null,
        ])->render();

        $ref = $investmentReference ?: ($project?->reference ?: 'investment-'.$investment->id);

        return $this->download($html, 'Investment-'.preg_replace('/[^A-Za-z0-9_\-]/', '_', (string) $ref));
    }

    private function download(string $html, string $basename): \Symfony\Component\HttpFoundation\Response
    {
        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$basename.'.pdf"',
        ]);
    }
}
