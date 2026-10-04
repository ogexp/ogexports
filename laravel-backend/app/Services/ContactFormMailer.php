<?php

namespace App\Services;

use App\Mail\ContactFormAlert;
use App\Models\ContactMessage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactFormMailer
{
    /**
     * @return array{sent: bool, error: ?string}
     */
    public static function send(ContactMessage $message): array
    {
        $to = self::recipientFor($message);

        try {
            Mail::to($to)->send(new ContactFormAlert($message));

            Log::info('contact_form.mail_sent', [
                'contact_message_id' => $message->id,
                'type' => $message->type,
                'to' => $to,
                'from_email' => $message->email,
            ]);

            return ['sent' => true, 'error' => null];
        } catch (\Throwable $e) {
            report($e);

            Log::error('contact_form.mail_failed', [
                'contact_message_id' => $message->id,
                'type' => $message->type,
                'to' => $to,
                'from_email' => $message->email,
                'error' => $e->getMessage(),
            ]);

            return [
                'sent' => false,
                'error' => self::sanitizeError($e->getMessage()),
            ];
        }
    }

    public static function recipientFor(ContactMessage $message): string
    {
        if ($message->type === 'public_quote') {
            return (string) config('mail.quote_to', 'sales@ogexports.co');
        }

        return (string) config('mail.contact_to', 'info@ogexports.co');
    }

    /**
     * User-facing mail failure reason without leaking credentials or stack noise.
     */
    public static function sanitizeError(string $raw): string
    {
        $lower = strtolower($raw);

        if (str_contains($lower, 'authentication') || str_contains($lower, '535') || str_contains($lower, '534')) {
            return 'Email server authentication failed.';
        }

        if (str_contains($lower, 'connection refused') || str_contains($lower, 'could not connect') || str_contains($lower, 'timed out') || str_contains($lower, 'timeout')) {
            return 'Could not connect to the email server.';
        }

        if (str_contains($lower, 'certificate') || str_contains($lower, 'ssl') || str_contains($lower, 'tls')) {
            return 'Secure connection to the email server failed.';
        }

        if (str_contains($lower, 'relay') || str_contains($lower, '550') || str_contains($lower, 'recipient')) {
            return 'The email server rejected the recipient address.';
        }

        return 'Email delivery failed. Please try again later or email sales@ogexports.co directly.';
    }
}
