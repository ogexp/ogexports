<?php

use App\Models\InvestorBankAccountVerification;
use App\Models\User;
use App\Models\UserProfile;
use App\Support\InvestorBankAccountPresenter;
use App\Support\InvestorBankAccounts;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');

    $this->investor = User::factory()->create(['account_status' => 'active']);
    $this->investor->assignRole('investor');

    $this->account = [
        'id' => 'bank-review-1',
        'bank_name' => 'Habib Bank',
        'account_holder' => 'Investor Example',
        'account_number' => '1234567890',
        'iban' => 'PK00HABB1234567890',
        'swift' => 'HABBPKKA',
        'branch' => 'Lahore',
        'currency' => 'PKR',
        'is_default' => true,
    ];

    UserProfile::query()->create([
        'user_id' => $this->investor->id,
        'country' => 'Pakistan',
        'meta' => ['bank_accounts' => [$this->account]],
    ]);

    $this->proofPath = 'bank-proofs/'.uniqid('review-', true).'.pdf';
    Storage::disk('local')->put($this->proofPath, '%PDF-1.4 private proof');

    $normalizedAccount = InvestorBankAccounts::normalizeFromMeta([
        'bank_accounts' => [$this->account],
    ])[0];

    $this->verification = InvestorBankAccountVerification::query()->create([
        'investor_id' => $this->investor->id,
        'bank_account_id' => $this->account['id'],
        'account_fingerprint' => InvestorBankAccountPresenter::fingerprint($normalizedAccount),
        'document_path' => $this->proofPath,
        'original_name' => 'statement.pdf',
        'status' => 'pending',
    ]);
});

afterEach(function () {
    if (isset($this->proofPath)) {
        Storage::disk('local')->delete($this->proofPath);
    }
});

it('requires an admin and returns masked, paginated status queues', function () {
    $this->getJson('/api/admin/compliance/bank-accounts')->assertUnauthorized();

    $this->actingAs($this->investor)
        ->getJson('/api/admin/compliance/bank-accounts')
        ->assertForbidden();

    InvestorBankAccountVerification::query()->create([
        'investor_id' => $this->investor->id,
        'bank_account_id' => $this->account['id'],
        'account_fingerprint' => $this->verification->account_fingerprint,
        'document_path' => $this->proofPath,
        'original_name' => 'statement.pdf',
        'status' => 'pending',
    ]);
    InvestorBankAccountVerification::query()->create([
        'investor_id' => $this->investor->id,
        'bank_account_id' => 'verified-account',
        'account_fingerprint' => str_repeat('a', 64),
        'document_path' => $this->proofPath,
        'original_name' => 'statement.pdf',
        'status' => 'verified',
    ]);
    InvestorBankAccountVerification::query()->create([
        'investor_id' => $this->investor->id,
        'bank_account_id' => 'rejected-account',
        'account_fingerprint' => str_repeat('b', 64),
        'document_path' => $this->proofPath,
        'original_name' => 'statement.pdf',
        'status' => 'rejected',
    ]);

    $this->actingAs($this->admin)
        ->getJson('/api/admin/compliance/bank-accounts?status=pending&per_page=1')
        ->assertOk()
        ->assertJsonPath('current_page', 1)
        ->assertJsonPath('last_page', 2)
        ->assertJsonPath('total', 2)
        ->assertJsonPath('data.0.bank_account.masked_account_identifier', '•••• 7890')
        ->assertDontSee($this->account['account_number'])
        ->assertDontSee($this->account['iban']);

    $this->actingAs($this->admin)
        ->getJson('/api/admin/compliance/bank-accounts?status=verified')
        ->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('data.0.status', 'verified');

    $this->actingAs($this->admin)
        ->getJson('/api/admin/compliance/bank-accounts?status=rejected')
        ->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('data.0.status', 'rejected');
});

it('serves proof files only to admins through the authenticated route', function () {
    $proofUrl = "/api/admin/compliance/bank-accounts/{$this->verification->id}/proof";

    $this->getJson($proofUrl)->assertUnauthorized();

    $this->actingAs($this->investor)
        ->getJson($proofUrl)
        ->assertForbidden();

    $response = $this->actingAs($this->admin)
        ->get($proofUrl, ['Accept' => 'application/pdf']);
    $response->assertOk();

    expect($response->baseResponse->getFile()->getContent())->toContain('%PDF-1.4 private proof');
    $cacheControl = strtolower($response->baseResponse->headers->get('Cache-Control'));
    expect($cacheControl)
        ->toContain('private')
        ->toContain('no-store')
        ->toContain('max-age=0')
        ->not->toContain('public');
});

it('requires a rejection note and records the admin decision', function () {
    $reviewUrl = "/api/admin/compliance/bank-accounts/{$this->verification->id}";

    $this->actingAs($this->admin)
        ->postJson("{$reviewUrl}/reject", ['notes' => '  '])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('notes');

    expect($this->verification->fresh()->status)->toBe('pending');

    $this->actingAs($this->admin)
        ->postJson("{$reviewUrl}/reject", ['notes' => 'Name does not match'])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.review_notes', 'Name does not match');

    $this->verification->refresh();
    expect($this->verification->reviewed_by)->toBe($this->admin->id)
        ->and($this->verification->reviewed_at)->not->toBeNull();

    $this->actingAs($this->admin)
        ->postJson("{$reviewUrl}/approve")
        ->assertStatus(409);
});

it('approves unchanged bank details', function () {
    $reviewUrl = "/api/admin/compliance/bank-accounts/{$this->verification->id}";

    $this->actingAs($this->admin)
        ->postJson("{$reviewUrl}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'verified');
});

it('blocks approval after bank details change', function () {
    $reviewUrl = "/api/admin/compliance/bank-accounts/{$this->verification->id}";
    $profile = $this->investor->fresh()->profile;
    $changedAccount = $this->account;
    $changedAccount['account_holder'] = 'Different Account Holder';
    $profile->update(['meta' => ['bank_accounts' => [$changedAccount]]]);

    $this->actingAs($this->admin)
        ->postJson("{$reviewUrl}/approve")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('bank_account');

    expect($this->verification->fresh()->status)->toBe('pending');
});