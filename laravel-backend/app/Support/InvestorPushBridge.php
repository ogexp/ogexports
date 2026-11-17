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
        $notificationData = is_array($notification->data) ? $notification->data : [];
        self::dispatchNotification(
            $investor,
            (string) $notification->type,
            $notificationData,
            (string) $notification->id,
        );
    }

    /**
     * Send a device alert when the investor's in-app category is muted.
     * The event still goes through both configured push paths, but no feed row is created.
     *
     * @param  array<string, mixed>|null  $data
     */
    public static function sendPushOnly(User $investor, string $type, ?array $data = null): void
    {
        self::dispatchNotification(
            $investor,
            $type,
            $data ?? [],
            'push-'.Str::uuid(),
        );
    }

    /**
     * @param  array<string, mixed>  $notificationData
     */
    private static function dispatchNotification(
        User $investor,
        string $type,
        array $notificationData,
        string $notificationId,
    ): void {
        if (blank($investor->email) || ! $investor->hasRole('investor')) {
            return;
        }

        $href = $notificationData['href'] ?? '/account/notifications';
        if (! is_string($href) || ! str_starts_with($href, '/')) {
            $href = '/account/notifications';
        }
        [$pushTitle, $pushBody] = self::lockScreenContent($type, $notificationData);
        $pushData = [
            'type' => $type,
            'notification_id' => $notificationId,
            'href' => $href,
        ];
        foreach (['deposit_id', 'withdrawal_id', 'investment_id', 'project_id', 'transaction_id', 'kyc_id', 'ticket_id', 'trade_update_id'] as $key) {
            $value = $notificationData[$key] ?? null;
            if (is_int($value) || (is_string($value) && preg_match('/^\d+$/', $value) === 1)) {
                $pushData[$key] = (string) $value;
            }
        }

        InvestorExpoPush::send(
            $investor,
            $pushTitle,
            $pushBody,
            $pushData,
        );

        $url = self::notificationEndpointUrl();
        $secret = (string) config('services.investor_push.session_secret');
        if (! $url || $secret === '') {
            Log::warning('Investor notification push bridge is not configured.', [
                'notification_id' => $notificationId,
                'endpoint_configured' => (bool) $url,
                'signing_secret_configured' => $secret !== '',
            ]);
            return;
        }

        $timestamp = (string) now()->timestamp;
        $payload = [
            'event_id' => (string) Str::uuid(),
            'investor_email' => mb_strtolower(trim($investor->email)),
            'notification_id' => $notificationId,
            'type' => $type,
            'title' => $pushTitle,
            'body' => $pushBody,
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
                    'notification_id' => $notificationId,
                    'http_status' => $response->status(),
                ]);
            }
        } catch (Throwable $exception) {
            Log::warning('Investor notification push event could not be delivered to the API server.', [
                'notification_id' => $notificationId,
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

        InvestorExpoPush::send(
            $investor,
            'Investment update',
            'Your investment has a status update. Open OG Exports to review the details.',
            [
                'type' => 'investment.payout.progress',
                'investment_id' => (string) $investment->id,
                'href' => '/account/notifications',
            ],
        );

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

    /**
     * Keep financial and account details inside the authenticated app.
     *
     * @return array{0: string, 1: string}
     */
    private static function lockScreenContent(string $type, array $data = []): array
    {
        return match ($type) {
            InvestorNotificationTypes::DEPOSIT => self::depositUpdateContent($data),
            InvestorNotificationTypes::DEPOSIT_SUBMITTED => [
                'Deposit request received',
                'Your deposit is under review. We will share the next update in OG Exports.',
            ],
            InvestorNotificationTypes::DEPOSIT_APPROVED => [
                'Deposit confirmed',
                'Your deposit has been approved and added to your wallet.',
            ],
            InvestorNotificationTypes::DEPOSIT_REJECTED => [
                'Deposit requires attention',
                'Open OG Exports to review the decision and next steps.',
            ],
            InvestorNotificationTypes::DEPOSIT_CANCELLED => [
                'Deposit request closed',
                'This request was cancelled. View the update in OG Exports.',
            ],
            InvestorNotificationTypes::WITHDRAWAL => self::withdrawalUpdateContent($data),
            InvestorNotificationTypes::WITHDRAWAL_SUBMITTED => [
                'Withdrawal request received',
                'Your request is under review. Follow its progress in OG Exports.',
            ],
            InvestorNotificationTypes::WITHDRAWAL_APPROVED => [
                'Withdrawal approved',
                'Your request has been approved. Check OG Exports for payout details.',
            ],
            InvestorNotificationTypes::WITHDRAWAL_REJECTED => [
                'Withdrawal requires attention',
                'Open OG Exports to review the decision and next steps.',
            ],
            InvestorNotificationTypes::WITHDRAWAL_CANCELLED => [
                'Withdrawal request closed',
                'Your request was cancelled. View the update in OG Exports.',
            ],
            InvestorNotificationTypes::OPPORTUNITY_PUBLISHED => [
                'New trade opportunity',
                'A new opportunity is available. Explore its details in OG Exports.',
            ],
            InvestorNotificationTypes::SHIPMENT_UPDATE => self::tradeUpdateContent($data),
            InvestorNotificationTypes::UPDATE => self::opportunityUpdateContent($data),
            InvestorNotificationTypes::KYC_SUBMITTED => [
                'Verification started',
                'Your documents were received. Check OG Exports for any remaining steps.',
            ],
            InvestorNotificationTypes::KYC_APPROVED => [
                'Verification approved',
                'Your investor profile is now verified. Continue securely in OG Exports.',
            ],
            InvestorNotificationTypes::KYC_REJECTED => [
                'Verification needs attention',
                'Open OG Exports to review the decision and next steps.',
            ],
            'document_required' => [
                'Verification action required',
                'Please review the requested documents in OG Exports.',
            ],
            InvestorNotificationTypes::SUPPORT_TICKET => self::supportContent($data),
            InvestorNotificationTypes::NEW_MESSAGE => [
                'Support message received',
                'A new message from OG Exports is ready. Open the app to continue.',
            ],
            InvestorNotificationTypes::INVESTMENT => [
                'Investment confirmed',
                'Your investment request is recorded. Open OG Exports to follow its status.',
            ],
            InvestorNotificationTypes::INVESTMENT_APPROVED => [
                'Investment approved',
                'Your investment has been approved. Open OG Exports to review its status.',
            ],
            InvestorNotificationTypes::INVESTMENT_REJECTED => [
                'Investment update',
                'Open OG Exports to review the decision and wallet update.',
            ],
            InvestorNotificationTypes::INVESTMENT_COMPLETED => [
                'Investment completed',
                'Your investment cycle is complete. View the final update in OG Exports.',
            ],
            InvestorNotificationTypes::PAYOUT_PROGRESS => [
                'Distribution update',
                'A new distribution update is available in OG Exports.',
            ],
            default => [
                'OG Exports account update',
                'A new account update is ready. Open OG Exports to review it.',
            ],
        };
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: string, 1: string}
     */
    private static function tradeUpdateContent(array $data): array
    {
        $status = self::humanizedStatus($data['status'] ?? $data['stage'] ?? null);
        $title = $status === null ? 'Trade milestone updated' : 'Trade milestone: '.$status;

        return [
            $title,
            'A new trade update is ready. Open OG Exports for the latest details.',
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: string, 1: string}
     */
    private static function opportunityUpdateContent(array $data): array
    {
        $status = self::humanizedStatus($data['status'] ?? $data['stage'] ?? null);
        $title = $status === null ? 'Opportunity status updated' : 'Opportunity updated: '.$status;

        return [
            $title,
            'A trade opportunity status changed. Open OG Exports for details.',
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: string, 1: string}
     */
    private static function depositUpdateContent(array $data): array
    {
        return match (self::normalizedStatus($data['transaction_status'] ?? $data['status'] ?? null)) {
            'pending', 'submitted', 'under_review', 'review' => [
                'Deposit request received',
                'Your deposit is under review. We will share the next update in OG Exports.',
            ],
            'approved', 'completed' => [
                'Deposit confirmed',
                'Your deposit has been approved and added to your wallet.',
            ],
            'rejected', 'failed' => [
                'Deposit requires attention',
                'Open OG Exports to review the decision and next steps.',
            ],
            'cancelled', 'canceled' => [
                'Deposit request closed',
                'This request was cancelled. View the update in OG Exports.',
            ],
            default => [
                'Deposit status updated',
                'Your deposit has a new status. Open OG Exports to review the update.',
            ],
        };
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: string, 1: string}
     */
    private static function withdrawalUpdateContent(array $data): array
    {
        return match (self::normalizedStatus($data['transaction_status'] ?? $data['status'] ?? null)) {
            'pending', 'submitted', 'under_review', 'review' => [
                'Withdrawal request received',
                'Your request is under review. Follow its progress in OG Exports.',
            ],
            'approved' => [
                'Withdrawal approved',
                'Your request has been approved. Check OG Exports for payout details.',
            ],
            'processing', 'processing_payment' => [
                'Withdrawal processing',
                'Your payout is being processed. Track its status in OG Exports.',
            ],
            'paid', 'completed' => [
                'Withdrawal completed',
                'Your payout is marked complete. View the final update in OG Exports.',
            ],
            'rejected', 'failed' => [
                'Withdrawal requires attention',
                'Open OG Exports to review the decision and next steps.',
            ],
            'cancelled', 'canceled' => [
                'Withdrawal request closed',
                'Your request was cancelled. View the update in OG Exports.',
            ],
            default => [
                'Withdrawal status updated',
                'Your withdrawal has a new status. Open OG Exports to review the update.',
            ],
        };
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: string, 1: string}
     */
    private static function supportContent(array $data): array
    {
        if (($data['support_event'] ?? null) === 'status_changed') {
            $status = self::humanizedStatus($data['status'] ?? null) ?? 'updated';

            return [
                'Support request updated',
                'Your support request is now '.$status.'. Open OG Exports for details.',
            ];
        }

        return [
            'Support reply received',
            'The OG Exports support team has replied. Open the app to continue.',
        ];
    }

    private static function humanizedStatus(mixed $status): ?string
    {
        $normalized = self::normalizedStatus($status);
        if ($normalized === '') {
            return null;
        }

        $known = [
            'funding' => 'Funding open',
            'investment_confirmed' => 'Investment confirmed',
            'ready_to_ship' => 'Ready to ship',
            'cargo_loaded' => 'Cargo loaded',
            'shipping' => 'Shipping',
            'in_transit' => 'In transit',
            'custom_clearance' => 'Customs clearance',
            'customs' => 'Customs clearance',
            'settled' => 'Settled',
            'completed' => 'Completed',
            'pending' => 'Pending review',
            'review' => 'Under review',
            'answered' => 'Answered',
            'resolved' => 'Resolved',
            'closed' => 'Closed',
            'cancelled' => 'Cancelled',
            'canceled' => 'Cancelled',
            'approved' => 'Approved',
            'rejected' => 'Not approved',
        ];

        return $known[$normalized] ?? Str::title(str_replace('_', ' ', Str::limit($normalized, 32, '')));
    }

    private static function normalizedStatus(mixed $status): string
    {
        if (! is_string($status) || trim($status) === '') {
            return '';
        }

        return strtolower(trim(preg_replace('/[^a-z0-9]+/i', '_', $status) ?? '', '_'));
    }
}
