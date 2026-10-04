<?php

use App\Mail\ContactFormAlert;
use App\Models\AppNotification;
use App\Models\ContactMessage;
use App\Models\User;
use App\Support\AdminNotificationTypes;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    Mail::fake();
    $this->seed(RoleSeeder::class);
    config([
        'mail.contact_to' => 'info@ogexports.co',
        'mail.quote_to' => 'sales@ogexports.co',
    ]);
});

it('stores a contact message and notifies info@ogexports.co', function () {
    $admin = User::factory()->create(['account_status' => 'active']);
    $admin->assignRole('admin');

    $response = $this->postJson('/api/contact', [
        'name' => 'Jane Buyer',
        'email' => 'jane@example.com',
        'phone' => '+44 7700 900123',
        'subject' => 'Supply contract inquiry',
        'message' => 'We need monthly basmati shipments to the UK.',
        'type' => 'contact',
        'meta' => [
            'company' => 'Trade Co',
            'inquiry_type' => 'buyer',
            'source' => 'home',
        ],
    ]);

    $response->assertCreated()
        ->assertJsonPath('message', 'Message sent successfully.')
        ->assertJsonPath('mail_sent', true);

    $this->assertDatabaseHas('contact_messages', [
        'name' => 'Jane Buyer',
        'email' => 'jane@example.com',
        'type' => 'contact',
        'status' => 'new',
    ]);

    Mail::assertSent(ContactFormAlert::class, function (ContactFormAlert $mail) {
        return $mail->hasTo('info@ogexports.co')
            && $mail->contactMessage->email === 'jane@example.com';
    });

    expect(
        AppNotification::query()
            ->where('user_id', $admin->id)
            ->where('type', AdminNotificationTypes::CONTACT_SUBMITTED)
            ->count()
    )->toBe(1);
});

it('stores a public quote and notifies sales@ogexports.co', function () {
    $response = $this->postJson('/api/contact', [
        'name' => 'Ahmed Importer',
        'email' => 'ahmed@importer.com',
        'subject' => 'Quote Request: Premium Basmati Rice',
        'message' => "Company: Gulf Foods\nCountry: UAE\nQuantity: 2 x 40ft\nDelivery: CIF\n\nNeed organic cert.",
        'type' => 'public_quote',
        'meta' => [
            'product_name' => 'Premium Basmati Rice',
            'company' => 'Gulf Foods',
            'country' => 'UAE',
            'quantity' => '2 x 40ft',
            'delivery_term' => 'CIF',
        ],
    ]);

    $response->assertCreated()
        ->assertJsonPath('mail_sent', true);

    $this->assertDatabaseHas('contact_messages', [
        'email' => 'ahmed@importer.com',
        'type' => 'public_quote',
    ]);

    Mail::assertSent(ContactFormAlert::class, function (ContactFormAlert $mail) {
        return $mail->hasTo('sales@ogexports.co')
            && $mail->contactMessage->type === 'public_quote';
    });
});

it('infers public_quote type from Quote Request subject', function () {
    $this->postJson('/api/contact', [
        'name' => 'Sam',
        'email' => 'sam@example.com',
        'subject' => 'Quote Request: Jasmine Rice',
        'message' => 'Need pricing for 1 container.',
    ])->assertCreated();

    $this->assertDatabaseHas('contact_messages', [
        'email' => 'sam@example.com',
        'type' => 'public_quote',
    ]);

    Mail::assertSent(ContactFormAlert::class, function (ContactFormAlert $mail) {
        return $mail->hasTo('sales@ogexports.co');
    });
});

it('rejects contact submissions missing required fields', function () {
    $this->postJson('/api/contact', [
        'name' => '',
        'email' => 'not-an-email',
        'message' => '',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'email', 'message']);

    expect(ContactMessage::query()->count())->toBe(0);
    Mail::assertNothingSent();
});

it('returns 202 when mail delivery fails but still saves the message', function () {
    Mail::swap(new class
    {
        public function to(mixed $users): never
        {
            throw new RuntimeException('SMTP connection refused');
        }
    });

    $response = $this->postJson('/api/contact', [
        'name' => 'Broken SMTP User',
        'email' => 'broken@example.com',
        'subject' => 'Delivery test',
        'message' => 'Please confirm this still saves when mail fails.',
        'type' => 'contact',
    ]);

    $response->assertStatus(202)
        ->assertJsonPath('mail_sent', false)
        ->assertJsonPath('message', 'Your message was saved but email delivery failed. Our team will follow up shortly.')
        ->assertJsonPath('mail_error', 'Could not connect to the email server.');

    $this->assertDatabaseHas('contact_messages', [
        'email' => 'broken@example.com',
        'status' => 'new',
    ]);
});

it('still creates a public quote when the admin role is missing', function () {
    // Override beforeEach RoleSeeder: wipe roles so NotifiesAdmins cannot find `admin`.
    \Spatie\Permission\Models\Role::query()->delete();
    app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

    $response = $this->postJson('/api/contact', [
        'name' => 'No Admin Role Buyer',
        'email' => 'no-admin@example.com',
        'subject' => 'Quote Request: Yellow Maize (Corn)',
        'message' => "Company: Test Co\nCountry: UK\nQuantity: 1 container\nDelivery: FOB\n\nNeed pricing.",
        'type' => 'public_quote',
        'meta' => [
            'product_name' => 'Yellow Maize (Corn)',
            'company' => 'Test Co',
            'country' => 'UK',
            'quantity' => '1 container',
            'delivery_term' => 'FOB',
        ],
    ]);

    $response->assertCreated()
        ->assertJsonPath('mail_sent', true);

    $this->assertDatabaseHas('contact_messages', [
        'email' => 'no-admin@example.com',
        'type' => 'public_quote',
        'status' => 'new',
    ]);

    Mail::assertSent(ContactFormAlert::class, function (ContactFormAlert $mail) {
        return $mail->hasTo('sales@ogexports.co')
            && $mail->contactMessage->email === 'no-admin@example.com';
    });
});
