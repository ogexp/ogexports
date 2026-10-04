<?php

namespace App\Support;

use App\Models\InvestorBankAccountVerification;

class InvestorBankAccountPresenter
{
    /**
     * @param  list<array<string, mixed>>  $accounts
     * @return list<array<string, mixed>>
     */
    public static function presentAll(int $investorId, array $accounts): array
    {
        $latestByAccount = InvestorBankAccountVerification::query()
            ->where('investor_id', $investorId)
            ->orderByDesc('id')
            ->get()
            ->unique('bank_account_id')
            ->keyBy('bank_account_id');

        return array_map(
            fn (array $account): array => self::presentOne(
                $account,
                $latestByAccount->get((string) ($account['id'] ?? '')),
            ),
            $accounts,
        );
    }

    /**
     * @param  array<string, mixed>  $account
     * @return array<string, mixed>
     */
    public static function presentOne(
        array $account,
        ?InvestorBankAccountVerification $verification = null,
    ): array {
        $matches = $verification !== null
            && hash_equals($verification->account_fingerprint, self::fingerprint($account));
        $currentVerification = $matches ? $verification : null;
        $identifier = trim((string) ($account['account_number'] ?? ''))
            ?: trim((string) ($account['iban'] ?? ''));

        return [
            'id' => (string) ($account['id'] ?? ''),
            'bank_name' => (string) ($account['bank_name'] ?? ''),
            'account_holder' => (string) ($account['account_holder'] ?? ''),
            'masked_account_identifier' => self::maskIdentifier($identifier),
            'currency' => (string) ($account['currency'] ?? ''),
            'is_default' => (bool) ($account['is_default'] ?? false),
            'verification_status' => $currentVerification?->status ?? 'not_submitted',
            'verification_submitted_at' => $currentVerification?->created_at?->toIso8601String(),
            'verification_reviewed_at' => $currentVerification?->reviewed_at?->toIso8601String(),
            'verification_notes' => $currentVerification?->review_notes,
            'proof_name' => $verification?->original_name,
            'has_proof' => $verification !== null,
        ];
    }

    /**
     * Bind review decisions to every bank detail, not only the account number.
     *
     * @param  array<string, mixed>  $account
     */
    public static function fingerprint(array $account): string
    {
        $account = InvestorBankAccounts::normalizeAccount($account);
        $values = [
            mb_strtolower(trim($account['bank_name'])),
            mb_strtolower(trim($account['account_holder'])),
            strtolower(preg_replace('/\s+/', '', $account['account_number']) ?? ''),
            strtolower(preg_replace('/\s+/', '', $account['iban']) ?? ''),
            mb_strtolower(trim($account['swift'])),
            mb_strtolower(trim($account['branch'])),
            strtoupper(trim($account['currency'])),
        ];

        return hash('sha256', implode("\0", $values));
    }

    public static function maskIdentifier(?string $identifier): ?string
    {
        $identifier = preg_replace('/\s+/', '', trim((string) $identifier)) ?? '';
        if ($identifier === '') {
            return null;
        }

        return strlen($identifier) <= 4
            ? '••••'
            : '•••• '.substr($identifier, -4);
    }

    /**
     * @param  array<string, mixed>  $bankDetails
     * @return array<string, mixed>
     */
    public static function maskBankDetails(array $bankDetails): array
    {
        $masked = $bankDetails;
        $identifier = trim((string) ($bankDetails['account_number'] ?? ''))
            ?: trim((string) ($bankDetails['iban'] ?? ''));
        unset($masked['account_number'], $masked['iban']);
        $masked['masked_account_identifier'] = self::maskIdentifier($identifier);

        return $masked;
    }

    public static function currentVerification(int $investorId, array $account): ?InvestorBankAccountVerification
    {
        $verification = InvestorBankAccountVerification::query()
            ->where('investor_id', $investorId)
            ->where('bank_account_id', (string) ($account['id'] ?? ''))
            ->latest('id')
            ->first();

        if ($verification === null || ! hash_equals($verification->account_fingerprint, self::fingerprint($account))) {
            return null;
        }

        return $verification;
    }
}