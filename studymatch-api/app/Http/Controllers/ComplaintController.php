<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\Notification;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    public function index(Request $request)
    {
        $complaints = Complaint::with(['reportedUser'])
            ->where('submitted_by', $request->user()->id)
            ->latest()
            ->get();

        return response()->json(['complaints' => $complaints]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'reported_user_id' => 'nullable|exists:users,id',
            'subject'          => 'required|string|max:255',
            'description'      => 'required|string|max:3000',
            'priority'         => 'sometimes|in:low,medium,high',
        ]);

        if ($request->reported_user_id && $request->reported_user_id == $request->user()->id) {
            return response()->json(['message' => 'You cannot report yourself.'], 422);
        }

        $complaint = Complaint::create([
            'submitted_by'     => $request->user()->id,
            'reported_user_id' => $request->reported_user_id,
            'subject'          => $request->subject,
            'description'      => $request->description,
            'priority'         => $request->priority ?? 'medium',
            'status'           => 'open',
        ]);

        $user = $request->user();
        Notification::notifyAdmins(
            'warning',
            'New Complaint Filed',
            "{$user->name} filed a {$complaint->priority} priority complaint: \"{$complaint->subject}\"",
            ['complaint_id' => $complaint->id, 'priority' => $complaint->priority]
        );

        return response()->json(['message' => 'Complaint submitted.', 'complaint' => $complaint], 201);
    }

    public function adminIndex(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = Complaint::with(['submittedBy', 'reportedUser'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $complaints = $query->get()->map(fn ($c) => [
            'id'               => $c->id,
            'subject'          => $c->subject,
            'description'      => $c->description,
            'status'           => $c->status,
            'priority'         => $c->priority,
            'resolution_notes' => $c->resolution_notes,
            'created_at'       => $c->created_at,
            'submitted_by'     => $c->submittedBy ? ['id' => $c->submittedBy->id, 'name' => $c->submittedBy->name] : null,
            'reported_user'    => $c->reportedUser ? ['id' => $c->reportedUser->id, 'name' => $c->reportedUser->name] : null,
        ]);

        return response()->json(['data' => $complaints]);
    }

    public function adminUpdate(Request $request, int $id)
    {
        if (!in_array($request->user()->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $complaint = Complaint::findOrFail($id);

        $request->validate([
            'status'           => 'sometimes|in:open,reviewing,resolved,dismissed',
            'priority'         => 'sometimes|in:low,medium,high',
            'resolution_notes' => 'nullable|string|max:3000',
        ]);

        $data = $request->only(['status', 'priority', 'resolution_notes']);

        if (in_array($data['status'] ?? null, ['resolved', 'dismissed'])) {
            $data['resolved_by'] = $request->user()->id;
            $data['resolved_at'] = now();
        }

        $complaint->update($data);

        // Notify the submitter when their complaint status changes
        if (!empty($data['status']) && $data['status'] !== 'open') {
            $label = match($data['status']) {
                'reviewing'  => 'is being reviewed',
                'resolved'   => 'has been resolved',
                'dismissed'  => 'has been reviewed and closed',
                default      => 'was updated',
            };
            Notification::send(
                $complaint->submitted_by,
                'system',
                'Complaint ' . ucfirst($data['status']),
                "Your complaint \"{$complaint->subject}\" {$label}.",
                ['complaint_id' => $complaint->id]
            );
        }

        return response()->json(['message' => 'Complaint updated.', 'complaint' => $complaint->fresh()]);
    }
}
