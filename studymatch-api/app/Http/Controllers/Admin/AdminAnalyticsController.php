<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Session;
use App\Models\Subject;
use App\Models\Tutor;
use App\Models\TutorRequest;
use App\Models\User;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    public function overview()
    {
        $totalSessions     = Session::count();
        $completedSessions = Session::where('status', 'completed')->count();

        return response()->json([
            'total_users'        => User::whereNotIn('role', ['admin', 'super_admin'])->count(),
            'total_sessions'     => $totalSessions,
            'completed_sessions' => $completedSessions,
            'completion_rate'    => $totalSessions > 0
                ? round(($completedSessions / $totalSessions) * 100, 1)
                : 0,
            'total_matches'      => TutorRequest::where('status', 'accepted')->count(),
            'total_complaints'   => Complaint::count(),
            'open_complaints'    => Complaint::where('status', 'open')->count(),
            'active_tutors'      => User::where('role', 'tutor')->count(),
            'active_students'    => User::where('role', 'student')->count(),
            'pending_tutors'     => Tutor::where('verification_status', 'pending')->count(),
        ]);
    }

    public function sessionTrends(Request $request)
    {
        $days = max(1, (int) $request->input('days', 30));
        $from = now()->subDays($days - 1)->startOfDay();
        $to   = now()->endOfDay();

        $raw = Session::select(
                DB::raw('DATE(scheduled_at) as date'),
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed'),
                DB::raw('SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled')
            )
            ->whereBetween('scheduled_at', [$from, $to])
            ->groupBy(DB::raw('DATE(scheduled_at)'))
            ->get()
            ->keyBy('date');

        $trends = [];
        foreach (CarbonPeriod::create($from, '1 day', $to) as $date) {
            $key      = $date->format('Y-m-d');
            $row      = $raw[$key] ?? null;
            $trends[] = [
                'date'      => $key,
                'total'     => (int) ($row->total ?? 0),
                'completed' => (int) ($row->completed ?? 0),
                'cancelled' => (int) ($row->cancelled ?? 0),
            ];
        }

        return response()->json(['trends' => $trends, 'days' => $days]);
    }

    public function userGrowth(Request $request)
    {
        $days = max(1, (int) $request->input('days', 30));
        $from = now()->subDays($days - 1)->startOfDay();
        $to   = now()->endOfDay();

        $raw = User::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN role = "student" THEN 1 ELSE 0 END) as students'),
                DB::raw('SUM(CASE WHEN role = "tutor" THEN 1 ELSE 0 END) as tutors')
            )
            ->whereBetween('created_at', [$from, $to])
            ->whereNotIn('role', ['admin', 'super_admin'])
            ->groupBy(DB::raw('DATE(created_at)'))
            ->get()
            ->keyBy('date');

        $growth = [];
        foreach (CarbonPeriod::create($from, '1 day', $to) as $date) {
            $key      = $date->format('Y-m-d');
            $row      = $raw[$key] ?? null;
            $growth[] = [
                'date'     => $key,
                'total'    => (int) ($row->total ?? 0),
                'students' => (int) ($row->students ?? 0),
                'tutors'   => (int) ($row->tutors ?? 0),
            ];
        }

        return response()->json(['growth' => $growth, 'days' => $days]);
    }

    public function subjectDemand()
    {
        $demand = Subject::select('subjects.id', 'subjects.name', 'subjects.code')
            ->selectRaw('COUNT(DISTINCT student_weak_subjects.student_id) as student_demand')
            ->selectRaw('COUNT(DISTINCT tutor_subjects.tutor_id) as tutor_supply')
            ->selectRaw('COUNT(DISTINCT tutor_requests.id) as request_count')
            ->leftJoin('student_weak_subjects', 'subjects.id', '=', 'student_weak_subjects.subject_id')
            ->leftJoin('tutor_subjects', 'subjects.id', '=', 'tutor_subjects.subject_id')
            ->leftJoin('tutor_requests', 'subjects.id', '=', 'tutor_requests.subject_id')
            ->groupBy('subjects.id', 'subjects.name', 'subjects.code')
            ->orderByDesc('student_demand')
            ->limit(10)
            ->get();

        return response()->json(['subjects' => $demand]);
    }

    public function requestStats()
    {
        $stats = TutorRequest::select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'pending'   => (int) ($stats['pending']   ?? 0),
            'accepted'  => (int) ($stats['accepted']  ?? 0),
            'declined'  => (int) ($stats['declined']  ?? 0),
            'cancelled' => (int) ($stats['cancelled'] ?? 0),
            'total'     => TutorRequest::count(),
        ]);
    }

    public function sessionStatusBreakdown()
    {
        $stats = Session::select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'scheduled'  => (int) ($stats['scheduled']  ?? 0),
            'ongoing'    => (int) ($stats['ongoing']    ?? 0),
            'completed'  => (int) ($stats['completed']  ?? 0),
            'cancelled'  => (int) ($stats['cancelled']  ?? 0),
            'pending'    => (int) ($stats['pending']    ?? 0),
            'total'      => Session::count(),
        ]);
    }

    public function topTutors()
    {
        $tutors = Tutor::select('tutors.id', 'users.name')
            ->join('users', 'tutors.user_id', '=', 'users.id')
            ->selectRaw('COUNT(tutor_sessions.id) as session_count')
            ->selectRaw('AVG(tutors.average_rating) as avg_rating')
            ->leftJoin('tutor_sessions', 'tutors.id', '=', 'tutor_sessions.tutor_id')
            ->groupBy('tutors.id', 'users.name')
            ->orderByDesc('session_count')
            ->limit(5)
            ->get();

        return response()->json(['tutors' => $tutors]);
    }

    public function activity(Request $request)
    {
        $days = (int) $request->input('days', 7);
        $from = now()->subDays($days);

        return response()->json([
            'days'         => $days,
            'new_sessions' => Session::where('created_at', '>=', $from)->count(),
            'new_users'    => User::where('created_at', '>=', $from)->whereNotIn('role', ['admin', 'super_admin'])->count(),
            'new_requests' => TutorRequest::where('created_at', '>=', $from)->count(),
        ]);
    }
}
