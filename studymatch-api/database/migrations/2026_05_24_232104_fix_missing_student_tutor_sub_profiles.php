<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        // Create missing student sub-profiles for all student-role users
        $studentUserIds = DB::table('users')
            ->where('role', 'student')
            ->pluck('id');

        $existingStudentUserIds = DB::table('students')
            ->whereIn('user_id', $studentUserIds)
            ->pluck('user_id');

        foreach ($studentUserIds->diff($existingStudentUserIds) as $userId) {
            DB::table('students')->insert([
                'user_id'    => $userId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Create missing tutor sub-profiles for all tutor-role users
        $tutorUserIds = DB::table('users')
            ->where('role', 'tutor')
            ->pluck('id');

        $existingTutorUserIds = DB::table('tutors')
            ->whereIn('user_id', $tutorUserIds)
            ->pluck('user_id');

        foreach ($tutorUserIds->diff($existingTutorUserIds) as $userId) {
            DB::table('tutors')->insert([
                'user_id'             => $userId,
                'verification_status' => 'approved',
                'verified_at'         => $now,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);
        }
    }

    public function down(): void {}
};
