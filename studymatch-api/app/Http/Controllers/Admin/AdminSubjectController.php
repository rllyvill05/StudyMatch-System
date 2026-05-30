<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Subject;
use App\Models\Tutor;
use App\Models\TutorSubject;
use Illuminate\Http\Request;

class AdminSubjectController extends Controller
{
    // ── Subjects CRUD ────────────────────────────────────────────────

    public function index()
    {
        $subjects = Subject::withCount('tutorSubjects as tutor_count')
            ->orderBy('name')
            ->get();

        return response()->json(['subjects' => $subjects]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'        => 'required|string|max:255|unique:subjects,name',
            'code'        => 'required|string|max:50|unique:subjects,code',
            'description' => 'nullable|string|max:1000',
        ]);

        $subject = Subject::create($request->only(['name', 'code', 'description']));

        AuditLog::record('create', 'subjects', "Admin created subject {$subject->name} ({$subject->code})", ['subject_id' => $subject->id]);

        return response()->json(['message' => 'Subject created.', 'subject' => $subject], 201);
    }

    public function update(Request $request, int $id)
    {
        $subject = Subject::findOrFail($id);

        $request->validate([
            'name'        => 'sometimes|string|max:255|unique:subjects,name,' . $id,
            'code'        => 'sometimes|string|max:50|unique:subjects,code,' . $id,
            'description' => 'nullable|string|max:1000',
        ]);

        $subject->update($request->only(['name', 'code', 'description']));

        AuditLog::record('update', 'subjects', "Admin updated subject {$subject->name}", ['subject_id' => $id]);

        return response()->json(['message' => 'Subject updated.', 'subject' => $subject->fresh()]);
    }

    public function destroy(int $id)
    {
        $subject = Subject::findOrFail($id);
        $name    = $subject->name;
        $subject->delete();

        AuditLog::record('delete', 'subjects', "Admin deleted subject {$name}", ['subject_id' => $id]);

        return response()->json(['message' => 'Subject deleted.']);
    }

    // ── All Tutors (for subject management) ──────────────────────────

    public function allTutors(Request $request)
    {
        $tutors = Tutor::with(['user', 'strongSubjects.subject'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->whereHas('user', fn ($u) =>
                    $u->where('name', 'LIKE', "%{$request->search}%")
                      ->orWhere('email', 'LIKE', "%{$request->search}%")
                );
            })
            ->latest()
            ->get();

        return response()->json(['tutors' => $tutors]);
    }

    // ── Tutor Subject Assignment ──────────────────────────────────────

    public function tutorSubjects(int $tutorId)
    {
        $tutor = Tutor::with('strongSubjects.subject')->findOrFail($tutorId);

        return response()->json(['subjects' => $tutor->strongSubjects]);
    }

    public function assignSubject(Request $request, int $tutorId)
    {
        Tutor::findOrFail($tutorId);

        $request->validate([
            'subject_id'           => 'required|integer|exists:subjects,id',
            'expertise_level'      => 'sometimes|in:competent,proficient,expert,master',
            'years_teaching'       => 'sometimes|integer|min:0',
            'is_primary_expertise' => 'sometimes|boolean',
        ]);

        $exists = TutorSubject::where('tutor_id', $tutorId)
            ->where('subject_id', $request->subject_id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Subject already assigned to this tutor.'], 422);
        }

        $ts = TutorSubject::create([
            'tutor_id'             => $tutorId,
            'subject_id'           => $request->subject_id,
            'expertise_level'      => $request->expertise_level      ?? 'competent',
            'years_teaching'       => $request->years_teaching       ?? 0,
            'is_primary_expertise' => $request->is_primary_expertise ?? false,
        ]);

        AuditLog::record(
            'create', 'tutor_subjects',
            "Admin assigned subject #{$request->subject_id} to tutor #{$tutorId}",
            ['tutor_id' => $tutorId, 'subject_id' => $request->subject_id]
        );

        return response()->json(['message' => 'Subject assigned.', 'tutor_subject' => $ts->load('subject')], 201);
    }

    public function updateTutorSubject(Request $request, int $tutorId, int $subjectId)
    {
        $ts = TutorSubject::where('tutor_id', $tutorId)
            ->where('subject_id', $subjectId)
            ->firstOrFail();

        $request->validate([
            'expertise_level'      => 'sometimes|in:competent,proficient,expert,master',
            'years_teaching'       => 'sometimes|integer|min:0',
            'is_primary_expertise' => 'sometimes|boolean',
        ]);

        $ts->update($request->only(['expertise_level', 'years_teaching', 'is_primary_expertise']));

        return response()->json(['message' => 'Tutor subject updated.', 'tutor_subject' => $ts->fresh()->load('subject')]);
    }

    public function removeTutorSubject(int $tutorId, int $subjectId)
    {
        $ts = TutorSubject::where('tutor_id', $tutorId)
            ->where('subject_id', $subjectId)
            ->firstOrFail();

        $ts->delete();

        AuditLog::record(
            'delete', 'tutor_subjects',
            "Admin removed subject #{$subjectId} from tutor #{$tutorId}",
            ['tutor_id' => $tutorId, 'subject_id' => $subjectId]
        );

        return response()->json(['message' => 'Subject removed from tutor.']);
    }
}
