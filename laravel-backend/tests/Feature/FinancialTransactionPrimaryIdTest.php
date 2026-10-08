<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;

uses(RefreshDatabase::class);

it('renumbers financial primary IDs and preserves their references', function () {
    $migration = require database_path(
        'migrations/2026_10_08_100000_convert_financial_transaction_primary_ids_to_eight_digits.php'
    );

    // Rewind the empty schema so this test can create representative legacy rows.
    $migration->down();

    $user = User::factory()->create();
    $now = now();

    $projectId = DB::table('investment_projects')->insertGetId([
        'title' => 'ID migration fixture',
        'type' => 'container',
        'status' => 'active',
        'target_amount' => 5000,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $walletId = DB::table('wallets')->insertGetId([
        'user_id' => $user->id,
        'currency' => 'USD',
        'available_balance' => 100,
        'pending_balance' => 0,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $platformWalletId = DB::table('platform_wallets')->insertGetId([
        'currency' => 'USD',
        'balance' => 0,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $investmentId = DB::table('investments')->insertGetId([
        'project_id' => $projectId,
        'investor_id' => $user->id,
        'amount' => 100,
        'status' => 'active',
        'invested_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $depositId = DB::table('deposits')->insertGetId([
        'investor_id' => $user->id,
        'amount' => 100,
        'method' => 'bank_transfer',
        'status' => 'approved',
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $withdrawalId = DB::table('withdrawals')->insertGetId([
        'investor_id' => $user->id,
        'amount' => 10,
        'status' => 'pending',
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $platformTransactionId = DB::table('platform_wallet_transactions')->insertGetId([
        'platform_wallet_id' => $platformWalletId,
        'type' => 'fixture',
        'amount' => 1,
        'direction' => 'credit',
        'status' => 'completed',
        'meta' => json_encode(['investment_id' => $investmentId]),
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $walletTransactionId = DB::table('wallet_transactions')->insertGetId([
        'wallet_id' => $walletId,
        'type' => 'fixture',
        'amount' => 1,
        'direction' => 'credit',
        'status' => 'completed',
        'meta' => json_encode([
            'investment_id' => $investmentId,
            'deposit_id' => $depositId,
            'withdrawal_id' => $withdrawalId,
            'platform_wallet_transaction_id' => $platformTransactionId,
        ]),
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    DB::table('platform_wallet_transactions')
        ->where('id', $platformTransactionId)
        ->update([
            'meta' => json_encode([
                'investment_id' => $investmentId,
                'wallet_transaction_id' => $walletTransactionId,
            ]),
        ]);

    $distributionId = DB::table('investment_profit_distributions')->insertGetId([
        'investment_id' => $investmentId,
        'project_id' => $projectId,
        'investor_id' => $user->id,
        'project_type' => 'container',
        'invested_amount' => 100,
        'profit_amount' => 5,
        'total_return' => 105,
        'roi_pct' => 5,
        'wallet_transaction_id' => $walletTransactionId,
        'distributed_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    DB::table('investment_payout_progress')->insert([
        'investment_id' => $investmentId,
        'status' => 'planned',
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    DB::table('notifications')->insert([
        'user_id' => $user->id,
        'type' => 'investment',
        'title' => 'Investment update',
        'data' => json_encode(['investment_id' => $investmentId]),
        'created_at' => $now,
    ]);
    DB::table('audit_logs')->insert([
        'user_id' => $user->id,
        'action' => 'deposit.approved',
        'module' => 'finance',
        'meta' => json_encode(['deposit_id' => $depositId]),
        'created_at' => $now,
    ]);

    $migration->up();

    $offset = 10_000_000;
    $ids = [
        DB::table('investments')->where('id', $investmentId + $offset)->value('id'),
        DB::table('wallet_transactions')->where('id', $walletTransactionId + $offset)->value('id'),
        DB::table('deposits')->where('id', $depositId + $offset)->value('id'),
        DB::table('withdrawals')->where('id', $withdrawalId + $offset)->value('id'),
        DB::table('investment_profit_distributions')->where('id', $distributionId + $offset)->value('id'),
        DB::table('platform_wallet_transactions')->where('id', $platformTransactionId + $offset)->value('id'),
    ];

    foreach ($ids as $id) {
        expect((string) $id)->toMatch('/^[1-9][0-9]{7}$/');
    }

    $distribution = DB::table('investment_profit_distributions')->where('id', $distributionId + $offset)->first();
    expect((int) $distribution->investment_id)->toBe($investmentId + $offset);
    expect((int) $distribution->wallet_transaction_id)->toBe($walletTransactionId + $offset);
    expect((int) DB::table('investment_payout_progress')->value('investment_id'))->toBe($investmentId + $offset);

    $walletMeta = json_decode(
        (string) DB::table('wallet_transactions')->where('id', $walletTransactionId + $offset)->value('meta'),
        true
    );
    expect($walletMeta['investment_id'])->toBe($investmentId + $offset);
    expect($walletMeta['deposit_id'])->toBe($depositId + $offset);
    expect($walletMeta['withdrawal_id'])->toBe($withdrawalId + $offset);
    expect($walletMeta['platform_wallet_transaction_id'])->toBe($platformTransactionId + $offset);

    $platformMeta = json_decode(
        (string) DB::table('platform_wallet_transactions')->where('id', $platformTransactionId + $offset)->value('meta'),
        true
    );
    expect($platformMeta['investment_id'])->toBe($investmentId + $offset);
    expect($platformMeta['wallet_transaction_id'])->toBe($walletTransactionId + $offset);

    $notificationData = json_decode((string) DB::table('notifications')->value('data'), true);
    expect($notificationData['investment_id'])->toBe($investmentId + $offset);
    $auditMeta = json_decode((string) DB::table('audit_logs')->value('meta'), true);
    expect($auditMeta['deposit_id'])->toBe($depositId + $offset);
    if (DB::connection()->getDriverName() === 'sqlite') {
        expect(DB::select('PRAGMA foreign_key_check'))->toBe([]);
    }

    $nextWalletTransactionId = DB::table('wallet_transactions')->insertGetId([
        'wallet_id' => $walletId,
        'type' => 'fixture_followup',
        'amount' => 1,
        'direction' => 'credit',
        'status' => 'completed',
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    expect((string) $nextWalletTransactionId)->toMatch('/^[1-9][0-9]{7}$/');

    expect(fn () => DB::table('deposits')
        ->where('id', $depositId + $offset)
        ->update(['id' => 100_000_000]))
        ->toThrow(QueryException::class);
});
