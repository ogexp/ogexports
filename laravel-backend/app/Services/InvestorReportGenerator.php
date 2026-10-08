<?php

namespace App\Services;

use App\Models\Investment;
use App\Models\InvestmentProfitDistribution;
use App\Models\InvestorReport;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\InvestorDepositFx;
use App\Support\InvestorPortfolioMetrics;
use App\Support\InvestorProfitTotals;
use App\Support\UserDisplayCurrency;
use Carbon\Carbon;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class InvestorReportGenerator
{
    public const TYPES = ['portfolio', 'profit', 'annual', 'monthly', 'custom'];

    public const FORMATS = ['pdf', 'excel', 'csv'];

    /**
     * @param  array{report_type: string, format: string, start_date?: string|null, end_date?: string|null}  $input
     */
    public function generate(User $user, array $input): InvestorReport
    {
        $reportType = strtolower($input['report_type']);
        $format = $this->normalizeFormat($input['format']);
        $startDate = ! empty($input['start_date']) ? Carbon::parse($input['start_date'])->startOfDay() : null;
        $endDate = ! empty($input['end_date']) ? Carbon::parse($input['end_date'])->endOfDay() : null;

        if ($reportType === 'annual') {
            $year = now()->year;
            $startDate = Carbon::create($year, 1, 1)->startOfDay();
            $endDate = Carbon::create($year, 12, 31)->endOfDay();
        } elseif ($reportType === 'monthly' && ! $startDate && ! $endDate) {
            $startDate = now()->startOfMonth();
            $endDate = now()->endOfMonth();
        }

        $metrics = InvestorPortfolioMetrics::summary($user->id);
        /** @var Collection<int, Investment> $investments */
        $investments = $metrics['investments'];

        if ($startDate || $endDate) {
            $investments = $investments->filter(function (Investment $inv) use ($startDate, $endDate) {
                if ($inv->invested_at === null) {
                    return false;
                }
                $at = Carbon::parse($inv->invested_at);
                if ($startDate && $at->lt($startDate)) {
                    return false;
                }
                if ($endDate && $at->gt($endDate)) {
                    return false;
                }

                return true;
            })->values();
        }

        $payload = $this->buildPayload($user, $reportType, $metrics, $investments, $startDate, $endDate);
        $name = $this->buildName($reportType, $startDate, $endDate);
        $contents = match ($format) {
            'pdf' => $this->renderPdf($payload),
            'excel' => $this->renderExcel($payload),
            default => $this->renderCsv($payload),
        };

        $extension = match ($format) {
            'pdf' => 'pdf',
            'excel' => 'xls',
            default => 'csv',
        };

        $relativePath = sprintf(
            'investor-reports/%d/%s-%s.%s',
            $user->id,
            Str::slug($reportType),
            now()->format('Ymd-His'),
            $extension
        );

        Storage::disk('local')->put($relativePath, $contents);

        return InvestorReport::query()->create([
            'investor_id' => $user->id,
            'report_type' => $reportType,
            'format' => $format,
            'name' => $name,
            'file_path' => $relativePath,
            'file_size' => strlen($contents),
            'start_date' => $startDate?->toDateString(),
            'end_date' => $endDate?->toDateString(),
            'status' => 'ready',
        ]);
    }

    /**
     * @param  array{
     *   has_investments: bool,
     *   total_invested: float,
     *   total_profit_earned: float,
     *   lifetime_roi: float,
     *   investments: Collection<int, Investment>
     * }  $metrics
     * @param  Collection<int, Investment>  $investments
     * @return array<string, mixed>
     */
    private function buildPayload(
        User $user,
        string $reportType,
        array $metrics,
        Collection $investments,
        ?Carbon $startDate,
        ?Carbon $endDate,
    ): array {
        $walletCurrency = UserDisplayCurrency::currencyForUser($user);
        $displayCurrency = $walletCurrency === 'PKR' && ! UserDisplayCurrency::pkrDisplayEnabled()
            ? 'USD'
            : $walletCurrency;
        $displayPkr = $displayCurrency === 'PKR';
        $displayRate = $displayPkr ? InvestorDepositFx::resolveDisplayRate($user->id) : null;
        $formatCurrency = static function (float $amount, ?float $usdEquivalent = null) use ($displayCurrency): string {
            $primary = $displayCurrency === 'USD'
                ? '$'.number_format($amount, 2, '.', ',')
                : $displayCurrency.' '.number_format($amount, 2, '.', ',');

            if ($displayCurrency === 'USD' || $usdEquivalent === null) {
                return $primary;
            }

            return $primary.' ($'.number_format($usdEquivalent, 2, '.', ',').')';
        };

        $filteredInvestedUsd = InvestorProfitTotals::sumInvestedUsd($investments);
        $filteredInvested = InvestorProfitTotals::sumInvestedWallet($investments, $displayCurrency, $displayRate);

        $distributions = InvestmentProfitDistribution::query()
            ->where('investor_id', $user->id)
            ->when($startDate, fn ($q) => $q->where('distributed_at', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('distributed_at', '<=', $endDate))
            ->with('project')
            ->orderByDesc('distributed_at')
            ->get();

        $filteredProfitUsd = (float) $distributions->sum('profit_amount');
        $filteredProfit = (float) $distributions->sum(
            fn (InvestmentProfitDistribution $d) => InvestorProfitTotals::distributionToWallet($d, $displayCurrency, $displayRate)
        );

        $wallet = Wallet::query()->where('user_id', $user->id)->first();
        $walletProfitRows = collect();
        if ($wallet) {
            $walletProfitRows = WalletTransaction::query()
                ->where('wallet_id', $wallet->id)
                ->where('direction', 'credit')
                ->whereIn('type', InvestorProfitTotals::WALLET_PROFIT_TYPES)
                ->when($startDate, fn ($q) => $q->where('created_at', '>=', $startDate))
                ->when($endDate, fn ($q) => $q->where('created_at', '<=', $endDate))
                ->orderByDesc('created_at')
                ->get();
            foreach ($walletProfitRows as $transaction) {
                $meta = is_array($transaction->meta) ? $transaction->meta : [];
                $sourceCurrency = strtoupper((string) ($meta['currency'] ?? $wallet->currency ?? 'USD'));
                $amount = (float) $transaction->amount;
                $filteredProfit += InvestorProfitTotals::convertToCurrency(
                    $amount,
                    $sourceCurrency,
                    $displayCurrency,
                );
                $filteredProfitUsd += InvestorProfitTotals::convertToCurrency(
                    $amount,
                    $sourceCurrency,
                    'USD',
                );
            }
        }

        $filteredProfit = round($filteredProfit, 2);
        $filteredProfitUsd = round($filteredProfitUsd, 2);

        $roi = $filteredInvested > 0
            ? round(($filteredProfit / $filteredInvested) * 100, 2)
            : 0.0;

        $investmentRows = $investments->map(function (Investment $inv) use ($formatCurrency, $displayCurrency) {
            $project = $inv->project;
            $roiPct = (float) ($project?->expected_return_pct ?: 0);
            $amountCurrency = strtoupper((string) ($inv->amount_currency ?: 'USD'));
            $amountUsd = InvestorProfitTotals::convertToCurrency((float) $inv->amount, $amountCurrency, 'USD');
            $profitUsd = $inv->profit_amount !== null
                ? (float) $inv->profit_amount
                : InvestorProfitTotals::convertToCurrency(
                    round((float) $inv->amount * ($roiPct / 100), 2),
                    $amountCurrency,
                    'USD',
                );
            $amountDisplay = InvestorProfitTotals::investmentToWallet($inv, $displayCurrency);
            $profitDisplay = $displayCurrency === 'PKR' && $inv->profit_amount_pkr !== null
                ? (float) $inv->profit_amount_pkr
                : InvestorProfitTotals::convertToCurrency($profitUsd, 'USD', $displayCurrency);

            return [
                'reference' => (string) ($inv->reference ?: $project?->reference ?: 'INV-'.$inv->id),
                'project' => (string) ($project?->title ?: 'Investment #'.$inv->id),
                'type' => (string) ($project?->type ?: ''),
                'status' => (string) $inv->status,
                'amount' => $amountDisplay,
                'profit' => $profitDisplay,
                'amount_label' => $formatCurrency($amountDisplay, $amountUsd),
                'profit_label' => $formatCurrency($profitDisplay, $profitUsd),
                'roi' => $roiPct,
                'invested_at' => $inv->invested_at?->format('Y-m-d') ?: '',
            ];
        })->values()->all();

        $distributionRows = $distributions->map(function (InvestmentProfitDistribution $d) use ($formatCurrency, $displayCurrency) {
            $investedUsd = (float) $d->invested_amount;
            $profitUsd = (float) $d->profit_amount;
            $investedDisplay = $displayCurrency === 'PKR' && $d->invested_amount_pkr !== null
                ? (float) $d->invested_amount_pkr
                : InvestorProfitTotals::convertToCurrency($investedUsd, 'USD', $displayCurrency);
            $profitDisplay = InvestorProfitTotals::distributionToWallet($d, $displayCurrency);

            return [
                'project' => (string) ($d->project?->title ?: 'Project #'.$d->project_id),
                'invested_amount' => $investedDisplay,
                'profit_amount' => $profitDisplay,
                'invested_amount_label' => $formatCurrency($investedDisplay, $investedUsd),
                'profit_amount_label' => $formatCurrency($profitDisplay, $profitUsd),
                'roi_pct' => (float) $d->roi_pct,
                'distributed_at' => $d->distributed_at?->format('Y-m-d') ?: '',
            ];
        })->values()->all();

        $totalInvestedLabel = $formatCurrency($filteredInvested, $filteredInvestedUsd);
        $totalProfitLabel = $formatCurrency($filteredProfit, $filteredProfitUsd);

        return [
            'user' => $user,
            'report_type' => $reportType,
            'report_type_label' => $this->typeLabel($reportType),
            'generated_at' => now()->format('d M Y H:i'),
            'start_date' => $startDate?->toDateString(),
            'end_date' => $endDate?->toDateString(),
            'display_pkr' => $displayPkr,
            'display_currency' => $displayCurrency,
            'summary' => [
                'total_invested' => $filteredInvested,
                'total_profit_earned' => $filteredProfit,
                'total_invested_usd' => $filteredInvestedUsd,
                'total_profit_earned_usd' => $filteredProfitUsd,
                'total_invested_label' => $totalInvestedLabel,
                'total_profit_earned_label' => $totalProfitLabel,
                'lifetime_roi' => $roi,
                'investments_count' => $investments->count(),
                'portfolio_total_invested' => $metrics['total_invested'],
                'portfolio_total_profit' => $metrics['total_profit_earned'],
                'portfolio_lifetime_roi' => $metrics['lifetime_roi'],
            ],
            'investments' => $investmentRows,
            'distributions' => $distributionRows,
            'wallet_profits' => $walletProfitRows->map(function (WalletTransaction $tx) use ($formatCurrency, $displayCurrency) {
                $sourceCurrency = strtoupper((string) (
                    (is_array($tx->meta) ? ($tx->meta['currency'] ?? null) : null)
                    ?: $displayCurrency
                ));
                $amount = (float) $tx->amount;

                return [
                    'type' => (string) $tx->type,
                    'amount' => InvestorProfitTotals::convertToCurrency($amount, $sourceCurrency, $displayCurrency),
                    'amount_label' => $formatCurrency(
                        InvestorProfitTotals::convertToCurrency($amount, $sourceCurrency, $displayCurrency),
                        InvestorProfitTotals::convertToCurrency($amount, $sourceCurrency, 'USD'),
                    ),
                    'reference' => (string) ($tx->reference ?: 'TXN-'.$tx->id),
                    'date' => $tx->created_at?->format('Y-m-d') ?: '',
                ];
            })->values()->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function renderPdf(array $payload): string
    {
        $html = view('pdf.investor-report', $payload)->render();

        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function renderExcel(array $payload): string
    {
        $rows = $this->tabularRows($payload);
        $html = "\xEF\xBB\xBF<html><head><meta charset=\"UTF-8\"></head><body><table border=\"1\">";
        foreach ($rows as $row) {
            $html .= '<tr>';
            foreach ($row as $cell) {
                $html .= '<td>'.e((string) $cell).'</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</table></body></html>';

        return $html;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function renderCsv(array $payload): string
    {
        $rows = $this->tabularRows($payload);
        $fh = fopen('php://temp', 'r+');
        fwrite($fh, "\xEF\xBB\xBF");
        foreach ($rows as $row) {
            fputcsv($fh, $row);
        }
        rewind($fh);
        $csv = stream_get_contents($fh) ?: '';
        fclose($fh);

        return $csv;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<list<string|int|float>>
     */
    private function tabularRows(array $payload): array
    {
        $summary = $payload['summary'];
        $rows = [
            ['Report', $payload['report_type_label']],
            ['Investor', $payload['user']->name ?? ''],
            ['Email', $payload['user']->email ?? ''],
            ['Generated At', $payload['generated_at']],
            ['Start Date', $payload['start_date'] ?: ''],
            ['End Date', $payload['end_date'] ?: ''],
            [],
            ['Summary'],
            ['Total Invested', $summary['total_invested_label'] ?? number_format((float) $summary['total_invested'], 2, '.', '')],
            ['Total Profit Earned', $summary['total_profit_earned_label'] ?? number_format((float) $summary['total_profit_earned'], 2, '.', '')],
            ['Lifetime ROI %', number_format((float) $summary['lifetime_roi'], 2, '.', '')],
            ['Investments Count', (int) $summary['investments_count']],
            [],
            ['Investments'],
            ['Reference', 'Project', 'Type', 'Status', 'Amount', 'Profit', 'ROI %', 'Invested At'],
        ];

        foreach ($payload['investments'] as $row) {
            $rows[] = [
                $row['reference'],
                $row['project'],
                $row['type'],
                $row['status'],
                $row['amount_label'] ?? number_format((float) $row['amount'], 2, '.', ''),
                $row['profit_label'] ?? number_format((float) $row['profit'], 2, '.', ''),
                number_format((float) $row['roi'], 2, '.', ''),
                $row['invested_at'],
            ];
        }

        $rows[] = [];
        $rows[] = ['Profit Distributions'];
        $rows[] = ['Project', 'Invested Amount', 'Profit Amount', 'ROI %', 'Distributed At'];
        foreach ($payload['distributions'] as $row) {
            $rows[] = [
                $row['project'],
                $row['invested_amount_label'] ?? number_format((float) $row['invested_amount'], 2, '.', ''),
                $row['profit_amount_label'] ?? number_format((float) $row['profit_amount'], 2, '.', ''),
                number_format((float) $row['roi_pct'], 2, '.', ''),
                $row['distributed_at'],
            ];
        }

        if ($payload['wallet_profits'] !== []) {
            $rows[] = [];
            $rows[] = ['Wallet Profit Credits'];
            $rows[] = ['Type', 'Amount', 'Reference', 'Date'];
            foreach ($payload['wallet_profits'] as $row) {
                $rows[] = [
                    $row['type'],
                    $row['amount_label'] ?? number_format((float) $row['amount'], 2, '.', ''),
                    $row['reference'],
                    $row['date'],
                ];
            }
        }

        return $rows;
    }

    private function buildName(string $reportType, ?Carbon $startDate, ?Carbon $endDate): string
    {
        $label = $this->typeLabel($reportType);

        if ($reportType === 'custom' && $startDate && $endDate) {
            return sprintf(
                '%s — %s–%s',
                $label,
                $startDate->format('M Y'),
                $endDate->format('M Y')
            );
        }

        if ($reportType === 'monthly' && $startDate) {
            return sprintf('%s — %s', $label, $startDate->format('M Y'));
        }

        if ($reportType === 'annual' && $startDate) {
            return sprintf('%s — %s', $label, $startDate->format('Y'));
        }

        return sprintf('%s — %s', $label, now()->format('M Y'));
    }

    private function typeLabel(string $reportType): string
    {
        return match ($reportType) {
            'portfolio' => 'Portfolio Report',
            'profit' => 'Profit Report',
            'annual' => 'Annual Report',
            'monthly' => 'Monthly Report',
            'custom' => 'Custom Report',
            default => 'Investment Report',
        };
    }

    private function normalizeFormat(string $format): string
    {
        $format = strtolower(trim($format));

        return match ($format) {
            'pdf' => 'pdf',
            'excel', 'xls', 'xlsx' => 'excel',
            'csv' => 'csv',
            default => 'pdf',
        };
    }

    public function mimeType(string $format): string
    {
        return match (strtolower($format)) {
            'pdf' => 'application/pdf',
            'excel' => 'application/vnd.ms-excel; charset=UTF-8',
            'csv' => 'text/csv; charset=UTF-8',
            default => 'application/octet-stream',
        };
    }

    public function downloadFilename(InvestorReport $report): string
    {
        $base = preg_replace('/[^A-Za-z0-9_\-]/', '_', $report->name) ?: 'investor-report';
        $ext = match (strtolower($report->format)) {
            'pdf' => 'pdf',
            'excel' => 'xls',
            'csv' => 'csv',
            default => 'bin',
        };

        return $base.'.'.$ext;
    }
}
