<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Services\BuyerTradeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupportController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = SupportTicket::query()->with(['user:id,name,email', 'assignee:id,name']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('ticket_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $tickets = $query->latest()->paginate($this->perPage($request));

        $counts = SupportTicket::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'data' => $tickets->items(),
            'meta' => [
                'current_page' => $tickets->currentPage(),
                'last_page' => $tickets->lastPage(),
                'per_page' => $tickets->perPage(),
                'total' => $tickets->total(),
            ],
            'counts' => [
                'open' => (int) ($counts['open'] ?? 0),
                'pending' => (int) (($counts['pending'] ?? 0) + ($counts['answered'] ?? 0)),
                'escalated' => (int) ($counts['escalated'] ?? 0),
                'resolved' => (int) (($counts['resolved'] ?? 0) + ($counts['closed'] ?? 0)),
                'closed' => (int) ($counts['closed'] ?? 0),
                'total' => (int) SupportTicket::query()->count(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => SupportTicket::query()
                ->with(['user:id,name,email,phone', 'assignee:id,name', 'messages.user:id,name'])
                ->findOrFail($id),
        ]);
    }

    public function reply(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string'],
        ]);

        $ticket = SupportTicket::query()->findOrFail($id);

        $message = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'body' => $data['body'],
            'is_admin' => true,
            'created_at' => now(),
        ]);

        if (in_array($ticket->status, ['open', 'pending'], true)) {
            $ticket->update(['status' => 'answered']);
        }

        $ticket->loadMissing('user');
        if ($ticket->user) {
            BuyerTradeNotifier::supportReply(
                $ticket->user,
                (string) $ticket->ticket_number,
                (int) $ticket->id,
                $data['body']
            );
        }

        return response()->json(['data' => $message->load('user:id,name')], 201);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'max:50'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'priority' => ['nullable', 'string', 'max:50'],
        ]);

        $ticket = SupportTicket::query()->findOrFail($id);
        $previousStatus = $ticket->status;
        $ticket->update($data);

        $ticket = $ticket->fresh()->load(['user:id,name,email', 'assignee:id,name']);
        if (
            $ticket->user
            && isset($data['status'])
            && (string) $data['status'] !== (string) $previousStatus
        ) {
            BuyerTradeNotifier::supportStatusChanged(
                $ticket->user,
                (string) $ticket->ticket_number,
                (int) $ticket->id,
                (string) $data['status']
            );
        }

        return response()->json(['data' => $ticket]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $ticket = SupportTicket::query()->findOrFail($id);

        $updated = SupportMessage::query()
            ->where('ticket_id', $ticket->id)
            ->where('is_admin', false)
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

    public function unreadCount(): JsonResponse
    {
        $count = SupportMessage::query()
            ->where('is_admin', false)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'data' => ['unread_count' => $count],
        ]);
    }
}
