<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Tutor;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    /**
     * Browse students for tutors. Returns all active students, ranked by match
     * to the tutor profile and optional UI filters (soft match — not hard exclusion).
     */
    public function index(Request $request)
    {
        if ($request->user()->role !== 'tutor') {
            return response()->json(['message' => 'Only tutors can browse students.'], 403);
        }

        $user = $request->user();
        if (!$user->tutor) {
            Tutor::create([
                'user_id'             => $user->id,
                'verification_status' => 'approved',
                'verified_at'         => now(),
            ]);
            $user->load('tutor.strongSubjects.subject', 'tutor.availability');
        } else {
            $user->load('tutor.strongSubjects.subject', 'tutor.availability');
        }

        $tutor = $user->tutor;

        $query = Student::with(['user', 'weakSubjects.subject'])
            ->whereHas('user', function ($q) {
                $q->where('role', 'student')->whereNull('suspended_at');
            });

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($u) use ($search) {
                    $u->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%");
                })
                ->orWhere('program', 'LIKE', "%{$search}%")
                ->orWhere('study_goals', 'LIKE', "%{$search}%")
                ->orWhere('preferred_days', 'LIKE', "%{$search}%")
                ->orWhere('preferred_time', 'LIKE', "%{$search}%")
                ->orWhere('study_style', 'LIKE', "%{$search}%")
                ->orWhereHas('weakSubjects.subject', function ($s) use ($search) {
                    $s->where('name', 'LIKE', "%{$search}%");
                });
            });
        }

        $students = $query->orderBy('updated_at', 'desc')->limit(100)->get();

        $acceptedStudentIds = $this->acceptedStudentIds($tutor);
        $tutorSubjectNames  = $tutor
            ? $tutor->strongSubjects->map(fn ($ts) => $ts->subject?->name)->filter()->values()->all()
            : [];

        $data = $students->map(function (Student $student) use ($tutor, $request, $acceptedStudentIds, $tutorSubjectNames) {
            $user = $student->user;
            $subjects = $this->studentSubjectNames($student);

            $activity = $this->activityLabel($user?->updated_at);

            return [
                'id'                 => $student->id,
                'user_id'            => $user?->id,
                'name'               => $user?->name ?? 'Student',
                'email'              => $user?->email,
                'program'            => $student->program,
                'department'         => $student->program,
                'year_level'         => $student->year_level,
                'study_goals'        => $student->study_goals,
                'study_style'        => $student->study_style,
                'preferred_days'     => $student->preferred_days,
                'preferred_time'     => $student->preferred_time,
                'availability'       => $this->formatAvailability($student),
                'session_preference' => $this->sessionPreference($student),
                'subjects'           => $subjects,
                'help_subjects'      => $subjects,
                'match_percentage'   => $this->computeMatchPercentage($student, $tutor, $request, $tutorSubjectNames),
                'is_online'          => $activity['is_online'],
                'activity_label'     => $activity['label'],
                'already_matched'    => in_array($student->id, $acceptedStudentIds, true),
                'user'               => $user ? ['id' => $user->id, 'name' => $user->name, 'email' => $user->email] : null,
            ];
        })
        ->sortByDesc('match_percentage')
        ->values();

        if ($request->boolean('strict')) {
            $data = $data->filter(fn ($row) => $row['match_percentage'] >= 70)->values();
        }

        return response()->json([
            'data'  => $data,
            'total' => $data->count(),
        ]);
    }

    private function studentSubjectNames(Student $student): array
    {
        $fromWeak = $student->weakSubjects
            ->filter(fn ($ws) => $ws->needs_help !== false)
            ->map(fn ($ws) => $ws->subject?->name)
            ->filter()
            ->values()
            ->all();

        if (!empty($fromWeak)) {
            return $fromWeak;
        }

        $program = trim($student->program ?? '');
        if ($program !== '') {
            return [$program];
        }

        return [];
    }

    private function acceptedStudentIds(?Tutor $tutor): array
    {
        if (!$tutor) {
            return [];
        }

        return $tutor->tutorRequests()
            ->where('status', 'accepted')
            ->pluck('student_id')
            ->all();
    }

    private function goalKeyword(string $goal): string
    {
        return match ($goal) {
            'Exam Prep'             => 'exam',
            'Concept Understanding' => 'concept',
            'Skill Building'        => 'skill',
            'Project Help'          => 'project',
            default                 => strtolower($goal),
        };
    }

    private function formatAvailability(Student $student): string
    {
        $parts = array_filter([
            $student->preferred_days,
            $student->preferred_time,
        ]);

        return $parts ? implode(' · ', $parts) : '';
    }

    private function sessionPreference(Student $student): string
    {
        $style = strtolower($student->study_style ?? '');
        if (str_contains($style, 'online') && !str_contains($style, 'person')) {
            return 'Online';
        }
        if (str_contains($style, 'person') || str_contains($style, 'face')) {
            return 'Face-to-face';
        }

        return 'Online or In-person';
    }

    private function activityLabel($updatedAt): array
    {
        if (!$updatedAt) {
            return ['label' => '', 'is_online' => false];
        }

        $minutes = now()->diffInMinutes($updatedAt);
        if ($minutes <= 15) {
            return ['label' => 'Active now', 'is_online' => true];
        }

        if ($minutes < 60) {
            return ['label' => 'Last active ' . $minutes . 'm ago', 'is_online' => false];
        }

        $hours = (int) floor($minutes / 60);
        if ($hours < 48) {
            return ['label' => 'Last active ' . $hours . 'h ago', 'is_online' => false];
        }

        $days = (int) floor($hours / 24);

        return ['label' => 'Last active ' . $days . 'd ago', 'is_online' => false];
    }

    private function computeMatchPercentage(
        Student $student,
        ?Tutor $tutor,
        Request $request,
        array $tutorSubjectNames
    ): int {
        $score = 40;

        $studentSubjectNames = $this->studentSubjectNames($student);
        $studentSubjectLower = array_map('strtolower', $studentSubjectNames);
        $programLower        = strtolower($student->program ?? '');

        if ($tutor && !empty($tutorSubjectNames)) {
            foreach ($tutorSubjectNames as $tName) {
                $tLower = strtolower($tName);
                foreach ($studentSubjectLower as $sLower) {
                    if ($sLower === $tLower || str_contains($sLower, $tLower) || str_contains($tLower, $sLower)) {
                        $score += 18;
                        break 2;
                    }
                }
                if ($programLower && (str_contains($programLower, $tLower) || str_contains($tLower, $programLower))) {
                    $score += 12;
                    break;
                }
            }
        } elseif (!empty($studentSubjectNames)) {
            $score += 10;
        }

        $filterSubject = $request->input('subject');
        if ($filterSubject && $filterSubject !== 'All Subjects') {
            $fLower = strtolower($filterSubject);
            $subjectHit = collect($studentSubjectLower)->contains(
                fn ($n) => $n === $fLower || str_contains($n, $fLower) || str_contains($fLower, $n)
            ) || ($programLower && str_contains($programLower, $fLower));

            if ($subjectHit) {
                $score += 20;
            } else {
                $score -= 5;
            }
        }

        $goals = strtolower($student->study_goals ?? '');
        $filterGoal = $request->input('goal');
        if ($filterGoal && $filterGoal !== 'Learning Goals') {
            $kw = strtolower($filterGoal);
            $keyword = $this->goalKeyword($filterGoal);
            if (str_contains($goals, $kw) || ($keyword && str_contains($goals, $keyword))) {
                $score += 15;
            }
        } elseif ($goals !== '') {
            $score += 5;
        }

        $pref = strtolower(($student->preferred_time ?? '') . ' ' . ($student->preferred_days ?? ''));
        $filterAvail = $request->input('availability');
        if ($filterAvail && $filterAvail !== 'Availability') {
            $avail = strtolower($filterAvail);
            if (
                str_contains($pref, rtrim($avail, 's'))
                || ($avail === 'weekdays' && (str_contains($pref, 'weekday') || str_contains($pref, 'mon')))
                || ($avail === 'weekends' && (str_contains($pref, 'weekend') || str_contains($pref, 'sat')))
                || ($avail === 'evenings' && str_contains($pref, 'evening'))
                || ($avail === 'mornings' && str_contains($pref, 'morning'))
            ) {
                $score += 12;
            }
        } elseif ($pref !== '') {
            $score += 4;
        }

        if ($student->study_style) {
            $score += 3;
        }

        if ($student->program) {
            $score += 3;
        }

        return min(99, max(52, $score));
    }
}
