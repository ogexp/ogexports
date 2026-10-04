<?php

namespace App\Http\Controllers\Api\Shared;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use App\Support\NotifiesUsers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = SupportTicket::query()
            ->where('user_id', $request->user()->id)
            ->with(['messages' => fn ($q) => $q->latest()->limit(1)]);

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('ticket_number', 'like', "%{$search}%");
            });
        }

        return response()->json($query->latest()->paginate($this->perPage($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'priority' => ['nullable', 'string', 'in:low,medium,high,urgent'],
            'body' => ['required', 'string', 'max:5000'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
        ]);

        $user = $request->user();

        $ticket = SupportTicket::create([
            'user_id' => $user->id,
            'user_type' => $user->primaryRole(),
            'subject' => $data['subject'],
            'contact_name' => $data['contact_name'] ?? $user->name,
            'contact_email' => $data['contact_email'] ?? $user->email,
            'contact_phone' => $data['contact_phone'] ?? $user->phone,
            'priority' => $data['priority'] ?? 'medium',
            'status' => 'open',
        ]);

        SupportMessage::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'body' => $data['body'],
            'is_admin' => false,
            'created_at' => now(),
        ]);

        $admins = User::role('admin')->get();
        NotifiesUsers::notifyMany(
            $admins,
            'support_ticket',
            'New support ticket '.$ticket->ticket_number,
            $ticket->subject,
            ['ticket_id' => $ticket->id, 'ticket_number' => $ticket->ticket_number]
        );

        return response()->json([
            'data' => $ticket->load('messages'),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $ticket = SupportTicket::query()
            ->where('user_id', $request->user()->id)
            ->with(['messages.user:id,name,email'])
            ->findOrFail($id);

        return response()->json(['data' => $ticket]);
    }

    public function reply(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $ticket = SupportTicket::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $message = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'body' => $data['body'],
            'is_admin' => false,
            'created_at' => now(),
        ]);

        if ($ticket->status === 'closed') {
            $ticket->update(['status' => 'open']);
        }

        $admins = User::role('admin')->get();
        NotifiesUsers::notifyMany(
            $admins,
            'support_ticket',
            'Ticket reply '.$ticket->ticket_number,
            $data['body'],
            ['ticket_id' => $ticket->id, 'ticket_number' => $ticket->ticket_number]
        );

        return response()->json(['data' => $message], 201);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $ticket = SupportTicket::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $updated = SupportMessage::query()
            ->where('ticket_id', $ticket->id)
            ->where('is_admin', true)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('type', 'support_ticket')
            ->whereNull('read_at')
            ->where('data->ticket_id', $ticket->id)
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Ticket marked as read.',
            'marked' => $updated,
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = SupportMessage::query()
            ->where('is_admin', true)
            ->whereNull('read_at')
            ->whereHas('ticket', fn ($q) => $q->where('user_id', $request->user()->id))
            ->count();

        return response()->json([
            'data' => ['unread_count' => $count],
        ]);
    }
}
