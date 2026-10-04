<?php

namespace App\Http\Controllers\Api\Investor;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Support\InvestorNotificationPrefMap;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $items = AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest('created_at')
            ->paginate($this->perPage($request));

        $items->getCollection()->transform(
            fn (AppNotification $notification) => $this->notificationPayload($notification)
        );

        return response()->json($items);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['data' => ['unread_count' => $count]]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $notification = AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $notification->update(['read_at' => now()]);

        return response()->json(['data' => $this->notificationPayload($notification->fresh())]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function notificationPayload(AppNotification $notification): array
    {
        return array_merge($notification->toArray(), [
            'category' => InvestorNotificationPrefMap::categoryForType($notification->type),
        ]);
    }
}
