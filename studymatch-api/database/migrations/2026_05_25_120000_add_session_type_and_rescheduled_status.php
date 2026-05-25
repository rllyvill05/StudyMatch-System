<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tutor_sessions', function (Blueprint $table) {
            $table->string('session_type', 20)->default('online')->after('duration_minutes');
        });

        DB::statement("ALTER TABLE tutor_sessions MODIFY COLUMN status ENUM('pending','scheduled','ongoing','completed','cancelled','rescheduled') DEFAULT 'pending'");
    }

    public function down(): void
    {
        Schema::table('tutor_sessions', function (Blueprint $table) {
            $table->dropColumn('session_type');
        });

        DB::statement("ALTER TABLE tutor_sessions MODIFY COLUMN status ENUM('pending','scheduled','ongoing','completed','cancelled') DEFAULT 'pending'");
    }
};
