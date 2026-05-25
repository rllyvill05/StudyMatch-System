<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Session;

class SessionNotificationService
{
    public static function notify(int $userId, string $type, string $title, string $message, array $data = []): void
    {
        Notification::create([
            'user_id' => $userId,
            'type'    => $type,
            'title'   => $title,
            'message' => $message,
            'data'    => json_encode($data),
            'is_read' => false,
        ]);
    }

    public static function sessionBooked(Session $session): void
    {
        $session->loadMissing(['tutor.user', 'student.user', 'subject']);
        $tutorUserId = $session->tutor?->user?->id;
        $studentName = $session->student?->user?->name ?? 'A student';
        $when        = $session->scheduled_at?->format('M j, Y g:i A') ?? '';

        if ($tutorUserId) {
            self::notify(
                $tutorUserId,
                'session_request',
                'New session request',
                "{$studentName} booked a session for {$when}.",
                ['session_id' => $session->id]
            );
        }
    }

    public static function sessionAccepted(Session $session): void
    {
        $session->loadMissing(['tutor.user', 'student.user']);
        $studentUserId = $session->student?->user?->id;
        $tutorName     = $session->tutor?->user?->name ?? 'Your tutor';

        if ($studentUserId) {
            self::notify(
                $studentUserId,
                'session_accepted',
                'Session confirmed',
                "{$tutorName} accepted your session request.",
                ['session_id' => $session->id]
            );
        }
    }

    public static function sessionCancelled(Session $session, string $byRole): void
    {
        $session->loadMissing(['tutor.user', 'student.user']);
        $when = $session->scheduled_at?->format('M j, Y g:i A') ?? '';

        if ($byRole === 'student' && $session->tutor?->user?->id) {
            self::notify(
                $session->tutor->user->id,
                'session_cancelled',
                'Session cancelled',
                "A session on {$when} was cancelled by the student.",
                ['session_id' => $session->id]
            );
        }

        if ($byRole === 'tutor' && $session->student?->user?->id) {
            self::notify(
                $session->student->user->id,
                'session_cancelled',
                'Session cancelled',
                "Your session on {$when} was cancelled by the tutor.",
                ['session_id' => $session->id]
            );
        }
    }

    public static function sessionRescheduled(Session $session, string $byRole): void
    {
        $session->loadMissing(['tutor.user', 'student.user']);
        $when = $session->scheduled_at?->format('M j, Y g:i A') ?? '';

        if ($byRole === 'student' && $session->tutor?->user?->id) {
            self::notify(
                $session->tutor->user->id,
                'session_rescheduled',
                'Session rescheduled',
                "A session was moved to {$when}.",
                ['session_id' => $session->id]
            );
        }

        if ($byRole === 'tutor' && $session->student?->user?->id) {
            self::notify(
                $session->student->user->id,
                'session_rescheduled',
                'Session rescheduled',
                "Your session was moved to {$when}.",
                ['session_id' => $session->id]
            );
        }
    }

    public static function sessionReminder(Session $session, int $minutesBefore = 15): void
    {
        $session->loadMissing(['tutor.user', 'student.user']);
        $msg = "Your session starts in {$minutesBefore} minutes.";

        if ($session->student?->user?->id) {
            self::notify($session->student->user->id, 'session_reminder', 'Session starting soon', $msg, ['session_id' => $session->id]);
        }
        if ($session->tutor?->user?->id) {
            self::notify($session->tutor->user->id, 'session_reminder', 'Session starting soon', $msg, ['session_id' => $session->id]);
        }
    }
}
