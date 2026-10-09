<?php

namespace App\Support;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Validation\ValidationException;

class WalletReservation
{
    /**
     * Lock wallet, validate amount <= available balance, move funds to pending, and record a pending debit transaction.
     *
     * @param  array<string, mixed>  $meta
     */
    public static function reserve(
        User $user,
        float $amount,
        string $type,
        string $reference,
        array $meta = [],
    ): Wallet {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['Amount must be greater than zero.'],
            ]);
        }

        $wallet = Wallet::query()
            ->where('user_id', $user->id)
            ->lockForUpdate()
            ->first();

        if (! $wallet) {
            $wallet = Wallet::create([
                'user_id' => $user->id,
                'currency' => 'USD',
                'available_balance' => 0,
                'pending_balance' => 0,
            ]);
            $wallet = Wallet::query()->whereKey($wallet->id)->lockForUpdate()->firstOrFail();
        }

        $available = (float) $wallet->available_balance;

        if ($amount > $available + 0.0001) {
            throw ValidationException::withMessages([
                'amount' => ['Insufficient wallet balance. Available: '.number_format($available, 2, '.', '')],
            ]);
        }

        $wallet->decrement('available_balance', $amount);
        $wallet->increment('pending_balance', $amount);

        WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => $type,
            'amount' => $amount,
            'direction' => 'debit',
            'reference' => $reference,
            'status' => 'pending',
            'meta' => $meta,
        ]);

        return $wallet->fresh();
    }
}
