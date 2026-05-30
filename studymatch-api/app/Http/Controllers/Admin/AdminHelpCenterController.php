<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Conversation;
use App\Models\HelpTicket;
use App\Models\Message;
use App\Models\Notification;
use Illuminate\Http\Request;

class AdminHelpCenterController extends Controller
{
    public function index(Request $request)
    {
        $query = HelpTicket::with(['user', 'respondedBy']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('search')) {
            $query->where('subject', 'LIKE', "%{$request->search}%")
                  ->orWhereHas('user', fn($q) => $q->where('name', 'LIKE', "%{$request->search}%"));
        }

        $tickets = $query->latest()->paginate((int) $request->input('per_page', 20));

        return response()->json($tickets);
    }

    public function show(int $id)
    {
        $ticket = HelpTicket::with(['user', 'respondedBy'])->findOrFail($id);

        return response()->json(['ticket' => $ticket]);
    }

    public function respond(Request $request, int $id)
    {
        $ticket = HelpTicket::findOrFail($id);

        $request->validate([
            'admin_response' => 'required|string|max:5000',
            'status'         => 'sometimes|in:open,in_progress,resolved,closed',
        ]);

        /** @var \App\Models\User $admin */
        $admin = $request->user();

        $status = $request->input('status', 'resolved');

        $ticket->update([
            'admin_response' => $request->admin_response,
            'status'         => $status,
            'responded_by'   => $admin->id,
            'responded_at'   => now(),
        ]);

        // Notify the user their ticket got a response
        Notification::send(
            $ticket->user_id,
            'system',
            'Support ticket ' . ($status === 'resolved' ? 'resolved' : 'updated'),
            "Your ticket \"{$ticket->subject}\" received a response: {$request->admin_response}",
            ['ticket_id' => $ticket->id]
        );

        // Send a system message in the conversation (cannot be replied to)
        $adminId = $admin->id;
        $userId  = $ticket->user_id;

        $conversation = Conversation::where(function ($q) use ($adminId, $userId) {
            $q->where('participant_one_id', $adminId)->where('participant_two_id', $userId);
        })->orWhere(function ($q) use ($adminId, $userId) {
            $q->where('participant_one_id', $userId)->where('participant_two_id', $adminId);
        })->first();

        if (!$conversation) {
            $conversation = Conversation::create([
                'participant_one_id' => $adminId,
                'participant_two_id' => $userId,
                'last_message_at'    => now(),
            ]);
        }

        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id'       => $adminId,
            'message_type'    => 'system',
            'content'         => "[Support Response] Re: {$ticket->subject}\n\n{$request->admin_response}",
            'is_read'         => false,
        ]);

        $conversation->update(['last_message_at' => now()]);

        AuditLog::record('respond', 'system', "Admin responded to help ticket #{$id}: \"{$ticket->subject}\"", ['ticket_id' => $id, 'status' => $status]);

        return response()->json(['message' => 'Response sent.', 'ticket' => $ticket->fresh()]);
    }
}
