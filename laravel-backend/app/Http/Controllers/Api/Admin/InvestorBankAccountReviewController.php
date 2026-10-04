<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\InvestorBankAccountVerification;
use App\Models\UserProfile;
use App\Support\AuditsActions;
use App\Support\InvestorBankAccountPresenter;
use App\Support\InvestorBankAccounts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class InvestorBankAccountReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', 'string', Rule::in(['pending', 'verified', 'rejected', 'all'])],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = InvestorBankAccountVerification::query()
            ->with('investor:id,name,email')
            ->latest('id');
        $status = $filters['status'] ?? 'pending';
        if ($status !== 'all') {
            $query->where('status', $status);
        }
        if (! empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->whereHas('investor', function ($investors) use ($search) {
                $investors->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%');
            });
        }

        $paginator = $query->paginate((int) ($filters['per_page'] ?? 20));
        $paginator->getCollection()->transform(fn (InvestorBankAccountVerification $verification): array => $this->present($verification));

        return response()->json($paginator);
    }

    public function proof(InvestorBankAccountVerification $verification): Response
    {
        $disk = Storage::disk('local');
        abort_unless($disk->exists($verification->document_path), 404, 'Bank proof not found.');
        $path = $disk->path($verification->document_path);
        abort_unless(is_file($path), 404, 'Bank proof not found.');

        $filename = preg_replace('/[^A-Za-z0-9._ -]/', '_', $verification->original_name) ?: 'bank-proof';

        $response = response()->file($path, [
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
        $response->setPrivate();
        $response->headers->set('Cache-Control', 'private, no-store, max-age=0');

        return $response;
    }

    public function approve(Request $request, InvestorBankAccountVerification $verification): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        return $this->review($request, $verification, 'verified', $data['notes'] ?? null);
    }

    public function reject(Request $request, InvestorBankAccountVerification $verification): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        return $this->review($request, $verification, 'rejected', $data['notes']);
    }

    private function review(
        Request $request,
        InvestorBankAccountVerification $verification,
        string $status,
        ?string $notes,
    ): JsonResponse {
        abort_unless($verification->status === 'pending', 409, 'This submission has already been reviewed.');

        if ($status === 'verified' && ! $this->accountStillMatches($verification)) {
            throw ValidationException::withMessages([
                'bank_account' => ['The bank account details changed after this proof was submitted. Ask the investor to submit current proof.'],
            ]);
        }

        $verification->update([
            'status' => $status,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $notes,
        ]);

        AuditsActions::log(
            'investor.bank-account.'.($status === 'verified' ? 'verified' : 'rejected'),
            'compliance',
            $request->user(),
            [
                'verification_id' => $verification->id,
                'investor_id' => $verification->investor_id,
                'bank_account_id' => $verification->bank_account_id,
            ],
        );

        return response()->json([
            'message' => $status === 'verified'
                ? 'Bank account marked verified.'
                : 'Bank account verification rejected.',
            'data' => $this->present($verification->fresh(['investor:id,name,email'])),
        ]);
    }

    private function accountStillMatches(InvestorBankAccountVerification $verification): bool
    {
        $meta = UserProfile::query()
            ->where('user_id', $verification->investor_id)
            ->value('meta');
        $meta = is_array($meta) ? $meta : [];
        $accounts = InvestorBankAccounts::normalizeFromMeta($meta);
        $account = collect($accounts)->first(
            fn (array $candidate): bool => (string) $candidate['id'] === $verification->bank_account_id
        );

        return $account !== null
            && hash_equals($verification->account_fingerprint, InvestorBankAccountPresenter::fingerprint($account));
    }

    /**
     * @return array<string, mixed>
     */
    private function present(InvestorBankAccountVerification $verification): array
    {
        $meta = UserProfile::query()
            ->where('user_id', $verification->investor_id)
            ->value('meta');
        $meta = is_array($meta) ? $meta : [];
        $accounts = InvestorBankAccounts::normalizeFromMeta($meta);
        $account = collect($accounts)->first(
            fn (array $candidate): bool => (string) $candidate['id'] === $verification->bank_account_id
        );
        $matches = $account !== null
            && hash_equals($verification->account_fingerprint, InvestorBankAccountPresenter::fingerprint($account));
        $safeAccount = $account
            ? InvestorBankAccountPresenter::presentOne($account, $verification)
            : [];

        return [
            'verification_id' => $verification->id,
            'investor' => [
                'id' => $verification->investor?->id,
                'name' => $verification->investor?->name,
                'email' => $verification->investor?->email,
            ],
            'bank_account' => $safeAccount,
            'status' => $verification->status,
            'account_matches' => $matches,
            'proof_name' => $verification->original_name,
            'submitted_at' => $verification->created_at?->toIso8601String(),
            'reviewed_at' => $verification->reviewed_at?->toIso8601String(),
            'review_notes' => $verification->review_notes,
        ];
    }
}