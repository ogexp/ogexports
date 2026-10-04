<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Support\MediaPath;
use App\Support\NotifiesUsers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $admin = $request->user();
        $search = $request->string('search')->trim()->toString();
        $perPage = $this->perPage($request);

        $usersQuery = User::query()
            ->with(['roles', 'profile:id,user_id,company_name'])
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'));

        if ($search !== '') {
            $usersQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $usersQuery->get();
        $userIds = $users->pluck('id')->all();

        $conversations = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $admin->id))
            ->whereHas('participants', fn ($q) => $q->whereIn('users.id', $userIds))
            ->with([
                'participants:id,name,email',
                'messages' => fn ($q) => $q->latest()->limit(1),
            ])
            ->withCount([
                'messages as unread_count' => fn ($q) => $q
                    ->where('sender_id', '!=', $admin->id)
                    ->whereNull('read_at'),
                'messages as admin_message_count' => fn ($q) => $q
                    ->where('sender_id', $admin->id),
            ])
            ->get();

        $byUserId = [];
        foreach ($conversations as $c) {
            $other = $c->participants->firstWhere('id', '!=', $admin->id);
            if ($other) {
                $byUserId[$other->id] = $c;
            }
        }

        $items = $users->map(function (User $user) use ($byUserId) {
            $c = $byUserId[$user->id] ?? null;
            $last = $c?->messages->first();
            $unreadCount = (int) ($c?->unread_count ?? 0);
            $adminHasReplied = ($c?->admin_message_count ?? 0) > 0;
            $isNewChat = $c !== null && $last !== null && ! $adminHasReplied;

            return [
                'id' => $c?->id,
                'user_id' => $user->id,
                'subject' => $c?->subject ?? 'Support Chat',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->primaryRole(),
                    'company' => $user->profile?->company_name,
                ],
                'last_message' => $last ? [
                    'body' => $last->body,
                    'attachment_name' => $last->attachment_name,
                    'created_at' => $last->created_at,
                    'sender_id' => $last->sender_id,
                ] : null,
                'unread_count' => $unreadCount,
                'has_unread' => $unreadCount > 0,
                'is_new_chat' => $isNewChat,
                'updated_at' => $c?->updated_at,
                '_sort_name' => $user->name,
                '_sort_activity' => $last?->created_at ?? $c?->updated_at,
            ];
        });

        $newChatCount = $items->where('is_new_chat', true)->count();
        $unreadMessagesCount = (int) $items->sum('unread_count');
        $unreadConversationsCount = $items->where('has_unread', true)->count();

        $sorted = $items->sort(function (array $a, array $b) {
            if ($a['is_new_chat'] !== $b['is_new_chat']) {
                return $b['is_new_chat'] <=> $a['is_new_chat'];
            }
            if ($a['unread_count'] !== $b['unread_count']) {
                return $b['unread_count'] <=> $a['unread_count'];
            }
            $aTime = $a['_sort_activity'] ? strtotime((string) $a['_sort_activity']) : 0;
            $bTime = $b['_sort_activity'] ? strtotime((string) $b['_sort_activity']) : 0;
            if ($aTime !== $bTime) {
                return $bTime <=> $aTime;
            }

            return strcasecmp((string) $a['_sort_name'], (string) $b['_sort_name']);
        })->values();

        $page = max(1, (int) $request->input('page', 1));
        $total = $sorted->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $paginated = $sorted->forPage($page, $perPage)->map(function (array $item) {
            unset($item['_sort_name'], $item['_sort_activity']);

            return $item;
        })->values();

        return response()->json([
            'data' => $paginated,
            'current_page' => $page,
            'last_page' => $lastPage,
            'per_page' => $perPage,
            'total' => $total,
            'meta' => [
                'new_chat_count' => $newChatCount,
                'unread_messages_count' => $unreadMessagesCount,
                'unread_conversations_count' => $unreadConversationsCount,
            ],
        ]);
    }

    public function ensureForUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $admin = $request->user();
        $user = User::query()->findOrFail($data['user_id']);

        $conversation = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $admin->id))
            ->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))
            ->first();

        if (! $conversation) {
            $conversation = Conversation::create([
                'subject' => 'Support Chat',
                'created_by' => $admin->id,
            ]);
            $conversation->participants()->sync([$admin->id, $user->id]);
        }

        return response()->json([
            'data' => $conversation->load(['participants:id,name,email']),
        ]);
    }

    public function messages(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();

        $conversation = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $admin->id))
            ->with(['participants:id,name,email'])
            ->findOrFail($id);

        $messages = $conversation->messages()
            ->with('sender:id,name,email')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => [
                'conversation' => $conversation,
                'messages' => $messages,
            ],
        ]);
    }

    public function storeMessage(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachment_path' => ['nullable', 'string', 'max:1000'],
            'attachment_url' => ['nullable', 'string', 'max:1000'],
            'attachment_name' => ['nullable', 'string', 'max:255'],
            'attachment_mime' => ['nullable', 'string', 'max:100'],
        ]);

        if (empty($data['body']) && empty($data['attachment_path']) && empty($data['attachment_url'])) {
            return response()->json(['message' => 'Message body or attachment is required.'], 422);
        }

        $data = MediaPath::normalizeAttachmentFields($data);

        $admin = $request->user();

        $conversation = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $admin->id))
            ->findOrFail($id);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $admin->id,
            'body' => $data['body'] ?? '',
            'attachment_path' => $data['attachment_path'] ?? null,
            'attachment_url' => $data['attachment_url'] ?? null,
            'attachment_name' => $data['attachment_name'] ?? null,
            'attachment_mime' => $data['attachment_mime'] ?? null,
            'created_at' => now(),
        ]);

        $conversation->touch();

        $recipients = $conversation->participants()->where('users.id', '!=', $admin->id)->get();
        $preview = $data['body'] ?: ($data['attachment_name'] ?? 'Sent an attachment');
        NotifiesUsers::notifyMany(
            $recipients,
            'new_message',
            'New message from OGSupport',
            $preview,
            ['conversation_id' => $conversation->id, 'message_id' => $message->id]
        );

        return response()->json([
            'data' => $message->load('sender:id,name,email'),
        ], 201);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();

        $conversation = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $admin->id))
            ->findOrFail($id);

        $updated = $conversation->messages()
            ->where('sender_id', '!=', $admin->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        AppNotification::query()
            ->where('user_id', $admin->id)
            ->where('type', 'new_message')
            ->whereNull('read_at')
            ->where('data->conversation_id', $conversation->id)
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Conversation marked as read.',
            'marked' => $updated,
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $admin = $request->user();

        $count = Message::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $admin->id)
            ->whereHas('conversation.participants', fn ($q) => $q->where('users.id', $admin->id))
            ->count();

        return response()->json([
            'data' => ['unread_count' => $count],
        ]);
    }
}
