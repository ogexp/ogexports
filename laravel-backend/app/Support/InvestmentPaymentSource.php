<?php

namespace App\Support;

use App\Models\Deposit;
use App\Models\Investment;
use App\Models\WalletTransaction;
use Illuminate\Support\Carbon;

class InvestmentPaymentSource
{
    public const WALLET = 'wallet';

    public const BANK_TRANSFER = 'bank_transfer';

    public const WIRE_TRANSFER = 'wire_transfer';

    public const SWIFT = 'swift';

    public const ONLINE_BANKING = 'online_banking';

    public const UNKNOWN = 'unknown';

    /** @var list<string> */
    public const ALL = [
        self::WALLET,
        self::BANK_TRANSFER,
        self::WIRE_TRANSFER,
        self::SWIFT,
        self::ONLINE_BANKING,
    ];

    public static function label(?string $source): string
    {
        return match (self::normalize($source ?? '')) {
            self::WALLET => 'OG Wallet',
            self::BANK_TRANSFER => 'Bank Transfer',
            self::WIRE_TRANSFER => 'Wire Transfer',
            self::SWIFT => 'SWIFT Transfer',
            self::ONLINE_BANKING => 'Online Banking',
            default => 'Unknown',
        };
    }

    public static function normalize(string $raw): string
    {
        $key = strtolower(trim($raw));

        return match ($key) {
            self::WALLET, 'og wallet', 'og_wallet' => self::WALLET,
            self::BANK_TRANSFER, 'bank', 'bank transfer' => self::BANK_TRANSFER,
            self::WIRE_TRANSFER, 'wire', 'wire transfer' => self::WIRE_TRANSFER,
            self::SWIFT, 'swift transfer' => self::SWIFT,
            self::ONLINE_BANKING, 'online', 'online banking', 'online payment', 'card' => self::ONLINE_BANKING,
            '' => self::UNKNOWN,
            default => in_array($key, self::ALL, true) ? $key : self::UNKNOWN,
        };
    }

    public static function resolve(Investment $investment): string
    {
        if ($investment->payment_source) {
            $normalized = self::normalize($investment->payment_source);

            return $normalized !== self::UNKNOWN ? $normalized : $investment->payment_source;
        }

        $reference = $investment->reference ?: 'INV-'.$investment->id;

        $hasWalletTxn = WalletTransaction::query()
            ->where('type', 'investment')
            ->where('reference', $reference)
            ->whereHas('wallet', fn ($q) => $q->where('user_id', $investment->investor_id))
            ->exists();

        return $hasWalletTxn ? self::WALLET : self::UNKNOWN;
    }

    /**
     * Approved deposits that likely funded the investor wallet before this investment.
     *
     * @return list<array<string, mixed>>
     */
    public static function walletFundingDeposits(Investment $investment): array
    {
        $source = self::resolve($investment);

        if ($source !== self::WALLET) {
            return [];
        }

        $investedAt = $investment->invested_at ?? $investment->created_at ?? now();
        $lookbackStart = Carbon::parse($investedAt)->subDays(90);

        $query = Deposit::query()
            ->where('investor_id', $investment->investor_id)
            ->where('status', DepositReviewStatuses::APPROVED)
            ->where(function ($q) use ($investedAt) {
                $q->where('reviewed_at', '<=', $investedAt)
                    ->orWhere(function ($q2) use ($investedAt) {
                        $q2->whereNull('reviewed_at')
                            ->where('created_at', '<=', $investedAt);
                    });
            })
            ->where('created_at', '>=', $lookbackStart)
            ->where(function ($q) use ($investment) {
                $q->whereNull('project_id')
                    ->orWhere('project_id', $investment->project_id);
            })
            ->orderByDesc('reviewed_at')
            ->orderByDesc('created_at');

        return $query->get()->map(function (Deposit $deposit) {
            $method = (string) ($deposit->method ?? '');

            return [
                'id' => $deposit->id,
                'reference' => $deposit->reference ?: sprintf('OGDEP-INV-%03d', $deposit->id),
                'method' => self::normalize($method) !== self::UNKNOWN ? self::normalize($method) : $method,
                'method_label' => self::methodLabel($method),
                'amount' => (float) $deposit->amount,
                'currency' => $deposit->currency ?: 'USD',
                'reviewed_at' => $deposit->reviewed_at?->toIso8601String(),
                'project_id' => $deposit->project_id,
            ];
        })->values()->all();
    }

    public static function methodLabel(string $method): string
    {
        $normalized = self::normalize($method);

        if ($normalized !== self::UNKNOWN) {
            return self::label($normalized);
        }

        return $method !== '' ? $method : 'Unknown';
    }
}
