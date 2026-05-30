<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Feedback;
use App\Models\Notification;
use Illuminate\Http\Request;

class AdminFeedbackController extends Controller
{
    public function index(Request $request)
    {
        $query = Feedback::with('user');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $feedback = $query->latest()->paginate((int) $request->input('per_page', 20));

        return response()->json($feedback);
    }

    public function update(Request $request, int $id)
    {
        $feedback = Feedback::findOrFail($id);

        $request->validate([
            'status'      => 'required|in:unread,read,flagged',
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $feedback->update($request->only(['status', 'admin_notes']));

        // Notify the user if their feedback was flagged (so they're aware it's been seen)
        if ($request->status === 'flagged') {
            Notification::send(
                $feedback->user_id,
                'system',
                'Feedback received',
                'Thank you — your feedback has been reviewed and flagged for action by our team.',
                ['feedback_id' => $feedback->id]
            );
        }

        AuditLog::record('update', 'feedback', "Admin marked feedback #{$id} as {$request->status}", ['feedback_id' => $id, 'status' => $request->status]);

        return response()->json(['message' => 'Feedback updated.', 'feedback' => $feedback->fresh()]);
    }
}
