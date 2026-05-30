<?php

namespace App\Http\Controllers;

use App\Models\HelpTicket;
use App\Models\Notification;
use Illuminate\Http\Request;

class HelpCenterController extends Controller
{
    public function index(Request $request)
    {
        $tickets = HelpTicket::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json(['tickets' => $tickets]);
    }

    public function submit(Request $request)
    {
        $request->validate([
            'subject'     => 'required|string|max:255',
            'message'     => 'sometimes|string|max:5000',
            'description' => 'sometimes|string|max:5000',
            'category'    => 'nullable|string|max:100',
            'priority'    => 'sometimes|in:low,medium,high,urgent',
        ]);

        // Accept either 'message' or 'description' (web sends 'description')
        $body = $request->input('message') ?? $request->input('description') ?? '';

        if (empty(trim($body))) {
            return response()->json(['message' => 'The message field is required.'], 422);
        }

        $ticket = HelpTicket::create([
            'user_id'  => $request->user()->id,
            'subject'  => $request->subject,
            'message'  => $body,
            'category' => $request->category,
            'priority' => $request->priority ?? 'medium',
            'status'   => 'open',
        ]);

        $user = $request->user();
        Notification::notifyAdmins(
            'system',
            'New Help Ticket',
            "{$user->name} submitted a help ticket: \"{$ticket->subject}\"",
            ['ticket_id' => $ticket->id, 'priority' => $ticket->priority]
        );

        return response()->json(['message' => 'Support ticket submitted.', 'ticket' => $ticket], 201);
    }
}
