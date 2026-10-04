<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\NewsletterSubscriber;
use App\Models\PartnerApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

/**
 * Public contact / quote form.
 * Intentionally simple: validate → save row → email sales/info → JSON response.
 * Never lets admin-notify or missing DB columns hard-crash the request.
 */
class ContactController extends Controller
{
    public function storeContact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'subject' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
            'type' => ['nullable', 'string', 'max:50'],
            'meta' => ['nullable', 'array'],
        ]);

        $type = $data['type'] ?? 'contact';
        if (($data['subject'] ?? '') && str_starts_with((string) $data['subject'], 'Quote Request:')) {
            $type = 'public_quote';
        }

        $attrs = [
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'subject' => $data['subject'] ?? null,
            'message' => $data['message'],
            'status' => 'new',
        ];

        if (Schema::hasColumn('contact_messages', 'type')) {
            $attrs['type'] = $type;
        }
        if (Schema::hasColumn('contact_messages', 'meta') && ! empty($data['meta'])) {
            $attrs['meta'] = $data['meta'];
        }

        try {
            $message = ContactMessage::create($attrs);
        } catch (\Throwable $e) {
            // Fallback: core columns only (older schemas).
            report($e);
            Log::error('contact.save_failed', ['error' => $e->getMessage()]);

            try {
                $message = ContactMessage::create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'phone' => $data['phone'] ?? null,
                    'subject' => $data['subject'] ?? null,
                    'message' => $data['message'],
                    'status' => 'new',
                ]);
            } catch (\Throwable $e2) {
                report($e2);
                Log::error('contact.save_failed_fallback', ['error' => $e2->getMessage()]);

                return response()->json([
                    'message' => 'Unable to save your request. Please email sales@ogexports.co.',
                ], 500);
            }
        }

        $mailTo = $type === 'public_quote'
            ? (string) config('mail.quote_to', env('MAIL_QUOTE_TO', 'sales@ogexports.co'))
            : (string) config('mail.contact_to', env('MAIL_CONTACT_TO', 'info@ogexports.co'));

        $mailSent = false;
        $mailError = null;

        try {
            if (class_exists(\App\Services\ContactFormMailer::class)) {
                $result = \App\Services\ContactFormMailer::send($message);
                $mailSent = (bool) ($result['sent'] ?? false);
                $mailError = $result['error'] ?? null;
            } else {
                $body = implode("\n", array_filter([
                    'New website submission',
                    '',
                    'Name: '.$message->name,
                    'Email: '.$message->email,
                    $message->phone ? 'Phone: '.$message->phone : null,
                    $message->subject ? 'Subject: '.$message->subject : null,
                    '',
                    $message->message,
                ]));

                Mail::raw($body, function ($mail) use ($mailTo, $message) {
                    $mail->to($mailTo)
                        ->subject($message->subject ?: 'Website Contact Inquiry')
                        ->replyTo($message->email, $message->name);
                });
                $mailSent = true;
            }
        } catch (\Throwable $e) {
            report($e);
            Log::error('contact.mail_failed', [
                'contact_message_id' => $message->id,
                'to' => $mailTo,
                'error' => $e->getMessage(),
            ]);
            $mailError = class_exists(\App\Services\ContactFormMailer::class)
                ? \App\Services\ContactFormMailer::sanitizeError($e->getMessage())
                : 'Email delivery failed. Please try again later or email sales@ogexports.co directly.';
        }

        // Optional in-app admin notify — never fail the request.
        try {
            if (class_exists(\App\Support\NotifiesAdmins::class)
                && class_exists(\App\Support\AdminNotificationTypes::class)) {
                \App\Support\NotifiesAdmins::notify(
                    \App\Support\AdminNotificationTypes::CONTACT_SUBMITTED,
                    'New website inquiry from '.$message->name,
                    $message->subject ?: 'Contact form submission',
                    [
                        'href' => $type === 'public_quote' ? '/admin/quotations' : '/admin/messages',
                        'contact_message_id' => $message->id,
                        'type' => $type,
                    ]
                );
            }
        } catch (\Throwable $e) {
            report($e);
        }

        if (! $mailSent) {
            return response()->json([
                'message' => 'Your message was saved but email delivery failed. Our team will follow up shortly.',
                'data' => $message,
                'mail_sent' => false,
                'mail_error' => $mailError ?: 'Email delivery failed. Please try again later or email sales@ogexports.co directly.',
            ], 202);
        }

        return response()->json([
            'message' => 'Message sent successfully.',
            'data' => $message,
            'mail_sent' => true,
        ], 201);
    }

    public function storeNewsletter(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $subscriber = NewsletterSubscriber::query()->firstOrCreate(
            ['email' => $data['email']],
            ['subscribed_at' => now()]
        );

        if ($subscriber->unsubscribed_at) {
            $subscriber->update([
                'unsubscribed_at' => null,
                'subscribed_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Subscribed successfully.',
            'data' => $subscriber,
        ], 201);
    }

    public function storePartner(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company' => ['required', 'string', 'max:255'],
            'contact_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'type' => ['nullable', 'string', 'max:100'],
            'payload' => ['nullable', 'array'],
        ]);

        $application = PartnerApplication::create([
            ...$data,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Application submitted successfully.',
            'data' => $application,
        ], 201);
    }
}
