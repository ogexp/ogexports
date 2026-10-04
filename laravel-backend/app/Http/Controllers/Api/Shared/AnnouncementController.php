<?php

namespace App\Http\Controllers\Api\Shared;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnnouncementController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->primaryRole();

        $items = Announcement::query()
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where(function ($q) use ($role) {
                $q->where('audience', 'all');
                if ($role) {
                    $q->orWhere('audience', $role);
                }
            })
            ->with('creator:id,name')
            ->latest('published_at')
            ->paginate($this->perPage($request));

        $readIds = DB::table('announcement_reads')
            ->where('user_id', $user->id)
            ->whereIn('announcement_id', $items->getCollection()->pluck('id'))
            ->pluck('announcement_id')
            ->all();

        $items->getCollection()->transform(function (Announcement $a) use ($readIds) {
            return [
                'id' => $a->id,
                'title' => $a->title,
                'body' => $a->body,
                'audience' => $a->audience,
                'published_at' => $a->published_at,
                'creator' => $a->creator,
                'is_read' => in_array($a->id, $readIds, true),
            ];
        });

        return response()->json($items);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $role = $user->primaryRole();

        $announcement = Announcement::query()
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where(function ($q) use ($role) {
                $q->where('audience', 'all');
                if ($role) {
                    $q->orWhere('audience', $role);
                }
            })
            ->findOrFail($id);

        DB::table('announcement_reads')->updateOrInsert(
            [
                'announcement_id' => $announcement->id,
                'user_id' => $user->id,
            ],
            ['read_at' => now()]
        );

        return response()->json(['message' => 'Announcement marked as read.']);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->primaryRole();

        $total = Announcement::query()
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where(function ($q) use ($role) {
                $q->where('audience', 'all');
                if ($role) {
                    $q->orWhere('audience', $role);
                }
            })
            ->whereDoesntHave('readers', fn ($q) => $q->where('users.id', $user->id))
            ->count();

        return response()->json(['data' => ['unread_count' => $total]]);
    }
}
