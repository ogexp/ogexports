<?php

namespace App\Support;

use App\Models\AppNotification;
use App\Models\User;
use App\Services\NotificationMailer;
use Illuminate\Support\Collection;

class NotifiesUsers
{
    public static function notify(User $user, string $type, string $title, ?string $body = null, ?array $data = null): ?AppNotification
    {
        if (! self::shouldDeliverInApp($user, $type)) {
            return null;
        }

        return AppNotification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<string, string|int|float|null>  $emailVars
     */
    public static function notifyAndEmail(
        User $user,
        string $type,
        string $title,
        ?string $body = null,
        ?array $data = null,
        ?string $emailSlug = null,
        array $emailVars = []
    ): ?AppNotification {
        $notification = self::notify($user, $type, $title, $body, $data);

        if ($emailSlug) {
            NotificationMailer::sendTemplated($user, $emailSlug, array_merge([
                'title' => $title,
                'body' => $body ?? '',
                'portal_url' => config('app.frontend_url', config('app.url')),
            ], $emailVars));
        }

        return $notification;
    }

    /**
     * @param  array<string, string|int|float|null>  $emailVars
     */
    public static function notifyManyAndEmail(
        iterable $users,
        string $type,
        string $title,
        ?string $body = null,
        ?array $data = null,
        ?string $emailSlug = null,
        array $emailVars = []
    ): void {
        foreach ($users as $user) {
            self::notifyAndEmail($user, $type, $title, $body, $data, $emailSlug, $emailVars);
        }
    }

    public static function notifyMany(iterable $users, string $type, string $title, ?string $body = null, ?array $data = null): void
    {
        foreach ($users as $user) {
            self::notify($user, $type, $title, $body, $data);
        }
    }

    private static function shouldDeliverInApp(User $user, string $type): bool
    {
        if (! $user->hasRole('investor')) {
            return true;
        }

        $user->loadMissing('profile');
        $prefs = is_array($user->profile?->meta['notification_prefs'] ?? null)
            ? $user->profile->meta['notification_prefs']
            : [];

        if ($prefs === []) {
            return true;
        }

        if (array_key_exists('inApp', $prefs) && ! $prefs['inApp']) {
            return false;
        }

        $prefKey = InvestorNotificationPrefMap::prefKeyForType($type);
        if (array_key_exists($prefKey, $prefs) && $prefs[$prefKey] === false) {
            return false;
        }

        $legacyPrefKey = InvestorNotificationPrefMap::legacyPrefKeyForType($type);
        if (! array_key_exists($prefKey, $prefs)
            && $legacyPrefKey !== null
            && array_key_exists($legacyPrefKey, $prefs)
            && $prefs[$legacyPrefKey] === false) {
            return false;
        }

        return true;
    }
}
