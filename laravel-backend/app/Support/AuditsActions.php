<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Request;

class AuditsActions
{
    public static function log(string $action, string $module, ?User $user = null, array $meta = []): void
    {
        AuditLog::create([
            'user_id' => $user?->id ?? auth()->id(),
            'action' => $action,
            'module' => $module,
            'ip' => Request::ip(),
            'meta' => $meta ?: null,
            'created_at' => now(),
        ]);
    }
}
