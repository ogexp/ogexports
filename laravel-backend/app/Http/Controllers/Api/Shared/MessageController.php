<?php

namespace App\Http\Controllers\Api\Shared;

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

    public function conversations(Request $request): JsonResponse
    {
        $user = $request->user();

        $conversations = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))
            ->with(['participants:id,name,email', 'messages' => fn ($q) => $q->latest()->limit(1)])
            ->latest()
            ->paginate($this->perPage($request));

        return response()->json($conversations);
    }

    public function withAdmin(Request $request): JsonResponse
    {
        $user = $request->user();
        $admin = User::role('admin')->orderBy('id')->first();

        if (! $admin) {
            return response()->json(['message' => 'No admin available.'], 404);
        }

        $conversation = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))
            ->whereHas('participants', fn ($q) => $q->where('users.id', $admin->id))
            ->with(['participants:id,name,email'])
            ->first();

        if (! $conversation) {
            $conversation = Conversation::create([
                'subject' => 'Support Chat',
                'created_by' => $user->id,
            ]);
            $conversation->participants()->sync([$user->id, $admin->id]);
            $conversation->load(['participants:id,name,email']);
        }

        $messages = $conversation->messages()
            ->with('sender:id,name,email')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $unread = $conversation->messages()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'data' => [
                'conversation' => $conversation,
                'messages' => $messages,
                'unread_count' => $unread,
            ],
        ]);
    }

    public function storeConversation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['nullable', 'string', 'max:255'],
            'participant_ids' => ['required', 'array', 'min:1'],
            'participant_ids.*' => ['integer', 'exists:users,id'],
            'body' => ['nullable', 'string', 'max:5000'],
        ]);

        $user = $request->user();

        $conversation = Conversation::create([
            'subject' => $data['subject'] ?? null,
            'created_by' => $user->id,
        ]);

        $ids = collect($data['participant_ids'])->push($user->id)->unique()->values()->all();
        $conversation->participants()->sync($ids);

        if (! empty($data['body'])) {
            Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $user->id,
                'body' => $data['body'],
                'created_at' => now(),
            ]);
        }

        return response()->json([
            'data' => $conversation->load(['participants:id,name,email', 'messages']),
        ], 201);
    }

    public function messages(Request $request, int $conversationId): JsonResponse
    {
        $user = $request->user();

        $conversation = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))
            ->findOrFail($conversationId);

        $messages = $conversation->messages()
            ->with('sender:id,name,email')
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate($this->perPage($request));

        return response()->json($messages);
    }

    public function storeMessage(Request $request, int $conversationId): JsonResponse
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

        $user = $request->user();

        $conversation = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))
            ->findOrFail($conversationId);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'body' => $data['body'] ?? '',
            'attachment_path' => $data['attachment_path'] ?? null,
            'attachment_url' => $data['attachment_url'] ?? null,
            'attachment_name' => $data['attachment_name'] ?? null,
            'attachment_mime' => $data['attachment_mime'] ?? null,
            'created_at' => now(),
        ]);

        $conversation->touch();

        $recipients = $conversation->participants()->where('users.id', '!=', $user->id)->get();
        $preview = $data['body'] ?: ($data['attachment_name'] ?? 'Sent an attachment');
        NotifiesUsers::notifyMany(
            $recipients,
            'new_message',
            'New message from '.$user->name,
            $preview,
            ['conversation_id' => $conversation->id, 'message_id' => $message->id]
        );

        return response()->json([
            'data' => $message->load('sender:id,name,email'),
        ], 201);
    }

    public function markRead(Request $request, int $conversationId): JsonResponse
    {
        $user = $request->user();

        $conversation = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))
            ->findOrFail($conversationId);

        $updated = $conversation->messages()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        AppNotification::query()
            ->where('user_id', $user->id)
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
        $user = $request->user();

        $count = Message::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->whereHas('conversation.participants', fn ($q) => $q->where('users.id', $user->id))
            ->count();

        return response()->json([
            'data' => ['unread_count' => $count],
        ]);
    }
}
