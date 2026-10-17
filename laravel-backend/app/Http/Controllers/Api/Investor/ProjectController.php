<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Http\Resources\InvestmentProjectResource;
use App\Http\Resources\InvestmentResource;
use App\Models\Investment;
use App\Models\InvestmentProject;
use App\Models\InvestmentProjectDocument;
use App\Models\InvestmentProjectTradeUpdate;
use App\Services\InvestorTransactionPdfGenerator;
use App\Support\AdminNotificationTypes;
use App\Support\ContainerProjectStatus;
use App\Support\FinancialTransactionIdResolver;
use App\Support\InvestorMarket;
use App\Support\InvestorNotificationTypes;
use App\Support\KycGate;
use App\Support\MediaStorage;
use App\Support\NotifiesAdmins;
use App\Support\NotifiesUsers;
use App\Support\WalletInvestmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProjectController extends Controller
{
    use PaginatesQueries;

    public function __construct(
        private readonly WalletInvestmentService $walletInvestmentService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = InvestmentProject::query()
            ->whereIn('status', ContainerProjectStatus::allVisibleStatuses());

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($request->filled('category') && $request->input('category') === 'long_term') {
            $query->whereIn('type', ['produce', 'plant', 'ricemill', 'feed']);
        } elseif ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        $typeFilter = $request->input('type');
        if (in_array($typeFilter, ['feed', 'ricemill'], true)) {
            $driver = DB::connection()->getDriverName();
            if ($driver === 'pgsql') {
                $query->orderByRaw("(meta->>'sort_order')::int ASC NULLS LAST")
                    ->latest();
            } elseif ($driver === 'sqlite') {
                $query->orderByRaw("CASE WHEN json_extract(meta, '$.sort_order') IS NULL THEN 1 ELSE 0 END")
                    ->orderByRaw("CAST(json_extract(meta, '$.sort_order') AS INTEGER) ASC")
                    ->latest();
            } else {
                // MySQL / MariaDB
                $query->orderByRaw('ISNULL(JSON_EXTRACT(meta, \'$.sort_order\')), CAST(JSON_EXTRACT(meta, \'$.sort_order\') AS UNSIGNED) ASC')
                    ->latest();
            }
        } else {
            $query->latest();
        }

        return InvestmentProjectResource::collection(
            $query->with('documents')->paginate($this->perPage($request))
        );
    }

    public function show(int $id): InvestmentProjectResource
    {
        return new InvestmentProjectResource(
            InvestmentProject::query()
                ->with([
                    'documents',
                    'containerTracking',
                    'tradeUpdates' => fn ($query) => $query->orderBy('occurred_at')->orderBy('id'),
                    'stageUpdates' => fn ($query) => $query->orderBy('created_at')->orderBy('id'),
                ])
                ->whereIn('status', ContainerProjectStatus::allVisibleStatuses())
                ->findOrFail($id)
        );
    }

    public function downloadDocument(int $id, int $documentId): Response
    {
        InvestmentProject::query()
            ->whereIn('status', ContainerProjectStatus::allVisibleStatuses())
            ->findOrFail($id);

        $doc = InvestmentProjectDocument::query()
            ->where('investment_project_id', $id)
            ->findOrFail($documentId);

        abort_unless(MediaStorage::exists($doc->path), 404, 'File not found.');

        $ext = pathinfo($doc->path, PATHINFO_EXTENSION);
        $filename = $doc->original_name ?: ($doc->title.($ext ? '.'.$ext : ''));

        return MediaStorage::download($doc->path, $filename);
    }

    public function downloadTradeUpdateAttachment(int $id, int $updateId): Response
    {
        $project = InvestmentProject::query()
            ->whereIn('status', ContainerProjectStatus::allVisibleStatuses())
            ->findOrFail($id);

        $update = InvestmentProjectTradeUpdate::query()
            ->where('investment_project_id', $project->id)
            ->findOrFail($updateId);

        abort_unless($update->attachment_path && MediaStorage::exists($update->attachment_path), 404, 'File not found.');

        return MediaStorage::download(
            $update->attachment_path,
            $update->attachment_name ?: basename($update->attachment_path),
        );
    }

    public function invest(Request $request, int $id): JsonResponse
    {
        KycGate::ensureApproved($request->user());

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        $amount = (float) $data['amount'];

        $project = InvestmentProject::query()
            ->whereIn('status', ContainerProjectStatus::investableStatuses())
            ->whereKey($id)
            ->firstOrFail();

        $result = $this->walletInvestmentService->investFromWallet(
            $request->user(),
            $project,
            $amount,
        );

        $investment = $result['investment'];
        $project = $investment->project;
        $user = $request->user();
        $ref = $investment->reference ?: 'INV-'.$investment->id;

        $investmentCurrency = strtoupper((string) $investment->amount_currency);
        $amountUsd = (float) $result['investment_amount_usd'];
        $amountPkr = $investment->amount_pkr !== null ? (float) $investment->amount_pkr : null;
        $walletAmount = (float) $result['wallet_debit'];
        $walletCurrency = (string) $result['wallet_currency'];
        $walletNote = number_format($walletAmount, 2).' '.$walletCurrency
            .' was deducted from your wallet for a '.number_format((float) $investment->amount, 2)
            .' '.$investmentCurrency.' investment.';

        NotifiesUsers::notifyAndEmail(
            $user,
            InvestorNotificationTypes::INVESTMENT,
            'Investment confirmed — '.$ref,
            'Your investment in '.($project?->title ?? 'the project').' is active. '.$walletNote,
            [
                'investment_id' => $investment->id,
                'transaction_type' => 'investment',
                'transaction_status' => $investment->status,
                'reference' => $ref,
                'href' => '/invest/positions/'.$investment->id,
            ],
            'investment_confirmed',
            [
                'reference' => $ref,
                'amount' => number_format((float) $investment->amount, 2),
                'amount_pkr' => $amountPkr !== null ? number_format($amountPkr, 2) : null,
                'currency' => $investmentCurrency,
                'amount_usd' => number_format($amountUsd, 2),
                'wallet_amount' => number_format($walletAmount, 2),
                'wallet_currency' => $walletCurrency,
                'project_name' => $project?->title ?? 'Investment Project',
                'portal_url' => config('app.frontend_url', config('app.url')).'/invest/positions/'.$investment->id,
            ]
        );

        $adminHref = ($project?->type === 'container')
            ? '/admin/container-investments'
            : '/admin/investments';

        $adminAmountLabel = number_format((float) $investment->amount, 2).' '.$investmentCurrency
            .' (wallet debit: '.number_format($walletAmount, 2).' '.$walletCurrency.')';

        NotifiesAdmins::notify(
            AdminNotificationTypes::INVESTMENT_CREATED,
            'New investment: '.$adminAmountLabel,
            $user->name.' invested in '.($project?->title ?? 'a project').'. Ref: '.$ref,
            [
                'href' => $adminHref,
                'investment_id' => $investment->id,
                'user_id' => $user->id,
                'project_id' => $project?->id,
            ]
        );

        return response()->json([
            'message' => 'Investment confirmed.',
            'data' => $investment,
            'wallet_debit' => $walletAmount,
            'wallet_currency' => $walletCurrency,
            'wallet_exchange_rate' => $result['wallet_exchange_rate'],
            'wallet_rates_as_of' => $result['wallet_rates_as_of'],
            'capacity' => [
                'remaining_amount' => $result['capacity']['remaining_capacity'],
                'pending_reserved' => $result['capacity']['pending_reserved'],
                'is_full' => $result['capacity']['is_full'],
                'slots_remaining' => $result['capacity']['slots_remaining'],
            ],
        ], 201);
    }

    public function myInvestments(Request $request): AnonymousResourceCollection
    {
        $query = Investment::query()
            ->where('investor_id', $request->user()->id)
            ->with([
                'project.containerTracking',
                'project.stageUpdates' => fn ($query) => $query->orderBy('created_at')->orderBy('id'),
                'payoutProgress',
            ]);

        if ($projectType = $request->input('project_type')) {
            $query->whereHas('project', fn ($q) => $q->where('type', $projectType));
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                    ->orWhereHas('project', fn ($pq) => $pq
                        ->where('reference', 'like', "%{$search}%")
                        ->orWhere('title', 'like', "%{$search}%")
                        ->orWhere('commodity', 'like', "%{$search}%")
                        ->orWhere('vessel', 'like', "%{$search}%"));
            });
        }

        $paginator = $query
            ->latest('invested_at')
            ->latest('created_at')
            ->latest('id')
            ->paginate($this->perPage($request));

        return InvestmentResource::collection($paginator);
    }

    public function showInvestment(Request $request, int $id): JsonResponse
    {
        $investment = FinancialTransactionIdResolver::findOrFail(
            Investment::query()
                ->where('investor_id', $request->user()->id)
                ->with([
                'project.documents',
                'project.containerTracking',
                'project.tradeUpdates' => fn ($query) => $query->orderBy('occurred_at')->orderBy('id'),
                'project.stageUpdates' => fn ($query) => $query->orderBy('created_at')->orderBy('id'),
                'profitDistribution',
                'payoutProgress',
                ]),
            $id,
        );

        return response()->json([
            'data' => new InvestmentResource($investment),
        ]);
    }

    public function investmentPdf(Request $request, int $id, InvestorTransactionPdfGenerator $pdf): Response
    {
        $investment = FinancialTransactionIdResolver::findOrFail(
            Investment::query()
                ->where('investor_id', $request->user()->id)
                ->with('project'),
            $id,
        );

        return $pdf->investment($investment, $request->user());
    }

    public function exportInvestment(Request $request, int $id): StreamedResponse
    {
        $investment = FinancialTransactionIdResolver::findOrFail(
            Investment::query()
                ->where('investor_id', $request->user()->id)
                ->with('project'),
            $id,
        );

        $project = $investment->project;
        $meta = is_array($project?->meta) ? $project->meta : [];
        $roi = (float) ($project?->expected_return_pct ?: 0);
        $amount = (float) $investment->amount;
        $profit = $investment->profit_amount !== null
            ? (float) $investment->profit_amount
            : round($amount * ($roi / 100), 2);

        $rows = [
            ['Field', 'Value'],
            ['Investment Reference', (string) ($investment->reference ?: '')],
            ['Project Reference', (string) ($project?->reference ?: '')],
            ['Project Title', (string) ($project?->title ?: '')],
            ['Project Type', (string) ($project?->type ?: '')],
            ['Investment Status', (string) $investment->status],
            ['Project Status', (string) ($project?->status ?: '')],
            ['Amount', number_format($amount, 2, '.', '')],
            ['Expected / Realized Profit', number_format($profit, 2, '.', '')],
            ['ROI %', number_format($roi, 2, '.', '')],
            ['Total Return', number_format($amount + $profit, 2, '.', '')],
            ['Invested At', $investment->invested_at?->toDateTimeString() ?: ''],
            ['Approved At', $investment->approved_at?->toDateTimeString() ?: ''],
            ['Commodity', (string) ($project?->commodity ?: $project?->variety ?: '')],
            ['Container Type', (string) ($project?->container_type ?: '')],
            ['Container No', (string) ($meta['container_no'] ?? $meta['container_number'] ?? '')],
            ['Vessel', (string) ($project?->vessel ?: '')],
            ['Shipping Line', (string) ($project?->shipping_line ?: '')],
            ['Port of Loading', (string) ($project?->port_of_loading ?: $project?->origin ?: '')],
            ['Port of Discharge', (string) ($project?->port_of_discharge ?: $project?->destination ?: '')],
            ['Incoterm', (string) ($project?->incoterm ?: '')],
            ['ETD', $project?->etd?->toDateString() ?: (string) ($project?->etd ?: '')],
            ['ETA', $project?->eta?->toDateString() ?: (string) ($project?->eta ?: '')],
            ['Investment Period (days)', (string) ($project?->investment_period_days ?: '')],
        ];

        $ref = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($investment->reference ?: $project?->reference ?: 'investment-'.$investment->id));
        $filename = 'investment-'.$ref.'.xls';

        return response()->streamDownload(function () use ($rows) {
            echo "\xEF\xBB\xBF";
            echo '<html><head><meta charset="UTF-8"></head><body><table border="1">';
            foreach ($rows as $row) {
                echo '<tr>';
                foreach ($row as $cell) {
                    echo '<td>'.e((string) $cell).'</td>';
                }
                echo '</tr>';
            }
            echo '</table></body></html>';
        }, $filename, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
        ]);
    }
}
