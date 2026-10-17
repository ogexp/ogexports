<?php

namespace App\Support;

use App\Models\AppNotification;
use App\Models\Investment;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

final class InvestorPushBridge
{
    private const SIGNING_CONTEXT = 'ogexports:investor-payout-push:v1';
    private const NOTIFICATION_SIGNING_CONTEXT = 'ogexports:investor-notification-push:v1';

    public static function sendNotification(User $investor, AppNotification $notification): void
    {
        if (blank($investor->email) || ! $investor->hasRole('investor')) {
            return;
        }

        $url = self::notificationEndpointUrl();
        $secret = (string) config('services.investor_push.session_secret');
        if (! $url || $secret === '') {
            Log::warning('Investor notification push bridge is not configured.', [
                'notification_id' => $notification->id,
                'endpoint_configured' => (bool) $url,
                'signing_secret_configured' => $secret !== '',
            ]);
            return;
        }

        $notificationData = is_array($notification->data) ? $notification->data : [];
        $href = $notificationData['href'] ?? '/account/notifications';
        if (! is_string($href) || ! str_starts_with($href, '/')) {
            $href = '/account/notifications';
        }
        $timestamp = (string) now()->timestamp;
        $payload = [
            'event_id' => (string) Str::uuid(),
            'investor_email' => mb_strtolower(trim($investor->email)),
            'notification_id' => (string) $notification->id,
            'type' => (string) $notification->type,
            'title' => (string) $notification->title,
            'body' => filled($notification->body) ? (string) $notification->body : 'You have a new update in OG Exports.',
            'href' => $href,
        ];

        try {
            $body = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $key = hash_hmac('sha256', self::NOTIFICATION_SIGNING_CONTEXT, $secret, true);
            $signature = hash_hmac('sha256', $timestamp."\n".$body, $key);
            $response = Http::timeout(5)
                ->retry(2, 100)
                ->withHeaders([
                    'X-OG-Notification-Timestamp' => $timestamp,
                    'X-OG-Notification-Signature' => 'sha256='.$signature,
                ])
                ->withBody($body, 'application/json')
                ->post($url);

            if (! $response->successful()) {
                Log::warning('Investor notification push event was rejected by the API server.', [
                    'event_id' => $payload['event_id'],
                    'notification_id' => $notification->id,
                    'http_status' => $response->status(),
                ]);
            }
        } catch (Throwable $exception) {
            Log::warning('Investor notification push event could not be delivered to the API server.', [
                'notification_id' => $notification->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public static function sendPayoutProgress(Investment $investment): void
    {
        $investor = $investment->investor;
        $progress = $investment->payoutProgress;

        if (! $investor || ! $progress || blank($investor->email)) {
            return;
        }

        $url = self::endpointUrl();
        $secret = (string) config('services.investor_push.session_secret');

        if (! $url || $secret === '') {
            Log::warning('Payout push bridge is not configured.', [
                'investment_id' => $investment->id,
                'endpoint_configured' => (bool) $url,
                'signing_secret_configured' => $secret !== '',
            ]);

            return;
        }

        $timestamp = (string) now()->timestamp;
        $payload = [
            'event_id' => (string) Str::uuid(),
            'investor_email' => mb_strtolower(trim($investor->email)),
            'investment_id' => (string) $investment->id,
            'investment_reference' => $investment->reference ?: (string) $investment->id,
            'project_name' => $investment->project?->title ?: 'your investment',
            'status' => $progress->status,
            'planned_date' => $progress->planned_distribution_date?->toDateString(),
        ];

        try {
            $body = json_encode(
                $payload,
                JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            );
            $key = hash_hmac('sha256', self::SIGNING_CONTEXT, $secret, true);
            $signature = hash_hmac('sha256', $timestamp."\n".$body, $key);

            $response = Http::timeout(5)
                ->retry(2, 100)
                ->withHeaders([
                    'X-OG-Payout-Timestamp' => $timestamp,
                    'X-OG-Payout-Signature' => 'sha256='.$signature,
                ])
                ->withBody($body, 'application/json')
                ->post($url);

            if (! $response->successful()) {
                Log::warning('Payout push event was rejected by the API server.', [
                    'event_id' => $payload['event_id'],
                    'investment_id' => $investment->id,
                    'http_status' => $response->status(),
                ]);
            }
        } catch (Throwable $exception) {
            Log::warning('Payout push event could not be delivered to the API server.', [
                'event_id' => $payload['event_id'],
                'investment_id' => $investment->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private static function endpointUrl(): ?string
    {
        $configuredUrl = trim((string) config('services.investor_push.url'));

        if ($configuredUrl !== '') {
            return str_starts_with($configuredUrl, 'https://') ? $configuredUrl : null;
        }

        $domains = preg_split('/\s*,\s*/', trim((string) config('services.investor_push.replit_domains')), -1, PREG_SPLIT_NO_EMPTY);
        $domain = $domains[0] ?? '';

        if ($domain === '') {
            return null;
        }

        $host = parse_url(str_contains($domain, '://') ? $domain : 'https://'.$domain, PHP_URL_HOST);

        return is_string($host) && $host !== ''
            ? 'https://'.$host.'/api/internal/investor-payout-progress'
            : null;
    }

    private static function notificationEndpointUrl(): ?string
    {
        $configuredUrl = trim((string) config('services.investor_push.notification_url'));
        if ($configuredUrl !== '') {
            return str_starts_with($configuredUrl, 'https://') ? $configuredUrl : null;
        }

        $configuredPayoutUrl = trim((string) config('services.investor_push.url'));
        $domain = $configuredPayoutUrl !== ''
            ? $configuredPayoutUrl
            : (preg_split('/\s*,\s*/', trim((string) config('services.investor_push.replit_domains')), -1, PREG_SPLIT_NO_EMPTY)[0] ?? '');
        if ($domain === '') {
            return null;
        }

        $parts = parse_url(str_contains($domain, '://') ? $domain : 'https://'.$domain);
        $host = $parts['host'] ?? null;
        if (! is_string($host) || $host === '') {
            return null;
        }

        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        return 'https://'.$host.$port.'/api/internal/investor-notification';
    }
}
