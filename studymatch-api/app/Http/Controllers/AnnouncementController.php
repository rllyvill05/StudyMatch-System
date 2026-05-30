<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    // ── User-facing (read-only) ───────────────────────────────────

    public function index(Request $request)
    {
        $role = $request->user()->role;

        $announcements = Announcement::published()
            ->forRole($role)
            ->orderByDesc('is_pinned')
            ->latest('published_at')
            ->paginate(20);

        return response()->json($announcements);
    }

    public function show($id)
    {
        $announcement = Announcement::published()->findOrFail($id);
        return response()->json(['announcement' => $announcement]);
    }

    // ── Admin CRUD (called via api.php prefix; accessible to admin + super_admin) ──

    private function isAdmin(Request $request): bool
    {
        return in_array($request->user()->role, ['admin', 'super_admin']);
    }

    public function adminIndex(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = Announcement::with('creator');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('target')) {
            $query->where('target', $request->target);
        }

        $announcements = $query->latest()->paginate((int) $request->input('per_page', 20));

        return response()->json($announcements);
    }

    public function adminStore(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'title'        => 'required|string|max:255',
            'content'      => 'required|string',
            'target'       => 'sometimes|in:all,students,tutors',
            'status'       => 'sometimes|in:draft,published,archived',
            'is_pinned'    => 'boolean',
            'published_at' => 'nullable|date',
            'expires_at'   => 'nullable|date',
        ]);

        $status = $request->input('status', 'published');

        $announcement = Announcement::create([
            'created_by'   => $request->user()->id,
            'title'        => $request->title,
            'content'      => $request->content,
            'target'       => $request->input('target', 'all'),
            'status'       => $status,
            'is_pinned'    => $request->boolean('is_pinned'),
            'published_at' => $status === 'published' ? ($request->published_at ?? now()) : $request->published_at,
            'expires_at'   => $request->expires_at,
        ]);

        return response()->json(['success' => true, 'announcement' => $announcement], 201);
    }

    public function adminUpdate(Request $request, $id)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $announcement = Announcement::findOrFail($id);

        $request->validate([
            'title'      => 'sometimes|string|max:255',
            'content'    => 'sometimes|string',
            'target'     => 'sometimes|in:all,students,tutors',
            'status'     => 'sometimes|in:draft,published,archived',
            'is_pinned'  => 'boolean',
            'expires_at' => 'nullable|date',
        ]);

        $data = $request->only(['title', 'content', 'target', 'status', 'is_pinned', 'expires_at']);

        if (($data['status'] ?? null) === 'published' && !$announcement->published_at) {
            $data['published_at'] = now();
        }

        $announcement->update($data);

        return response()->json(['success' => true, 'announcement' => $announcement->fresh()]);
    }

    public function adminDestroy(Request $request, $id)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        Announcement::findOrFail($id)->delete();

        return response()->json(['success' => true, 'message' => 'Announcement deleted.']);
    }
}
