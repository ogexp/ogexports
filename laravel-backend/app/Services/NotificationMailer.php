<?php

namespace App\Services;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Support\AuthFlowLogger;
use Illuminate\Support\Facades\Mail;

class NotificationMailer
{
    /**
     * @param  array<string, string|int|float|null>  $vars
     */
    public static function sendTemplated(User $user, string $slug, array $vars = []): bool
    {
        $skipReason = self::skipReason($user);
        if ($skipReason !== null) {
            AuthFlowLogger::warning('auth.email.skipped', [
                'slug' => $slug,
                'email' => $user->email,
                'user_id' => $user->id,
                'reason' => $skipReason,
            ]);

            return false;
        }

        $template = EmailTemplate::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $template) {
            AuthFlowLogger::warning('auth.email.template_missing', [
                'slug' => $slug,
                'email' => $user->email,
                'user_id' => $user->id,
            ]);

            return false;
        }

        $merged = array_merge([
            'user_name' => $user->name,
            'user_email' => $user->email,
            'app_name' => config('app.display_name', 'OG Exports'),
        ], $vars);

        $subject = self::replacePlaceholders($template->subject, $merged);
        $bodyHtml = self::replacePlaceholders($template->body_html, $merged);
        $bodyText = self::replacePlaceholders(
            $template->body_text ?: strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $bodyHtml)),
            $merged
        );

        try {
            Mail::send([], [], function ($message) use ($user, $subject, $bodyHtml, $bodyText) {
                $message->to($user->email)
                    ->subject($subject)
                    ->html($bodyHtml)
                    ->text($bodyText);
            });

            AuthFlowLogger::info('auth.email.sent', [
                'slug' => $slug,
                'email' => $user->email,
                'user_id' => $user->id,
            ]);

            return true;
        } catch (\Throwable $e) {
            report($e);

            AuthFlowLogger::error('auth.email.failed', [
                'slug' => $slug,
                'email' => $user->email,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * @param  array<string, string|int|float|null>  $vars
     */
    public static function sendRaw(User $user, string $subject, string $bodyText): bool
    {
        $skipReason = self::skipReason($user);
        if ($skipReason !== null) {
            AuthFlowLogger::warning('auth.email.skipped', [
                'slug' => 'raw',
                'email' => $user->email,
                'user_id' => $user->id,
                'reason' => $skipReason,
            ]);

            return false;
        }

        try {
            Mail::raw($bodyText, function ($message) use ($user, $subject) {
                $message->to($user->email)->subject($subject);
            });

            AuthFlowLogger::info('auth.email.sent', [
                'slug' => 'raw',
                'email' => $user->email,
                'user_id' => $user->id,
            ]);

            return true;
        } catch (\Throwable $e) {
            report($e);

            AuthFlowLogger::error('auth.email.failed', [
                'slug' => 'raw',
                'email' => $user->email,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * @param  array<string, string|int|float|null>  $vars
     */
    private static function replacePlaceholders(string $text, array $vars): string
    {
        foreach ($vars as $key => $value) {
            $text = str_replace('{{'.$key.'}}', (string) ($value ?? ''), $text);
        }

        return $text;
    }

    private static function skipReason(User $user): ?string
    {
        if (! filled($user->email)) {
            return 'no_email';
        }

        $user->loadMissing('profile');
        $prefs = is_array($user->profile?->meta['notification_prefs'] ?? null)
            ? $user->profile->meta['notification_prefs']
            : [];

        if ($prefs === []) {
            return null;
        }

        if (array_key_exists('email', $prefs) && ! $prefs['email']) {
            return 'prefs_disabled';
        }

        return null;
    }
}
