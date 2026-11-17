<?php

namespace App\Support;

use App\Models\InvestorPushToken;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

final class InvestorExpoPush
{
    private const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

    /**
     * @param array<string, scalar|null> $data
     */
    public static function send(User $investor, string $title, string $body, array $data = []): int
    {
        $tokens = InvestorPushToken::query()
            ->where('user_id', $investor->id)
            ->whereNull('revoked_at')
            ->get();

        if ($tokens->isEmpty()) {
            return 0;
        }

        $accepted = 0;
        foreach ($tokens->chunk(100) as $chunk) {
            $messages = $chunk->map(fn (InvestorPushToken $token): array => [
                'to' => $token->expo_push_token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default',
                'priority' => 'high',
                'channelId' => 'investor-updates',
            ])->values()->all();

            try {
                $response = Http::timeout(5)->post(self::ENDPOINT, $messages);
                if (! $response->successful()) {
                    Log::warning('Expo rejected an investor push batch.', [
                        'investor_id' => $investor->id,
                        'http_status' => $response->status(),
                    ]);
                    continue;
                }

                $tickets = $response->json('data', []);
                foreach ($chunk->values() as $index => $token) {
                    $ticket = is_array($tickets) ? ($tickets[$index] ?? []) : [];
                    if (($ticket['status'] ?? null) === 'ok') {
                        $accepted++;
                        continue;
                    }

                    if (($ticket['details']['error'] ?? null) === 'DeviceNotRegistered') {
                        $token->forceFill(['revoked_at' => now()])->save();
                        continue;
                    }

                    Log::warning('Expo rejected an investor push ticket.', [
                        'platform' => $token->platform,
                        'ticket_status' => is_string($ticket['status'] ?? null) ? $ticket['status'] : 'unknown',
                        'error_code' => is_string($ticket['details']['error'] ?? null)
                            ? $ticket['details']['error']
                            : 'unknown',
                    ]);
                }
            } catch (Throwable $exception) {
                Log::warning('Investor push delivery could not reach Expo.', [
                    'investor_id' => $investor->id,
                    'error_type' => $exception::class,
                ]);
            }
        }

        return $accepted;
    }
}
