<?php

namespace App\Support;

use App\Models\User;
use Spatie\Permission\Exceptions\RoleDoesNotExist;

class NotifiesAdmins
{
    /**
     * @param  array<string, mixed>|null  $data
     */
    public static function notify(string $type, string $title, ?string $body = null, ?array $data = null): void
    {
        try {
            $admins = User::role('admin')->get();
        } catch (RoleDoesNotExist) {
            return;
        }

        if ($admins->isEmpty()) {
            return;
        }

        NotifiesUsers::notifyMany($admins, $type, $title, $body, $data);
    }
}
