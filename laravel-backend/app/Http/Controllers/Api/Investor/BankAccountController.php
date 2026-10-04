<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Controller;
use App\Models\InvestorBankAccountVerification;
use App\Support\InvestorBankAccountPresenter;
use App\Support\InvestorBankAccountProofStorage;
use App\Support\InvestorBankAccounts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class BankAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');
        $meta = is_array($user->profile?->meta) ? $user->profile->meta : [];
        $accounts = InvestorBankAccounts::normalizeFromMeta($meta);

        return response()->json([
            'data' => [
                'bank_accounts' => InvestorBankAccountPresenter::presentAll($user->id, $accounts),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bank_name' => ['required', 'string', 'max:255'],
            'account_holder' => ['required', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:100', 'required_without:iban'],
            'iban' => ['nullable', 'string', 'max:100', 'required_without:account_number'],
            'swift' => ['nullable', 'string', 'max:50'],
            'branch' => ['nullable', 'string', 'max:255'],
            'currency' => ['required', 'string', 'size:3'],
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp'],
        ]);

        $user = $request->user();
        $file = $request->file('file');
        $stored = InvestorBankAccountProofStorage::store($file, (int) $user->id);

        try {
            $verification = DB::transaction(function () use ($user, $data, $stored): InvestorBankAccountVerification {
                $profile = $user->profile()->firstOrCreate(['user_id' => $user->id]);
                $meta = is_array($profile->meta) ? $profile->meta : [];
                $accounts = InvestorBankAccounts::normalizeFromMeta($meta);
                $account = InvestorBankAccounts::normalizeAccount([
                    'bank_name' => $data['bank_name'],
                    'account_holder' => $data['account_holder'],
                    'account_number' => $data['account_number'] ?? '',
                    'iban' => $data['iban'] ?? '',
                    'swift' => $data['swift'] ?? '',
                    'branch' => $data['branch'] ?? '',
                    'currency' => $data['currency'] ?? 'USD',
                ]);

                $accounts = InvestorBankAccounts::upsertAccount($accounts, $account);
                $account = collect($accounts)->first(
                    fn (array $candidate): bool => InvestorBankAccounts::fingerprint($candidate)
                        === InvestorBankAccounts::fingerprint($account)
                );

                if (! $account) {
                    throw ValidationException::withMessages([
                        'bank_account' => ['The bank account details could not be saved.'],
                    ]);
                }

                $latest = InvestorBankAccountVerification::query()
                    ->where('investor_id', $user->id)
                    ->where('bank_account_id', $account['id'])
                    ->latest('id')
                    ->first();

                if ($latest && hash_equals($latest->account_fingerprint, InvestorBankAccountPresenter::fingerprint($account))) {
                    if ($latest->status === 'verified') {
                        throw ValidationException::withMessages([
                            'bank_account' => ['This bank account is already verified.'],
                        ]);
                    }

                    if ($latest->status === 'pending') {
                        throw ValidationException::withMessages([
                            'bank_account' => ['Proof for this account is already under review.'],
                        ]);
                    }
                }

                $updatedMeta = array_merge($meta, ['bank_accounts' => $accounts]);
                $default = InvestorBankAccounts::defaultAccount($accounts);
                if ($default !== null) {
                    $updatedMeta['withdraw_bank'] = [
                        'bank_name' => $default['bank_name'],
                        'account_holder' => $default['account_holder'],
                        'account_number' => $default['account_number'],
                        'iban' => $default['iban'],
                        'swift' => $default['swift'],
                        'branch' => $default['branch'],
                        'currency' => $default['currency'],
                    ];
                }
                $profile->meta = $updatedMeta;
                $profile->save();

                return InvestorBankAccountVerification::create([
                    'investor_id' => $user->id,
                    'bank_account_id' => $account['id'],
                    'account_fingerprint' => InvestorBankAccountPresenter::fingerprint($account),
                    'document_path' => $stored['path'],
                    'original_name' => $stored['name'],
                    'status' => 'pending',
                ]);
            });
        } catch (Throwable $error) {
            Storage::disk('local')->delete($stored['path']);
            throw $error;
        }

        $savedProfile = $user->profile()->first();
        $accounts = InvestorBankAccounts::normalizeFromMeta(
            is_array($savedProfile?->meta) ? $savedProfile->meta : []
        );

        return response()->json([
            'message' => 'Bank account proof submitted for review.',
            'data' => [
                'verification_id' => $verification->id,
                'bank_accounts' => InvestorBankAccountPresenter::presentAll($user->id, $accounts),
            ],
        ], 201);
    }

    public function setDefault(Request $request, string $id): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');
        $profile = $user->profile;
        $meta = is_array($profile?->meta) ? $profile->meta : [];
        $accounts = InvestorBankAccounts::normalizeFromMeta($meta);
        $account = collect($accounts)->first(fn (array $candidate): bool => (string) $candidate['id'] === $id);

        if (! $account || InvestorBankAccountPresenter::currentVerification($user->id, $account)?->status !== 'verified') {
            throw ValidationException::withMessages([
                'bank_account_id' => ['Only a bank account currently verified by OG Exports can be set as the withdrawal default.'],
            ]);
        }

        $accounts = InvestorBankAccounts::setDefault($accounts, $id);
        $updatedMeta = array_merge($meta, ['bank_accounts' => $accounts]);
        $updatedMeta['withdraw_bank'] = [
            'bank_name' => $account['bank_name'],
            'account_holder' => $account['account_holder'],
            'account_number' => $account['account_number'],
            'iban' => $account['iban'],
            'swift' => $account['swift'],
            'branch' => $account['branch'],
            'currency' => $account['currency'],
        ];
        $profile->meta = $updatedMeta;
        $profile->save();

        return response()->json([
            'message' => 'Default withdrawal account updated.',
            'data' => [
                'bank_accounts' => InvestorBankAccountPresenter::presentAll($user->id, $accounts),
            ],
        ]);
    }
}