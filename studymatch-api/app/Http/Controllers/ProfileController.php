<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Tutor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * GET /profile — return the authenticated user's full profile
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $this->ensureRoleProfile($user);

        $user->load(['student.weakSubjects.subject', 'tutor.strongSubjects.subject', 'tutor.availability']);

        return response()->json(['user' => $this->formatUserProfile($user)]);
    }

    /**
     * Ensure student/tutor sub-profile exists when user.role matches.
     */
    private function ensureRoleProfile($user): void
    {
        if ($user->role === 'student' && !$user->student) {
            Student::create(['user_id' => $user->id]);
            $user->unsetRelation('student');
            $user->load('student');
        }

        if ($user->role === 'tutor' && !$user->tutor) {
            Tutor::create([
                'user_id'             => $user->id,
                'verification_status' => 'approved',
                'verified_at'         => now(),
            ]);
            $user->unsetRelation('tutor');
            $user->load('tutor');
        }
    }

    /**
     * PUT /profile — general profile update (name, bio, role, avatar, etc.)
     * Accepts both snake_case (server) and camelCase (mobile) field names.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name'           => 'sometimes|string|max:255',
            'fullName'       => 'sometimes|string|max:255',
            'phone'          => 'sometimes|nullable|string|max:20',
            'role'           => 'sometimes|in:student,tutor',
            'study_style'    => 'sometimes|nullable|string|max:100',
            'preferred_days' => 'sometimes|nullable|string|max:255',
            'preferred_time' => 'sometimes|nullable|string|max:100',
            'study_goals'    => 'sometimes|nullable|string|max:2000',
        ]);

        $name = $request->input('name') ?? $request->input('fullName');
        if ($name) {
            $user->update(['name' => $name]);
        }

        if ($request->has('phone')) {
            $user->update(['phone' => $request->phone]);
        }

        if ($request->has('role') && $request->role !== $user->role) {
            $user->update(['role' => $request->role]);
            $user->refresh();
        }

        $this->ensureRoleProfile($user);

        if ($user->student) {
            $studentFields = [
                'student_id', 'program', 'year_level', 'bio',
                'study_style', 'preferred_days', 'preferred_time', 'study_goals',
            ];
            $toUpdate = [];
            foreach ($studentFields as $field) {
                if ($request->has($field)) {
                    $toUpdate[$field] = $request->input($field);
                }
            }
            if ($request->has('course') && !$request->has('program')) {
                $toUpdate['program'] = $request->course;
            }
            if (!empty($toUpdate)) {
                $user->student->update($toUpdate);
            }
        }

        if ($user->tutor && $request->hasAny(['employee_id', 'position', 'tutor_type', 'specialization', 'hourly_rate', 'bio', 'credentials', 'is_available'])) {
            $user->tutor->update($request->only(['employee_id', 'position', 'tutor_type', 'specialization', 'hourly_rate', 'bio', 'credentials', 'is_available']));
        }

        $user = $user->fresh()->load(['student', 'tutor']);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'user'    => $this->formatUserProfile($user),
        ]);
    }

    /**
     * Flatten student study preferences onto user JSON for the web app.
     */
    private function formatUserProfile($user): array
    {
        $data = $user->toArray();

        if ($user->student) {
            $data['study_style']    = $user->student->study_style;
            $data['preferred_days'] = $user->student->preferred_days;
            $data['preferred_time'] = $user->student->preferred_time;
            $data['study_goals']    = $user->student->study_goals;
        }

        return $data;
    }

    /**
     * PUT /profile/step-1 — basic info: name + bio
     */
    public function step1(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'bio'  => 'nullable|string|max:1000',
        ]);

        $user = $request->user();
        $user->update(['name' => $request->name]);

        if ($user->student) {
            $user->student->update(['bio' => $request->bio]);
        } elseif ($user->tutor) {
            $user->tutor->update(['bio' => $request->bio]);
        }

        return response()->json(['message' => 'Step 1 saved.', 'user' => $user->fresh()->load(['student', 'tutor'])]);
    }

    /**
     * PUT /profile/step-2 — academic / professional info
     * Student: student_id, program, year_level
     * Tutor:   employee_id, position, tutor_type, specialization, hourly_rate, credentials
     */
    public function step2(Request $request)
    {
        $user = $request->user();

        if ($user->student) {
            $request->validate([
                'student_id' => 'nullable|string|max:50',
                'program'    => 'nullable|string|max:255',
                'year_level' => 'nullable|string|max:20',
            ]);

            $yearLevelMap = [
                '1st Year' => '1st', '2nd Year' => '2nd', '3rd Year' => '3rd',
                '4th Year' => '4th', '5th Year' => '5th', 'Graduate' => '5th',
            ];
            $yearLevel = $request->year_level
                ? ($yearLevelMap[$request->year_level] ?? $request->year_level)
                : null;

            $user->student->update(array_merge(
                $request->only(['student_id', 'program']),
                ['year_level' => $yearLevel]
            ));
        } elseif ($user->tutor) {
            $request->validate([
                'employee_id'    => 'nullable|string|max:50',
                'position'       => 'nullable|string|max:255',
                'tutor_type'     => 'nullable|in:professor,instructor,student_tutor',
                'specialization' => 'nullable|string|max:255',
                'hourly_rate'    => 'nullable|numeric|min:0',
                'credentials'    => 'nullable|string|max:2000',
            ]);
            $user->tutor->update($request->only(['employee_id', 'position', 'tutor_type', 'specialization', 'hourly_rate', 'credentials']));
        }

        return response()->json(['message' => 'Step 2 saved.', 'user' => $user->fresh()->load(['student', 'tutor'])]);
    }

    /**
     * PUT /profile/step-3 — subjects
     * Student: weak subjects (array of subject_ids with difficulty_level)
     * Tutor:   strong subjects (array of subject_ids with expertise_level)
     */
    public function step3(Request $request)
    {
        $user = $request->user();

        if ($user->student) {
            $request->validate([
                'subjects'                    => 'nullable|array',
                'subjects.*.subject_id'       => 'required|exists:subjects,id',
                'subjects.*.difficulty_level' => 'required|in:moderate,difficult,very_difficult',
            ]);

            if ($request->has('subjects')) {
                $user->student->weakSubjects()->delete();
                foreach ($request->subjects as $item) {
                    $user->student->weakSubjects()->create([
                        'subject_id'       => $item['subject_id'],
                        'difficulty_level' => $item['difficulty_level'],
                        'needs_help'       => true,
                    ]);
                }
            }
        } elseif ($user->tutor) {
            $request->validate([
                'subjects'                   => 'nullable|array',
                'subjects.*.subject_id'      => 'required|exists:subjects,id',
                'subjects.*.expertise_level' => 'nullable|string|max:100',
                'subjects.*.years_teaching'  => 'nullable|integer|min:0',
            ]);

            if ($request->has('subjects')) {
                $user->tutor->strongSubjects()->delete();
                foreach ($request->subjects as $item) {
                    $user->tutor->strongSubjects()->create([
                        'subject_id'      => $item['subject_id'],
                        'expertise_level' => $item['expertise_level'] ?? null,
                        'years_teaching'  => $item['years_teaching'] ?? null,
                    ]);
                }
            }
        }

        return response()->json(['message' => 'Step 3 saved.', 'user' => $user->fresh()->load(['student.weakSubjects.subject', 'tutor.strongSubjects.subject'])]);
    }

    /**
     * PUT /profile/step-4 — availability (tutors) / preferences (students)
     * Tutor:   availability slots (array of day + time ranges)
     * Student: no-op or future preference fields
     */
    public function step4(Request $request)
    {
        $user = $request->user();

        if ($user->tutor) {
            $request->validate([
                'availability'                 => 'nullable|array',
                'availability.*.day'           => 'required|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
                'availability.*.start_time'    => 'required|date_format:H:i',
                'availability.*.end_time'      => 'required|date_format:H:i|after:availability.*.start_time',
            ]);

            if ($request->has('availability')) {
                $user->tutor->availability()->delete();
                foreach ($request->availability as $slot) {
                    $user->tutor->availability()->create([
                        'day_of_week' => $slot['day'],
                        'start_time'  => $slot['start_time'],
                        'end_time'    => $slot['end_time'],
                        'is_active'   => true,
                    ]);
                }
            }
        }

        return response()->json(['message' => 'Step 4 saved.', 'user' => $user->fresh()->load(['student', 'tutor.availability'])]);
    }

    /**
     * PUT /profile/password
     */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    /**
     * POST /profile/avatar — upload profile photo (multipart)
     */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|max:5120',
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $path = $file->store('avatars', 'public');
        $url  = Storage::disk('public')->url($path);

        $user->update(['avatar' => $url]);

        return response()->json([
            'success' => true,
            'message' => 'Avatar uploaded successfully.',
            'url'     => $url,
        ]);
    }

    /**
     * POST /profile/complete — mark onboarding as done (+ optional field updates)
     */
    public function complete(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name'          => 'sometimes|string|max:255',
            'date_of_birth' => 'sometimes|nullable|date',
            'gender'        => 'sometimes|nullable|string|max:50',
        ]);

        $userFields = array_filter([
            'name'          => $request->name,
            'date_of_birth' => $request->date_of_birth,
            'gender'        => $request->gender,
            'profile_completed' => true,
        ], fn($v) => $v !== null || $v === false);

        $userFields['profile_completed'] = true;
        $user->update($userFields);

        if ($request->has('bio')) {
            if ($user->student) {
                $user->student->update(['bio' => $request->bio]);
            } elseif ($user->tutor) {
                $user->tutor->update(['bio' => $request->bio]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile completed.',
            'user'    => $user->fresh()->load(['student', 'tutor']),
        ]);
    }

    /**
     * DELETE /profile/delete-account
     */
    public function deleteAccount(Request $request)
    {
        $request->validate(['password' => 'required|string']);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Password is incorrect.'], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Account deleted successfully.']);
    }
}
