<?php

use App\Models\User;
use App\Models\Wallet;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns a wallet transaction only to its owner', function () {
    $this->seed(RoleSeeder::class);

    $owner = User::factory()->create([
        'account_status' => 'active',
        'email_verified_at' => now(),
    ]);
    $owner->assignRole('investor');

    $otherInvestor = User::factory()->create([
        'account_status' => 'active',
        'email_verified_at' => now(),
    ]);
    $otherInvestor->assignRole('investor');

    $ownerWallet = Wallet::query()->create([
        'user_id' => $owner->id,
        'currency' => 'USD',
        'available_balance' => 0,
        'pending_balance' => 0,
    ]);
    $otherWallet = Wallet::query()->create([
        'user_id' => $otherInvestor->id,
        'currency' => 'USD',
        'available_balance' => 0,
        'pending_balance' => 0,
    ]);
    $ownedTransaction = $ownerWallet->transactions()->create([
        'type' => 'deposit',
        'amount' => 250,
        'direction' => 'credit',
        'reference' => 'OWNER-TXN',
        'status' => 'approved',
    ]);
    $privateTransaction = $otherWallet->transactions()->create([
        'type' => 'deposit',
        'amount' => 400,
        'direction' => 'credit',
        'reference' => 'PRIVATE-TXN',
        'status' => 'approved',
    ]);

    $this->actingAs($owner)
        ->getJson("/api/investor/wallet/transactions/{$ownedTransaction->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $ownedTransaction->id)
        ->assertJsonPath('data.reference', 'OWNER-TXN');

    $this->actingAs($owner)
        ->getJson("/api/investor/wallet/transactions/{$privateTransaction->id}")
        ->assertNotFound();
});
