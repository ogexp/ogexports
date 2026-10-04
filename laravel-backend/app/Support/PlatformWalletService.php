<?php

namespace App\Support;

use App\Models\PlatformWallet;
use App\Models\PlatformWalletTransaction;
use Illuminate\Validation\ValidationException;

class PlatformWalletService
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public static function credit(
        float $amount,
        string $type,
        string $reference,
        array $meta = [],
        string $currency = 'USD',
    ): PlatformWalletTransaction {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['Credit amount must be greater than zero.'],
            ]);
        }

        $existing = PlatformWalletTransaction::query()
            ->where('reference', $reference)
            ->where('type', $type)
            ->where('direction', 'credit')
            ->first();

        if ($existing) {
            return $existing;
        }

        $wallet = self::lockWallet($currency);
        $wallet->increment('balance', $amount);

        return PlatformWalletTransaction::query()->create([
            'platform_wallet_id' => $wallet->id,
            'type' => $type,
            'amount' => $amount,
            'direction' => 'credit',
            'reference' => $reference,
            'status' => 'completed',
            'meta' => $meta,
        ]);
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public static function debit(
        float $amount,
        string $type,
        string $reference,
        array $meta = [],
        string $currency = 'USD',
    ): PlatformWalletTransaction {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['Debit amount must be greater than zero.'],
            ]);
        }

        $existing = PlatformWalletTransaction::query()
            ->where('reference', $reference)
            ->where('type', $type)
            ->where('direction', 'debit')
            ->first();

        if ($existing) {
            return $existing;
        }

        $wallet = self::lockWallet($currency);
        $balance = (float) $wallet->balance;

        if ($amount > $balance + 0.0001) {
            throw ValidationException::withMessages([
                'platform_wallet' => [
                    'Insufficient platform wallet balance. Available: '.number_format($balance, 2, '.', ''),
                ],
            ]);
        }

        $wallet->decrement('balance', $amount);

        return PlatformWalletTransaction::query()->create([
            'platform_wallet_id' => $wallet->id,
            'type' => $type,
            'amount' => $amount,
            'direction' => 'debit',
            'reference' => $reference,
            'status' => 'completed',
            'meta' => $meta,
        ]);
    }

    public static function ensure(string $currency = 'USD'): PlatformWallet
    {
        return PlatformWallet::query()->firstOrCreate(
            ['currency' => strtoupper($currency)],
            ['balance' => 0],
        );
    }

    private static function lockWallet(string $currency): PlatformWallet
    {
        self::ensure($currency);

        return PlatformWallet::query()
            ->where('currency', strtoupper($currency))
            ->lockForUpdate()
            ->firstOrFail();
    }
}
