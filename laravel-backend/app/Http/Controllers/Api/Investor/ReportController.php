<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Models\InvestorReport;
use App\Services\InvestorReportGenerator;
use App\Support\InvestorPortfolioMetrics;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user->id;

        $metrics = InvestorPortfolioMetrics::summary($userId);
        $reportsGenerated = InvestorReport::query()
            ->where('investor_id', $userId)
            ->count();

        $monthlySeries = InvestorPortfolioMetrics::monthlySeries($metrics['investments'], $userId);

        $history = InvestorReport::query()
            ->where('investor_id', $userId)
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (InvestorReport $report) => $this->transformReport($report))
            ->values();

        return response()->json([
            'data' => [
                'has_investments' => $metrics['has_investments'],
                'summary' => [
                    'total_invested' => $metrics['total_invested'],
                    'total_profit_earned' => $metrics['total_profit_earned'],
                    'total_invested_usd' => $metrics['total_invested_usd'] ?? null,
                    'total_profit_earned_usd' => $metrics['total_profit_earned_usd'] ?? null,
                    'lifetime_roi' => $metrics['lifetime_roi'],
                    'reports_generated' => $reportsGenerated,
                ],
                'monthly_series' => $monthlySeries,
                'history' => $history,
            ],
        ]);
    }

    public function generate(Request $request, InvestorReportGenerator $generator): JsonResponse
    {
        $validated = $request->validate([
            'report_type' => ['required', 'string', Rule::in(InvestorReportGenerator::TYPES)],
            'format' => ['required', 'string', Rule::in(['PDF', 'Excel', 'CSV', 'pdf', 'excel', 'csv', 'xls', 'xlsx'])],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $user = $request->user();
        $hasInvestments = $user->investments()->exists();

        if (! $hasInvestments) {
            return response()->json([
                'message' => 'You have not invested yet please make new investments to view reports',
            ], 422);
        }

        $report = $generator->generate($user, [
            'report_type' => $validated['report_type'],
            'format' => $validated['format'],
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
        ]);

        return response()->json([
            'data' => [
                'report' => $this->transformReport($report),
                'download_url' => '/api/investor/reports/'.$report->id.'/download',
            ],
        ], 201);
    }

    public function download(Request $request, int $id, InvestorReportGenerator $generator): StreamedResponse
    {
        $report = InvestorReport::query()
            ->where('investor_id', $request->user()->id)
            ->findOrFail($id);

        if (! Storage::disk('local')->exists($report->file_path)) {
            abort(404, 'Report file not found.');
        }

        $filename = $generator->downloadFilename($report);
        $mime = $generator->mimeType($report->format);

        return Storage::disk('local')->download($report->file_path, $filename, [
            'Content-Type' => $mime,
        ]);
    }

    /**
     * @return array{
     *   id: int,
     *   name: string,
     *   date: string|null,
     *   date_label: string|null,
     *   type: string,
     *   size: int,
     *   size_label: string,
     *   status: string,
     *   report_type: string,
     *   format: string
     * }
     */
    private function transformReport(InvestorReport $report): array
    {
        $formatLabel = match (strtolower($report->format)) {
            'pdf' => 'PDF',
            'excel' => 'Excel',
            'csv' => 'CSV',
            default => strtoupper($report->format),
        };

        return [
            'id' => $report->id,
            'name' => $report->name,
            'date' => $report->created_at?->toDateString(),
            'date_label' => $report->created_at?->format('M j, Y'),
            'type' => $formatLabel,
            'size' => (int) $report->file_size,
            'size_label' => $this->formatBytes((int) $report->file_size),
            'status' => $report->status,
            'report_type' => $report->report_type,
            'format' => $report->format,
        ];
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }
        if ($bytes < 1024 * 1024) {
            return number_format($bytes / 1024, 1).' KB';
        }

        return number_format($bytes / (1024 * 1024), 1).' MB';
    }
}
