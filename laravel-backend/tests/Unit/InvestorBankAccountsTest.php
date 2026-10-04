<?php

use App\Support\InvestorBankAccounts;

it('migrates legacy withdraw_bank into bank_accounts and sets default', function () {
    $accounts = InvestorBankAccounts::normalizeFromMeta([
        'withdraw_bank' => [
            'bank_name' => 'HBL',
            'account_holder' => 'Demo Investor',
            'account_number' => '123456',
            'iban' => 'PK00HBL000123',
            'swift' => 'HABBPKKA',
            'branch' => 'Karachi',
            'currency' => 'PKR',
        ],
    ]);

    expect($accounts)->toHaveCount(1)
        ->and($accounts[0]['bank_name'])->toBe('HBL')
        ->and($accounts[0]['account_number'])->toBe('123456')
        ->and($accounts[0]['is_default'])->toBeTrue()
        ->and($accounts[0]['id'])->not->toBeEmpty();
});

it('migrates legacy profile bank when withdraw_bank is empty', function () {
    $accounts = InvestorBankAccounts::normalizeFromMeta([
        'bank' => [
            'name' => 'Meezan',
            'holder' => 'Demo',
            'account' => '998877',
            'currency' => 'PKR',
        ],
    ]);

    expect($accounts)->toHaveCount(1)
        ->and($accounts[0]['bank_name'])->toBe('Meezan')
        ->and($accounts[0]['account_holder'])->toBe('Demo')
        ->and($accounts[0]['account_number'])->toBe('998877')
        ->and($accounts[0]['is_default'])->toBeTrue();
});

it('prefers bank_accounts over legacy keys', function () {
    $accounts = InvestorBankAccounts::normalizeFromMeta([
        'bank_accounts' => [
            [
                'id' => 'acc-1',
                'bank_name' => 'Primary Bank',
                'account_holder' => 'A',
                'account_number' => '111',
                'currency' => 'USD',
                'is_default' => true,
            ],
        ],
        'withdraw_bank' => [
            'bank_name' => 'Legacy',
            'account_number' => '999',
        ],
    ]);

    expect($accounts)->toHaveCount(1)
        ->and($accounts[0]['bank_name'])->toBe('Primary Bank');
});

it('auto-sets single account as default', function () {
    $accounts = InvestorBankAccounts::ensureDefault([
        [
            'id' => 'only',
            'bank_name' => 'Solo',
            'account_holder' => 'X',
            'account_number' => '1',
            'iban' => '',
            'swift' => '',
            'branch' => '',
            'currency' => 'USD',
            'is_default' => false,
        ],
    ]);

    expect($accounts[0]['is_default'])->toBeTrue();
});

it('does not duplicate accounts with the same fingerprint on upsert', function () {
    $existing = [
        [
            'id' => 'acc-1',
            'bank_name' => 'HBL',
            'account_holder' => 'Old Name',
            'account_number' => '123456',
            'iban' => '',
            'swift' => '',
            'branch' => '',
            'currency' => 'PKR',
            'is_default' => true,
        ],
    ];

    $updated = InvestorBankAccounts::upsertAccount($existing, [
        'bank_name' => 'HBL',
        'account_holder' => 'New Name',
        'account_number' => '123456',
        'currency' => 'PKR',
    ]);

    expect($updated)->toHaveCount(1)
        ->and($updated[0]['account_holder'])->toBe('New Name')
        ->and($updated[0]['id'])->toBe('acc-1');
});

it('appends a new account when fingerprint differs', function () {
    $existing = [
        [
            'id' => 'acc-1',
            'bank_name' => 'HBL',
            'account_holder' => 'A',
            'account_number' => '111',
            'iban' => '',
            'swift' => '',
            'branch' => '',
            'currency' => 'PKR',
            'is_default' => true,
        ],
    ];

    $updated = InvestorBankAccounts::upsertAccount($existing, [
        'bank_name' => 'UBL',
        'account_holder' => 'B',
        'account_number' => '222',
        'currency' => 'PKR',
    ]);

    expect($updated)->toHaveCount(2)
        ->and(collect($updated)->pluck('account_number')->all())->toContain('111', '222');
});
