<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('study_style', 100)->nullable()->after('bio');
            $table->string('preferred_days', 255)->nullable()->after('study_style');
            $table->string('preferred_time', 100)->nullable()->after('preferred_days');
            $table->text('study_goals')->nullable()->after('preferred_time');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['study_style', 'preferred_days', 'preferred_time', 'study_goals']);
        });
    }
};
