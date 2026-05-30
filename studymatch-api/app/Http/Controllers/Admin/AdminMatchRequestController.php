<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TutorRequest;
use Illuminate\Http\Request;

class AdminMatchRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = TutorRequest::with([
            'student.user',
            'tutor.user',
            'subject',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->latest()->paginate(20);

        $requests->getCollection()->transform(function ($req) {
            return [
                'id'         => $req->id,
                'status'     => $req->status,
                'message'    => $req->message,
                'accepted_at' => $req->accepted_at,
                'declined_at' => $req->declined_at,
                'created_at' => $req->created_at,
                'updated_at' => $req->updated_at,
                'subject'    => $req->subject ? $req->subject->name : null,
                'requester'  => $req->student ? [
                    'id'    => $req->student->user->id ?? null,
                    'name'  => $req->student->user->name ?? '—',
                    'email' => $req->student->user->email ?? null,
                ] : null,
                'receiver'   => $req->tutor ? [
                    'id'    => $req->tutor->user->id ?? null,
                    'name'  => $req->tutor->user->name ?? '—',
                    'email' => $req->tutor->user->email ?? null,
                ] : null,
            ];
        });

        return response()->json($requests);
    }
}
