<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Session;
use App\Models\TutorRequest;
use App\Models\Complaint;
use App\Models\Feedback;
use Illuminate\Http\Request;

class AdminReportController extends Controller
{
    public function generate(Request $request)
    {
        $request->validate([
            'type' => 'required|in:users,sessions,requests,complaints,feedback',
            'from' => 'nullable|date',
            'to'   => 'nullable|date|after_or_equal:from',
        ]);

        $from = $request->from ? now()->parse($request->from)->startOfDay() : now()->subDays(30)->startOfDay();
        $to   = $request->to ? now()->parse($request->to)->endOfDay() : now()->endOfDay();

        $data = match ($request->type) {
            'users'      => $this->usersReport($from, $to),
            'sessions'   => $this->sessionsReport($from, $to),
            'requests'   => $this->requestsReport($from, $to),
            'complaints' => $this->complaintsReport($from, $to),
            'feedback'   => $this->feedbackReport($from, $to),
        };

        return response()->json([
            'report_type' => $request->type,
            'from'        => $from->toDateString(),
            'to'          => $to->toDateString(),
            'total'       => count($data),
            'data'        => $data,
        ]);
    }

    private function usersReport($from, $to)
    {
        return User::whereBetween('created_at', [$from, $to])
            ->whereNotIn('role', ['admin', 'super_admin'])
            ->select('id', 'name', 'email', 'role', 'created_at')
            ->orderByDesc('created_at')
            ->get();
    }

    private function sessionsReport($from, $to)
    {
        return Session::with(['tutor.user', 'student.user', 'subject'])
            ->whereBetween('scheduled_at', [$from, $to])
            ->orderByDesc('scheduled_at')
            ->get();
    }

    private function requestsReport($from, $to)
    {
        return TutorRequest::with(['student.user', 'tutor.user', 'subject'])
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')
            ->get();
    }

    private function complaintsReport($from, $to)
    {
        return Complaint::with(['submitter', 'reportedUser'])
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')
            ->get();
    }

    private function feedbackReport($from, $to)
    {
        return Feedback::with('user')
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')
            ->get();
    }
}
