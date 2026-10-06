<?php

namespace App\Support;

use App\Models\Investment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

final class InvestorPushBridge
{
    private const SIGNING_CONTEXT = 'ogexports:investor-payout-push:v1';

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
}
