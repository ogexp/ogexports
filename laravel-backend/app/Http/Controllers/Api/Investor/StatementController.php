<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Services\InvestorMonthlyStatementService;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class StatementController extends Controller
{
    public function show(Request $request, InvestorMonthlyStatementService $statements): JsonResponse
    {
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        return response()->json([
            'data' => $statements->build($request->user(), $validated['month'] ?? null),
        ]);
    }

    public function download(
        Request $request,
        string $month,
        InvestorMonthlyStatementService $statements,
    ): Response {
        $statement = $statements->build($request->user(), $month);
        $html = view('pdf.investor-monthly-statement', [
            'statement' => $statement,
            'investor' => $request->user(),
        ])->render();

        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');

        $pdf = new Dompdf($options);
        $pdf->loadHtml($html);
        $pdf->setPaper('A4', 'portrait');
        $pdf->render();

        $filename = 'og-investor-statement-'.$statement['month'].'.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}