<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportTicket extends Model
{
    protected $fillable = [
        'user_id',
        'user_type',
        'ticket_number',
        'subject',
        'contact_name',
        'contact_email',
        'contact_phone',
        'priority',
        'status',
        'assignee_id',
    ];

    protected static function booted(): void
    {
        static::creating(function (SupportTicket $ticket) {
            if (! $ticket->ticket_number) {
                $ticket->ticket_number = static::generateTicketNumber();
            }
        });
    }

    public static function generateTicketNumber(): string
    {
        $year = now()->format('Y');
        $prefix = "TK-{$year}-";

        $last = static::query()
            ->where('ticket_number', 'like', "{$prefix}%")
            ->orderByDesc('ticket_number')
            ->value('ticket_number');

        $seq = 1;
        if ($last && preg_match('/TK-\d{4}-(\d+)$/', $last, $m)) {
            $seq = (int) $m[1] + 1;
        }

        return $prefix.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'ticket_id');
    }
}
