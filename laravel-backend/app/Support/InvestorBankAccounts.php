<?php

namespace App\Support;

use Illuminate\Support\Str;

class InvestorBankAccounts
{
    /**
     * Normalize bank accounts from profile meta, migrating legacy keys when needed.
     *
     * @param  array<string, mixed>  $meta
     * @return list<array<string, mixed>>
     */
    public static function normalizeFromMeta(array $meta): array
    {
        $accounts = [];

        if (isset($meta['bank_accounts']) && is_array($meta['bank_accounts']) && $meta['bank_accounts'] !== []) {
            foreach ($meta['bank_accounts'] as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $normalized = self::normalizeAccount($row);
                if (self::isUsable($normalized)) {
                    $accounts[] = $normalized;
                }
            }
        }

        if ($accounts === []) {
            $withdrawBank = is_array($meta['withdraw_bank'] ?? null) ? $meta['withdraw_bank'] : [];
            if (self::legacyHasDetails($withdrawBank, true)) {
                $accounts[] = self::normalizeAccount([
                    'bank_name' => $withdrawBank['bank_name'] ?? $withdrawBank['bank'] ?? '',
                    'account_holder' => $withdrawBank['account_holder'] ?? '',
                    'account_number' => $withdrawBank['account_number'] ?? '',
                    'iban' => $withdrawBank['iban'] ?? '',
                    'swift' => $withdrawBank['swift'] ?? '',
                    'branch' => $withdrawBank['branch'] ?? '',
                    'currency' => $withdrawBank['currency'] ?? 'USD',
                    'is_default' => true,
                ]);
            }
        }

        if ($accounts === []) {
            $bank = is_array($meta['bank'] ?? null) ? $meta['bank'] : [];
            if (self::legacyHasDetails($bank, false)) {
                $accounts[] = self::normalizeAccount([
                    'bank_name' => $bank['name'] ?? $bank['bank_name'] ?? '',
                    'account_holder' => $bank['holder'] ?? $bank['account_holder'] ?? '',
                    'account_number' => $bank['account'] ?? $bank['account_number'] ?? '',
                    'iban' => $bank['iban'] ?? '',
                    'swift' => $bank['swift'] ?? '',
                    'branch' => $bank['branch'] ?? '',
                    'currency' => $bank['currency'] ?? 'USD',
                    'is_default' => true,
                ]);
            }
        }

        return self::ensureDefault(self::dedupeByFingerprint($accounts));
    }

    /**
     * @param  list<array<string, mixed>>  $accounts
     * @return list<array<string, mixed>>
     */
    public static function ensureDefault(array $accounts): array
    {
        if ($accounts === []) {
            return [];
        }

        $hasDefault = false;
        foreach ($accounts as $account) {
            if (! empty($account['is_default'])) {
                $hasDefault = true;
                break;
            }
        }

        if (! $hasDefault || count($accounts) === 1) {
            return self::setDefault($accounts, (string) ($accounts[0]['id'] ?? ''));
        }

        // Keep exactly one default (first marked wins).
        $seenDefault = false;
        foreach ($accounts as $i => $account) {
            if (! empty($account['is_default'])) {
                if ($seenDefault) {
                    $accounts[$i]['is_default'] = false;
                } else {
                    $seenDefault = true;
                    $accounts[$i]['is_default'] = true;
                }
            } else {
                $accounts[$i]['is_default'] = false;
            }
        }

        return array_values($accounts);
    }

    /**
     * @param  list<array<string, mixed>>  $accounts
     * @return list<array<string, mixed>>
     */
    public static function setDefault(array $accounts, string $id): array
    {
        if ($accounts === []) {
            return [];
        }

        $matched = false;
        foreach ($accounts as $i => $account) {
            $isMatch = $id !== '' && (string) ($account['id'] ?? '') === $id;
            if ($isMatch) {
                $matched = true;
            }
            $accounts[$i]['is_default'] = $isMatch;
        }

        if (! $matched) {
            foreach ($accounts as $i => $_) {
                $accounts[$i]['is_default'] = $i === 0;
            }
        }

        return array_values($accounts);
    }

    /**
     * @param  array<string, mixed>  $account
     */
    public static function fingerprint(array $account): string
    {
        $accountNumber = strtolower(preg_replace('/\s+/', '', trim((string) ($account['account_number'] ?? ''))) ?? '');
        $iban = strtolower(preg_replace('/\s+/', '', trim((string) ($account['iban'] ?? ''))) ?? '');
        $bankName = strtolower(trim((string) ($account['bank_name'] ?? '')));

        $primary = $accountNumber !== '' ? $accountNumber : $iban;

        return $bankName.'|'.$primary;
    }

    /**
     * @param  list<array<string, mixed>>  $accounts
     * @param  array<string, mixed>  $incoming
     * @return list<array<string, mixed>>
     */
    public static function upsertAccount(array $accounts, array $incoming): array
    {
        $normalized = self::normalizeAccount($incoming);
        if (! self::isUsable($normalized)) {
            return self::ensureDefault($accounts);
        }

        $fp = self::fingerprint($normalized);
        foreach ($accounts as $i => $existing) {
            if (self::fingerprint($existing) === $fp) {
                $accounts[$i] = array_merge($existing, [
                    'bank_name' => $normalized['bank_name'],
                    'account_holder' => $normalized['account_holder'] !== ''
                        ? $normalized['account_holder']
                        : ($existing['account_holder'] ?? ''),
                    'account_number' => $normalized['account_number'] !== ''
                        ? $normalized['account_number']
                        : ($existing['account_number'] ?? ''),
                    'iban' => $normalized['iban'] !== '' ? $normalized['iban'] : ($existing['iban'] ?? ''),
                    'swift' => $normalized['swift'] !== '' ? $normalized['swift'] : ($existing['swift'] ?? ''),
                    'branch' => $normalized['branch'] !== '' ? $normalized['branch'] : ($existing['branch'] ?? ''),
                    'currency' => $normalized['currency'] !== '' ? $normalized['currency'] : ($existing['currency'] ?? 'USD'),
                ]);

                return self::ensureDefault($accounts);
            }
        }

        $accounts[] = $normalized;

        return self::ensureDefault($accounts);
    }

    /**
     * @param  list<array<string, mixed>>  $accounts
     * @return array<string, mixed>|null
     */
    public static function defaultAccount(array $accounts): ?array
    {
        foreach ($accounts as $account) {
            if (! empty($account['is_default']) && self::isUsable($account)) {
                return $account;
            }
        }

        foreach ($accounts as $account) {
            if (self::isUsable($account)) {
                return $account;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $account
     * @return array<string, mixed>
     */
    public static function normalizeAccount(array $account): array
    {
        $id = trim((string) ($account['id'] ?? ''));
        if ($id === '') {
            $id = (string) Str::uuid();
        }

        $currency = strtoupper(trim((string) ($account['currency'] ?? 'USD')));
        if ($currency === '') {
            $currency = 'USD';
        }

        return [
            'id' => $id,
            'bank_name' => trim((string) ($account['bank_name'] ?? $account['bank'] ?? $account['name'] ?? '')),
            'account_holder' => trim((string) ($account['account_holder'] ?? $account['holder'] ?? '')),
            'account_number' => trim((string) ($account['account_number'] ?? $account['account'] ?? '')),
            'iban' => trim((string) ($account['iban'] ?? '')),
            'swift' => trim((string) ($account['swift'] ?? '')),
            'branch' => trim((string) ($account['branch'] ?? '')),
            'currency' => $currency,
            'is_default' => (bool) ($account['is_default'] ?? false),
        ];
    }

    /**
     * @param  array<string, mixed>  $account
     */
    public static function isUsable(array $account): bool
    {
        $bankName = trim((string) ($account['bank_name'] ?? ''));
        $accountNumber = trim((string) ($account['account_number'] ?? ''));
        $iban = trim((string) ($account['iban'] ?? ''));

        return $bankName !== '' || $accountNumber !== '' || $iban !== '';
    }

    /**
     * @param  list<array<string, mixed>>  $accounts
     * @return list<array<string, mixed>>
     */
    public static function sanitizeForStorage(array $accounts): array
    {
        $out = [];
        foreach ($accounts as $row) {
            if (! is_array($row)) {
                continue;
            }
            $normalized = self::normalizeAccount($row);
            if (self::isUsable($normalized)) {
                $out[] = $normalized;
            }
        }

        return self::ensureDefault(self::dedupeByFingerprint($out));
    }

    /**
     * @param  array<string, mixed>  $legacy
     */
    private static function legacyHasDetails(array $legacy, bool $withdrawShape): bool
    {
        if ($withdrawShape) {
            return trim((string) ($legacy['bank_name'] ?? $legacy['bank'] ?? '')) !== ''
                || trim((string) ($legacy['account_number'] ?? '')) !== '';
        }

        return trim((string) ($legacy['name'] ?? $legacy['bank_name'] ?? '')) !== ''
            || trim((string) ($legacy['account'] ?? $legacy['account_number'] ?? '')) !== '';
    }

    /**
     * @param  list<array<string, mixed>>  $accounts
     * @return list<array<string, mixed>>
     */
    private static function dedupeByFingerprint(array $accounts): array
    {
        $seen = [];
        $out = [];
        foreach ($accounts as $account) {
            $fp = self::fingerprint($account);
            if ($fp === '|' || isset($seen[$fp])) {
                continue;
            }
            $seen[$fp] = true;
            $out[] = $account;
        }

        return $out;
    }
}
