<?php

use App\Models\KycApplication;
use App\Models\PlatformSetting;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);

    PlatformSetting::query()->create([
        'site_name' => 'OG Exports',
        'registration_open' => true,
        'investment_open' => true,
        'supplier_module_enabled' => true,
        'investment_module_enabled' => true,
        'currency' => 'USD',
    ]);

    $this->investor = User::factory()->create(['account_status' => 'active']);
    $this->investor->assignRole('investor');

    $this->admin = User::factory()->create(['account_status' => 'active']);
    $this->admin->assignRole('admin');

    $this->documents = [
        ['doc_type' => 'passport_id', 'path' => 'upload/kyc/investor/passport.jpg', 'original_name' => 'passport.jpg'],
        ['doc_type' => 'proof_of_address', 'path' => 'upload/kyc/investor/address.pdf', 'original_name' => 'address.pdf'],
        ['doc_type' => 'tax_certificate', 'path' => 'upload/kyc/investor/tax.pdf', 'original_name' => 'tax.pdf'],
    ];
});

it('requires every investor KYC document when the mobile app submits an application', function () {
    $this->actingAs($this->investor->fresh())
        ->postJson('/api/investor/kyc', [
            'type' => 'investor',
            'country' => 'Pakistan',
            'payload' => ['name' => 'Ayesha Khan'],
            'documents' => [$this->documents[0]],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('documents');

    $this->assertDatabaseCount('kyc_applications', 0);
});

it('passes mobile KYC documents through compliance review and returns approval to the investor profile', function () {
    $this->actingAs($this->investor->fresh())
        ->putJson('/api/investor/profile', [
            'name' => 'Ayesha Khan',
            'dob' => '1990-05-14',
            'nationality' => 'Pakistani',
            'country' => 'Pakistan',
            'city' => 'Karachi',
            'address' => '12 Clifton Road',
        ])
        ->assertOk()
        ->assertJsonPath('data.personal.name', 'Ayesha Khan');

    foreach ($this->documents as $document) {
        $this->actingAs($this->investor->fresh())
            ->postJson('/api/investor/profile/kyc/upload', $document)
            ->assertCreated();
    }

    $submission = $this->actingAs($this->investor->fresh())
        ->postJson('/api/investor/kyc', [
            'type' => 'investor',
            'country' => 'Pakistan',
            'payload' => [
                'name' => 'Ayesha Khan',
                'dob' => '1990-05-14',
                'nationality' => 'Pakistani',
                'city' => 'Karachi',
                'address' => '12 Clifton Road',
            ],
            'documents' => $this->documents,
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->json('data');

    $applicationId = $submission['id'];

    $adminList = $this->actingAs($this->admin)
        ->getJson('/api/admin/compliance/kyc?per_page=100')
        ->assertOk();

    $listedApplication = collect($adminList->json('data'))->firstWhere('id', $applicationId);
    expect($listedApplication)->not->toBeNull()
        ->and($listedApplication['user']['name'])->toBe('Ayesha Khan')
        ->and(collect($listedApplication['documents'])->pluck('doc_type')->all())
        ->toEqualCanonicalizing(['passport_id', 'proof_of_address', 'tax_certificate']);

    $this->actingAs($this->admin)
        ->postJson("/api/admin/compliance/kyc/{$applicationId}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    $this->actingAs($this->investor->fresh())
        ->getJson('/api/investor/profile')
        ->assertOk()
        ->assertJsonPath('data.kyc.status', 'approved')
        ->assertJsonPath('data.kyc.application.status', 'approved')
        ->assertJsonPath('data.kyc.steps.0.status', 'verified')
        ->assertJsonPath('data.kyc.steps.1.status', 'verified')
        ->assertJsonPath('data.kyc.steps.2.status', 'verified');
});

it('does not let compliance approve an investor application with missing required documents', function () {
    $this->actingAs($this->investor->fresh())
        ->postJson('/api/investor/profile/kyc/upload', $this->documents[0])
        ->assertCreated();

    $application = KycApplication::query()->where('user_id', $this->investor->id)->firstOrFail();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/compliance/kyc/{$application->id}/approve")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('documents');

    $this->assertDatabaseHas('kyc_applications', [
        'id' => $application->id,
        'status' => 'pending',
    ]);
});

it('shows admin rejection on the investor KYC profile and permits a fresh document upload', function () {
    $this->actingAs($this->investor->fresh())
        ->postJson('/api/investor/profile/kyc/upload', $this->documents[0])
        ->assertCreated();

    $firstApplication = KycApplication::query()->where('user_id', $this->investor->id)->firstOrFail();

    $this->actingAs($this->admin)
        ->postJson("/api/admin/compliance/kyc/{$firstApplication->id}/reject", ['notes' => 'Please provide a clearer ID image.'])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected');

    $this->actingAs($this->investor->fresh())
        ->getJson('/api/investor/profile')
        ->assertOk()
        ->assertJsonPath('data.kyc.status', 'rejected')
        ->assertJsonPath('data.kyc.application.notes', 'Please provide a clearer ID image.');

    $uploadResponse = $this->actingAs($this->investor->fresh())
        ->postJson('/api/investor/profile/kyc/upload', $this->documents[0])
        ->assertCreated()
        ->assertJsonPath('data.kyc.status', 'pending');

    expect($uploadResponse->json('data.kyc.application_id'))->not->toBe($firstApplication->id);
});
