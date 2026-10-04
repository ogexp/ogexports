<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\PaginatesQueries;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\User;
use App\Support\NotifiesUsers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnnouncementController extends Controller
{
    use PaginatesQueries;

    public function index(Request $request): JsonResponse
    {
        $query = Announcement::query()->with('creator:id,name')->latest();

        if ($request->filled('audience')) {
            $query->where('audience', $request->input('audience'));
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate($this->perPage($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:10000'],
            'audience' => ['required', Rule::in(['all', 'buyer', 'supplier', 'investor'])],
            'is_active' => ['sometimes', 'boolean'],
            'publish' => ['sometimes', 'boolean'],
        ]);

        $publish = $data['publish'] ?? true;

        $announcement = Announcement::create([
            'title' => $data['title'],
            'body' => $data['body'],
            'audience' => $data['audience'],
            'is_active' => $data['is_active'] ?? true,
            'published_at' => $publish ? now() : null,
            'created_by' => $request->user()->id,
        ]);

        if ($publish && $announcement->is_active) {
            $this->notifyAudience($announcement);
        }

        return response()->json([
            'message' => 'Announcement created.',
            'data' => $announcement->load('creator:id,name'),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => Announcement::query()->with('creator:id,name')->findOrFail($id),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $announcement = Announcement::query()->findOrFail($id);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'body' => ['sometimes', 'string', 'max:10000'],
            'audience' => ['sometimes', Rule::in(['all', 'buyer', 'supplier', 'investor'])],
            'is_active' => ['sometimes', 'boolean'],
            'publish' => ['sometimes', 'boolean'],
        ]);

        $wasPublished = (bool) $announcement->published_at;

        if (array_key_exists('publish', $data) && $data['publish'] && ! $announcement->published_at) {
            $announcement->published_at = now();
        }

        $announcement->fill(collect($data)->except('publish')->all())->save();

        if (! $wasPublished && $announcement->published_at && $announcement->is_active) {
            $this->notifyAudience($announcement);
        }

        return response()->json([
            'message' => 'Announcement updated.',
            'data' => $announcement->fresh()->load('creator:id,name'),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $announcement = Announcement::query()->findOrFail($id);
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }

    private function notifyAudience(Announcement $announcement): void
    {
        $users = $announcement->audience === 'all'
            ? User::query()->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))->get()
            : User::role($announcement->audience)->get();

        $title = $announcement->title;
        $body = \Illuminate\Support\Str::limit(strip_tags($announcement->body), 200);
        $data = ['announcement_id' => $announcement->id];

        // Buyers get email for announcements; other roles stay in-app only.
        $buyers = $users->filter(fn (User $u) => $u->hasRole('buyer'));
        $others = $users->reject(fn (User $u) => $u->hasRole('buyer'));

        if ($buyers->isNotEmpty()) {
            NotifiesUsers::notifyManyAndEmail(
                $buyers,
                'announcement',
                $title,
                $body,
                array_merge($data, ['href' => '/buyer/messages']),
                'portal_announcement',
                [
                    'title' => $title,
                    'body' => $body,
                    'portal_url' => rtrim((string) config('app.frontend_url', config('app.url')), '/').'/buyer/messages',
                ]
            );
        }

        if ($others->isNotEmpty()) {
            NotifiesUsers::notifyMany(
                $others,
                'announcement',
                $title,
                $body,
                $data
            );
        }
    }
}
