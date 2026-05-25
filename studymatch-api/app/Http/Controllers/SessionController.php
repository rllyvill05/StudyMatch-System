<?php

namespace App\Http\Controllers;

use App\Models\Session;
use App\Models\Student;
use App\Models\Tutor;
use App\Services\SessionNotificationService;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function index(Request $request)
    {
        $user  = $request->user()->load(['student', 'tutor']);
        $query = Session::with(['tutor.user', 'student.user', 'subject']);

        if ($user->student) {
            $query->where('student_id', $user->student->id);
        } elseif ($user->role === 'tutor') {
            if (!$user->tutor) {
                Tutor::create([
                    'user_id'             => $user->id,
                    'verification_status' => 'approved',
                    'verified_at'         => now(),
                ]);
                $user->load('tutor');
            }
            $query->where('tutor_id', $user->tutor->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->boolean('today')) {
            $query->whereDate('scheduled_at', now()->toDateString());
        }

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        $sessions = $query->latest('scheduled_at')->paginate(20);

        return response()->json($sessions);
    }

    public function show(Request $request, $id)
    {
        $session = Session::with(['tutor.user', 'student.user', 'subject', 'tutorRequest'])->findOrFail($id);
        $this->authorizeSession($request->user(), $session);

        return response()->json(['session' => $session]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tutor_request_id' => 'nullable|exists:tutor_requests,id',
            'tutor_id'         => 'required_without:student_id|exists:tutors,id',
            'student_id'       => 'required_without:tutor_id|exists:students,id',
            'subject_id'       => 'nullable|exists:subjects,id',
            'scheduled_at'     => 'required|date|after:now',
            'duration_minutes' => 'sometimes|integer|min:30|max:480',
            'session_type'     => 'sometimes|in:online,in_person',
            'notes'            => 'nullable|string|max:1000',
            'session_link'     => 'nullable|url',
        ]);

        $user = $request->user();

        if ($user->role === 'tutor' && $request->filled('student_id')) {
            if (!$user->tutor) {
                Tutor::create([
                    'user_id'             => $user->id,
                    'verification_status' => 'approved',
                    'verified_at'         => now(),
                ]);
                $user->load('tutor');
            }

            $session = Session::create([
                'tutor_request_id' => $request->tutor_request_id,
                'tutor_id'         => $user->tutor->id,
                'student_id'       => $request->student_id,
                'subject_id'       => $request->subject_id,
                'scheduled_at'     => $request->scheduled_at,
                'duration_minutes' => $request->duration_minutes ?? 60,
                'session_type'     => $request->input('session_type', 'online'),
                'notes'            => $request->notes,
                'session_link'     => $request->session_link,
                'status'           => 'pending',
            ]);

            $session->load(['tutor.user', 'student.user', 'subject']);
            SessionNotificationService::sessionBooked($session);

            return response()->json(['message' => 'Session request sent to student.', 'session' => $session], 201);
        }

        $student = $user->student;
        if (!$student && $user->role === 'student') {
            $student = Student::create(['user_id' => $user->id]);
        }
        if (!$student) {
            return response()->json(['message' => 'Only students can book sessions this way.'], 403);
        }

        $session = Session::create([
            'tutor_request_id' => $request->tutor_request_id,
            'tutor_id'         => $request->tutor_id,
            'student_id'       => $student->id,
            'subject_id'       => $request->subject_id,
            'scheduled_at'     => $request->scheduled_at,
            'duration_minutes' => $request->duration_minutes ?? 60,
            'session_type'     => $request->input('session_type', 'online'),
            'notes'            => $request->notes,
            'session_link'     => $request->session_link,
            'status'           => 'pending',
        ]);

        $session->load(['tutor.user', 'student.user', 'subject']);
        SessionNotificationService::sessionBooked($session);

        return response()->json(['message' => 'Session booked.', 'session' => $session], 201);
    }

    public function update(Request $request, $id)
    {
        $session = Session::findOrFail($id);
        $this->authorizeSession($request->user(), $session);

        $request->validate([
            'scheduled_at'     => 'sometimes|date|after:now',
            'duration_minutes' => 'sometimes|integer|min:30|max:480',
            'notes'            => 'nullable|string|max:1000',
            'session_link'     => 'nullable|url',
            'session_type'     => 'sometimes|in:online,in_person',
            'subject_id'       => 'nullable|exists:subjects,id',
            'status'           => 'sometimes|in:completed,cancelled,scheduled',
        ]);

        $data = $request->only([
            'scheduled_at', 'duration_minutes', 'notes',
            'session_link', 'session_type', 'subject_id', 'status',
        ]);

        if (($data['status'] ?? null) === 'completed') {
            $data['completed_at'] = now();
        }

        $session->update($data);

        return response()->json([
            'message' => 'Session updated.',
            'session' => $session->fresh()->load(['tutor.user', 'student.user', 'subject']),
        ]);
    }

    public function reschedule(Request $request, $id)
    {
        $session = Session::findOrFail($id);
        $this->authorizeSession($request->user(), $session);

        $request->validate([
            'scheduled_at'     => 'required|date|after:now',
            'duration_minutes' => 'sometimes|integer|min:30|max:480',
            'session_link'     => 'nullable|url',
            'notes'            => 'nullable|string|max:1000',
        ]);

        $user = $request->user();
        $byRole = $user->student ? 'student' : 'tutor';

        $session->update([
            'scheduled_at'     => $request->scheduled_at,
            'duration_minutes' => $request->duration_minutes ?? $session->duration_minutes,
            'session_link'     => $request->session_link ?? $session->session_link,
            'notes'            => $request->has('notes') ? $request->notes : $session->notes,
            'status'           => $session->status === 'pending' ? 'pending' : 'rescheduled',
        ]);

        $session->load(['tutor.user', 'student.user', 'subject']);
        SessionNotificationService::sessionRescheduled($session, $byRole);

        return response()->json([
            'message' => 'Session rescheduled.',
            'session' => $session->fresh()->load(['tutor.user', 'student.user', 'subject']),
        ]);
    }

    public function accept(Request $request, $id)
    {
        $session = Session::findOrFail($id);
        $user    = $request->user();

        if (!$user->tutor || $session->tutor_id !== $user->tutor->id) {
            abort(403, 'Only the assigned tutor can accept this session.');
        }

        if ($session->status !== 'pending') {
            return response()->json(['message' => 'Session is not pending.'], 422);
        }

        $session->update(['status' => 'scheduled']);
        $session->load(['tutor.user', 'student.user', 'subject']);
        SessionNotificationService::sessionAccepted($session);

        return response()->json([
            'message' => 'Session accepted.',
            'session' => $session->fresh()->load(['tutor.user', 'student.user', 'subject']),
        ]);
    }

    public function decline(Request $request, $id)
    {
        $session = Session::findOrFail($id);
        $user    = $request->user();

        if (!$user->tutor || $session->tutor_id !== $user->tutor->id) {
            abort(403, 'Only the assigned tutor can decline this session.');
        }

        if ($session->status !== 'pending') {
            return response()->json(['message' => 'Session is not pending.'], 422);
        }

        $session->update(['status' => 'cancelled', 'cancelled_at' => now()]);
        $session->load(['tutor.user', 'student.user']);
        SessionNotificationService::sessionCancelled($session, 'tutor');

        return response()->json(['message' => 'Session declined.']);
    }

    public function complete(Request $request, $id)
    {
        $session = Session::findOrFail($id);
        $user    = $request->user();

        if (!$user->tutor || $session->tutor_id !== $user->tutor->id) {
            abort(403, 'Only the assigned tutor can complete this session.');
        }

        $session->update(['status' => 'completed', 'completed_at' => now()]);

        return response()->json([
            'message' => 'Session marked as completed.',
            'session' => $session->fresh()->load(['tutor.user', 'student.user', 'subject']),
        ]);
    }

    public function cancel(Request $request, $id)
    {
        $session = Session::findOrFail($id);
        $user    = $request->user();
        $this->authorizeSession($user, $session);

        $session->update(['status' => 'cancelled', 'cancelled_at' => now()]);
        $session->load(['tutor.user', 'student.user']);
        $byRole = $user->student ? 'student' : 'tutor';
        SessionNotificationService::sessionCancelled($session, $byRole);

        return response()->json(['message' => 'Session cancelled.']);
    }

    private function authorizeSession($user, Session $session): void
    {
        $isOwner = ($user->student && $session->student_id === $user->student->id)
                || ($user->tutor   && $session->tutor_id   === $user->tutor->id)
                || $user->role === 'admin';

        abort_unless($isOwner, 403, 'Unauthorized.');
    }
}
