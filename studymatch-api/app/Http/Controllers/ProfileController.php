<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Subject;
use App\Models\Tutor;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    // ── GET /profile ──────────────────────────────────────────────
    public function show(Request $request)
    {
        $user = $request->user()->load([
            'student.weakSubjects.subject',
            'tutor.strongSubjects.subject',
            'tutor.availability',
            'tutor' => fn ($q) => $q->withCount('reviews'),
        ]);

        return response()->json([
            'user' => $this->format($user),
            'data' => $this->formatMobile($user),
        ]);
    }

    // ── PUT /profile ───────────────────────────────────────────────
    public function update(Request $request)
    {
        $user = $request->user();

        // ── 1. User-level fields ──────────────────────────────────
        $userFields = [];

        $name = $request->input('fullName') ?? $request->input('name');
        if ($name !== null) $userFields['name'] = $name;

        $phone = $request->input('phoneNumber') ?? $request->input('phone');
        if ($phone !== null) $userFields['phone'] = $phone;

        $dob = $request->input('dateOfBirth') ?? $request->input('date_of_birth');
        if ($dob !== null) {
            try {
                $userFields['date_of_birth'] = \Carbon\Carbon::parse($dob)->format('Y-m-d');
            } catch (\Throwable) {}
        }

        $gender = $request->input('gender');
        if ($gender !== null) {
            $normalized = $this->normalizeGender($gender);
            if ($normalized !== null) $userFields['gender'] = $normalized;
        }

        $learningStyles = $request->input('learningStyles') ?? $request->input('learning_styles');
        if (is_array($learningStyles)) $userFields['learning_styles'] = $learningStyles;

        $studyStyles = $request->input('studyStyles') ?? $request->input('study_styles');
        if (is_array($studyStyles)) $userFields['study_styles'] = $studyStyles;

        // Bio routing: JSON blob → tutor.bio, plain text → user.bio
        $rawBio = $request->input('bio');
        $bioIsJson = false;
        if ($rawBio !== null) {
            $decoded = @json_decode($rawBio, true);
            if ($user->tutor && json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $bioIsJson = true;
                $user->tutor->update(['bio' => $rawBio]);
            } else {
                $userFields['bio'] = $rawBio;
            }
        }

        // ── 2. Role change ────────────────────────────────────────
        $newRole = $request->input('role');
        if ($newRole !== null && in_array($newRole, ['student', 'tutor']) && $newRole !== $user->role) {
            $userFields['role'] = $newRole;
        }

        if (!empty($userFields)) {
            $user->update($userFields);
            $user->refresh();
        }

        // Ensure sub-profile record exists for the current role
        if ($user->role === 'tutor' && !$user->tutor) {
            Tutor::create(['user_id' => $user->id]);
            $user->refresh();
        } elseif ($user->role === 'student' && !$user->student) {
            Student::create(['user_id' => $user->id]);
            $user->refresh();
        }

        // ── 3. Sub-profile fields ─────────────────────────────────
        $department = $request->input('department');

        if ($user->student) {
            $studentFields = [];

            $program = $request->input('program');
            if ($program !== null) {
                $studentFields['program'] = $program;
            } elseif ($department !== null) {
                $studentFields['program'] = $department;
            }

            $yearLevel = $request->input('yearLevel') ?? $request->input('year_level');
            if ($yearLevel !== null) {
                $normalized = $this->normalizeYearLevel($yearLevel);
                if ($normalized !== null) $studentFields['year_level'] = $normalized;
            }

            if (!$bioIsJson && $rawBio !== null) $studentFields['bio'] = $rawBio;

            foreach (['study_style', 'study_goals', 'preferred_days', 'preferred_time'] as $field) {
                if ($request->has($field)) $studentFields[$field] = $request->input($field);
            }

            if (!empty($studentFields)) $user->student->update($studentFields);
        }

        if ($user->tutor) {
            $tutorFields = [];

            // 'topic' is the mobile alias for position
            $position = $request->input('topic') ?? $request->input('position');
            if ($position !== null) $tutorFields['position'] = $position;

            foreach (['specialization', 'credentials', 'employee_id'] as $field) {
                $val = $request->input($field);
                if ($val !== null) $tutorFields[$field] = $val;
            }

            $tutorType = $request->input('tutor_type');
            if ($tutorType !== null && in_array($tutorType, ['professor', 'instructor', 'student_tutor'])) {
                $tutorFields['tutor_type'] = $tutorType;
            }

            $isAvailable = $request->input('is_available');
            if ($isAvailable !== null) {
                $tutorFields['is_available'] = filter_var($isAvailable, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool) $isAvailable;
            }

            if (!empty($tutorFields)) $user->tutor->update($tutorFields);
        }

        // ── 4. Subjects ───────────────────────────────────────────
        if ($user->student) {
            $names = $request->input('weaknesses') ?? $request->input('subjects');
            if (is_array($names)) $this->saveStudentSubjects($user->student, $names);
        }

        if ($user->tutor) {
            $names = $request->input('strengths') ?? $request->input('subjects');
            if (is_array($names)) $this->saveTutorSubjects($user->tutor, $names);
        }

        // ── 5. Availability ───────────────────────────────────────
        $availability = $request->input('availability');
        if ($user->tutor && is_array($availability)) {
            $this->saveTutorAvailability($user->tutor, $availability);
        }

        // ── 6. Return formatted response ──────────────────────────
        $fresh = $user->fresh()->load([
            'student.weakSubjects.subject',
            'tutor.strongSubjects.subject',
            'tutor.availability',
            'tutor' => fn ($q) => $q->withCount('reviews'),
        ]);

        return response()->json([
            'message' => 'Profile updated.',
            'user'    => $this->format($fresh),
            'data'    => $this->formatMobile($fresh),
        ]);
    }

    // ── POST /profile/avatar ───────────────────────────────────────
    public function uploadAvatar(Request $request)
    {
        $request->validate(['avatar' => 'required|image|max:5120']);

        $user = $request->user();

        if ($user->avatar && !filter_var($user->avatar, FILTER_VALIDATE_URL)
            && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => $path]);
        $url = asset('storage/' . $path);

        return response()->json([
            'message'    => 'Avatar updated.',
            'avatar_url' => $url,
            'url'        => $url,
            'success'    => true,
        ]);
    }

    // ── POST /profile/avatar-base64 ────────────────────────────────
    public function uploadAvatarBase64(Request $request)
    {
        $user = $request->user();

        // Accept both 'avatar' (data URI) and 'photo' (raw base64 from mobile)
        $raw = $request->input('avatar') ?? $request->input('photo');

        if (!$raw) {
            return response()->json(['message' => 'No image data provided.'], 422);
        }

        // Handle data URI format: data:image/jpeg;base64,...
        if (preg_match('/^data:image\/(\w+);base64,/', $raw, $type)) {
            $raw = substr($raw, strpos($raw, ',') + 1);
            $ext = strtolower($type[1]);
        } else {
            $fileName = $request->input('fileName', 'photo.jpg');
            $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION)) ?: 'jpg';
        }

        $data = base64_decode($raw, true);
        if ($data === false) {
            return response()->json(['message' => 'Invalid base64 data.'], 422);
        }

        $filename = 'avatars/profile_' . $user->id . '_' . time() . '.' . $ext;

        if ($user->avatar && !filter_var($user->avatar, FILTER_VALIDATE_URL)
            && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        Storage::disk('public')->put($filename, $data);
        $user->update(['avatar' => $filename]);
        $url = asset('storage/' . $filename);

        return response()->json([
            'message'    => 'Avatar updated.',
            'avatar_url' => $url,
            'url'        => $url,
            'success'    => true,
        ]);
    }

    // ── POST /profile/complete ─────────────────────────────────────
    public function complete(Request $request)
    {
        $user = $request->user();
        $user->update(['profile_completed' => true]);

        $fresh = $user->fresh()->load([
            'student.weakSubjects.subject',
            'tutor.strongSubjects.subject',
            'tutor.availability',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile completed.',
            'data'    => $this->formatMobile($fresh),
        ]);
    }

    // ── PUT /profile/step-1  (basic info) ─────────────────────────
    public function step1(Request $request)
    {
        $request->validate([
            'name'          => 'sometimes|string|max:255',
            'bio'           => 'sometimes|nullable|string|max:1000',
            'phone'         => 'sometimes|nullable|string|max:30',
            'date_of_birth' => 'sometimes|nullable|date',
            'gender'        => 'sometimes|nullable|string|max:50',
        ]);

        $request->user()->update($request->only(['name', 'bio', 'phone', 'date_of_birth', 'gender']));

        return response()->json(['message' => 'Step 1 saved.']);
    }

    // ── PUT /profile/step-2  (education / tutor academic info) ────
    public function step2(Request $request)
    {
        $user = $request->user();

        if ($user->student) {
            $request->validate([
                'program'    => 'sometimes|nullable|string|max:255',
                'year_level' => 'sometimes|nullable|string|max:50',
            ]);
            $user->student->update($request->only(['program', 'year_level']));
        }

        if ($user->tutor) {
            $request->validate([
                'position'       => 'sometimes|nullable|string|max:255',
                'employee_id'    => 'sometimes|nullable|string|max:100',
                'specialization' => 'sometimes|nullable|string|max:1000',
                'credentials'    => 'sometimes|nullable|string|max:500',
                'bio'            => 'sometimes|nullable|string',
            ]);
            $user->tutor->update($request->only([
                'position', 'employee_id', 'specialization', 'credentials', 'bio',
            ]));
        }

        return response()->json(['message' => 'Step 2 saved.']);
    }

    // ── PUT /profile/step-3  (subjects / preferences) ─────────────
    public function step3(Request $request)
    {
        $request->validate([
            'learning_styles' => 'sometimes|nullable|array',
            'study_styles'    => 'sometimes|nullable|array',
            'study_style'     => 'sometimes|nullable|string|max:100',
            'study_goals'     => 'sometimes|nullable|string|max:255',
            'preferred_days'  => 'sometimes|nullable|string|max:255',
            'preferred_time'  => 'sometimes|nullable|string|max:100',
            'subjects'        => 'sometimes|nullable|array',
        ]);

        $user = $request->user()->load(['student', 'tutor']);

        $userFields = $request->only(['learning_styles', 'study_styles']);
        if (!empty($userFields)) $user->update($userFields);

        if ($user->student) {
            if ($request->hasAny(['study_style', 'study_goals', 'preferred_days', 'preferred_time'])) {
                $user->student->fill($request->only(['study_style', 'study_goals', 'preferred_days', 'preferred_time']))->save();
            }

            if ($request->has('subjects') && is_array($request->subjects)) {
                $user->student->weakSubjects()->delete();
                foreach ($request->subjects as $sub) {
                    if (isset($sub['subject_id'])) {
                        $user->student->weakSubjects()->create([
                            'subject_id'       => $sub['subject_id'],
                            'difficulty_level' => $sub['difficulty_level'] ?? 'moderate',
                            'needs_help'       => true,
                        ]);
                    }
                }
            }
        }

        if ($user->tutor && $request->has('subjects') && is_array($request->subjects)) {
            $user->tutor->strongSubjects()->delete();
            foreach ($request->subjects as $item) {
                if (isset($item['subject_id'])) {
                    $user->tutor->strongSubjects()->create([
                        'subject_id'      => $item['subject_id'],
                        'expertise_level' => $item['expertise_level'] ?? 'competent',
                    ]);
                }
            }
        }

        return response()->json(['message' => 'Step 3 saved.']);
    }

    // ── PUT /profile/step-4  (finalize / availability) ────────────
    public function step4(Request $request)
    {
        $user = $request->user();

        if ($user->tutor && $request->has('availability')) {
            $request->validate([
                'availability'              => 'nullable|array',
                'availability.*.day'        => 'required|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
                'availability.*.start_time' => 'required|date_format:H:i',
                'availability.*.end_time'   => 'required|date_format:H:i',
            ]);

            $user->tutor->availability()->delete();
            foreach ((array) $request->availability as $slot) {
                $user->tutor->availability()->create([
                    'day_of_week' => $slot['day'],
                    'start_time'  => $slot['start_time'],
                    'end_time'    => $slot['end_time'],
                    'is_active'   => true,
                ]);
            }
        }

        $user->update(['profile_completed' => true]);

        return response()->json(['message' => 'Profile setup complete.']);
    }

    // ── PUT /profile/password ──────────────────────────────────────
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

    // ── DELETE /profile/delete-account ────────────────────────────
    public function deleteAccount(Request $request)
    {
        $request->validate(['password' => 'required|string']);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Incorrect password.'], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Account deleted.']);
    }

    // ── POST /profile/subjects — add a subject to tutor profile ───
    public function addSubject(Request $request)
    {
        $request->validate([
            'subject_id'      => 'required|integer|exists:subjects,id',
            'expertise_level' => 'sometimes|in:competent,proficient,expert,master',
        ]);

        $user = $request->user();
        if (!$user->tutor) {
            return response()->json(['message' => 'Not a tutor profile.'], 422);
        }

        $existing = $user->tutor->strongSubjects()
            ->where('subject_id', $request->subject_id)
            ->first();

        if ($existing) {
            if ($request->has('expertise_level')) {
                $existing->update(['expertise_level' => $request->expertise_level]);
            }
            return response()->json([
                'message' => 'Subject already added.',
                'subject' => $existing->load('subject'),
                'success' => true,
            ]);
        }

        $subject = $user->tutor->strongSubjects()->create([
            'subject_id'      => $request->subject_id,
            'expertise_level' => $request->input('expertise_level', 'proficient'),
        ]);

        return response()->json([
            'message' => 'Subject added.',
            'subject' => $subject->load('subject'),
            'success' => true,
        ], 201);
    }

    // ── DELETE /profile/subjects/{id} — remove a tutor subject ────
    public function removeSubject(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user->tutor) {
            return response()->json(['message' => 'Not a tutor profile.'], 422);
        }

        $subject = $user->tutor->strongSubjects()->where('id', $id)->first();
        if (!$subject) {
            return response()->json(['message' => 'Subject not found.'], 404);
        }

        $subject->delete();
        return response()->json(['message' => 'Subject removed.', 'success' => true]);
    }

    // ─────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────

    private function normalizeGender(?string $gender): ?string
    {
        if ($gender === null) return null;
        return match (strtolower(trim($gender))) {
            'male'                               => 'male',
            'female'                             => 'female',
            'non-binary', 'non binary',
            'nonbinary', 'other'                 => 'other',
            'prefer not to say', 'prefer_not_to_say' => 'prefer_not_to_say',
            default                              => null,
        };
    }

    private function normalizeYearLevel(mixed $value): ?string
    {
        if ($value === null) return null;
        $map = [
            '1' => '1st', '1st' => '1st',
            '2' => '2nd', '2nd' => '2nd',
            '3' => '3rd', '3rd' => '3rd',
            '4' => '4th', '4th' => '4th',
            '5' => '5th', '5th' => '5th',
        ];
        return $map[(string) $value] ?? null;
    }

    private function saveStudentSubjects(Student $student, array $names): void
    {
        $student->weakSubjects()->delete();
        foreach (array_filter($names) as $name) {
            $subject = Subject::firstOrCreate(
                ['name' => $name],
                ['code' => strtoupper(preg_replace('/\s+/', '_', trim($name)))]
            );
            $student->weakSubjects()->create([
                'subject_id'       => $subject->id,
                'difficulty_level' => 'moderate',
                'needs_help'       => true,
            ]);
        }
    }

    private function saveTutorSubjects(Tutor $tutor, array $names): void
    {
        $tutor->strongSubjects()->delete();
        foreach (array_filter($names) as $name) {
            $subject = Subject::firstOrCreate(
                ['name' => $name],
                ['code' => strtoupper(preg_replace('/\s+/', '_', trim($name)))]
            );
            $tutor->strongSubjects()->create([
                'subject_id'      => $subject->id,
                'expertise_level' => 'competent',
            ]);
        }
    }

    private function saveTutorAvailability(Tutor $tutor, array $availability): void
    {
        $blockMap = [
            'Morning (6am-12pm)'   => ['06:00', '12:00'],
            'Afternoon (12pm-6pm)' => ['12:00', '18:00'],
            'Evening (6pm-9pm)'    => ['18:00', '21:00'],
            'Night (9pm-6am)'      => ['21:00', '06:00'],
        ];

        $tutor->availability()->delete();
        foreach ($availability as $day => $blocks) {
            if (!is_array($blocks)) continue;
            foreach ($blocks as $block) {
                if (!isset($blockMap[$block])) continue;
                [$start, $end] = $blockMap[$block];
                $tutor->availability()->create([
                    'day_of_week' => strtolower($day),
                    'start_time'  => $start,
                    'end_time'    => $end,
                    'is_active'   => true,
                ]);
            }
        }
    }

    private function formatMobile(User $user): array
    {
        $weakNames   = [];
        $strongNames = [];

        if ($user->student) {
            $weakNames = $user->student->weakSubjects
                ->map(fn ($ws) => $ws->subject?->name)
                ->filter()->values()->all();
        }

        if ($user->tutor) {
            $strongNames = $user->tutor->strongSubjects
                ->map(fn ($ts) => $ts->subject?->name)
                ->filter()->values()->all();
        }

        $availability = (object) [];
        if ($user->tutor && $user->tutor->availability->isNotEmpty()) {
            $blockMap = [
                '06:00-12:00' => 'Morning (6am-12pm)',
                '12:00-18:00' => 'Afternoon (12pm-6pm)',
                '18:00-21:00' => 'Evening (6pm-9pm)',
                '21:00-06:00' => 'Night (9pm-6am)',
            ];
            $avail = [];
            foreach ($user->tutor->availability as $slot) {
                $day   = ucfirst($slot->day_of_week);
                $key   = substr($slot->start_time, 0, 5) . '-' . substr($slot->end_time, 0, 5);
                $block = $blockMap[$key] ?? null;
                if ($block) $avail[$day][] = $block;
            }
            if (!empty($avail)) $availability = $avail;
        }

        $tutorBioData = null;
        if ($user->tutor?->bio) {
            $decoded = json_decode($user->tutor->bio, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $tutorBioData = $decoded;
            }
        }

        $tutorDepartment  = $tutorBioData['department']   ?? $user->tutor?->specialization;
        $tutorPersonalBio = $tutorBioData['personal_bio'] ?? null;
        $personalBio      = $user->bio ?? $user->student?->bio ?? $tutorPersonalBio;

        $avatarUrl = null;
        if ($user->avatar) {
            $avatarUrl = filter_var($user->avatar, FILTER_VALIDATE_URL)
                ? $user->avatar
                : asset('storage/' . $user->avatar);
        }

        return [
            'id'                 => (string) $user->id,
            'fullName'           => $user->name,
            'email'              => $user->email,
            'profilePhotoUrl'    => $avatarUrl,
            'school'             => null,
            'department'         => $user->student?->program ?? $tutorDepartment,
            'topic'              => $user->tutor?->position,
            'yearLevel'          => $user->student?->year_level,
            'dateOfBirth'        => $user->date_of_birth?->format('Y-m-d'),
            'gender'             => $user->gender,
            'bio'                => $personalBio,
            'role'               => $user->role,
            'subjects'           => $user->isStudent() ? $weakNames : $strongNames,
            'learningStyles'     => $user->learning_styles ?? [],
            'studyStyles'        => $user->study_styles ?? [],
            'availability'       => $availability,
            'strengths'          => $user->isTutor() ? $strongNames : [],
            'weaknesses'         => $user->isStudent() ? $weakNames : [],
            'onboardingComplete' => (bool) $user->profile_completed,
            'rating'             => (float) ($user->tutor?->average_rating ?? 0),
            'ratingCount'        => (int) ($user->tutor?->reviews_count ?? $user->tutor?->total_sessions ?? 0),
        ];
    }

    private function format(User $user): array
    {
        $data = $user->toArray();

        unset($data['password'], $data['remember_token']);

        if (isset($data['tutor'])) {
            unset($data['tutor']['hourly_rate'], $data['tutor']['total_earnings']);
        }

        if ($user->avatar) {
            $data['avatar_url'] = filter_var($user->avatar, FILTER_VALIDATE_URL)
                ? $user->avatar
                : (Storage::disk('public')->exists($user->avatar)
                    ? asset('storage/' . $user->avatar)
                    : null);
        }

        return $data;
    }
}
