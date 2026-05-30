<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AdminAuthController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminComplaintController;
use App\Http\Controllers\Admin\AdminAnnouncementController;
use App\Http\Controllers\Admin\AdminSessionController;
use App\Http\Controllers\Admin\AdminFeedbackController;
use App\Http\Controllers\Admin\AdminMatchRequestController;
use App\Http\Controllers\Admin\AdminHelpCenterController;
use App\Http\Controllers\Admin\AdminAnalyticsController;
use App\Http\Controllers\Admin\AdminReportController;
use App\Http\Controllers\Admin\AdminAuditLogController;
use App\Http\Controllers\Admin\AdminNotificationController;
use App\Http\Controllers\Admin\AdminResourceController;
use App\Http\Controllers\Admin\AdminRoleController;
use App\Http\Controllers\Admin\AdminSystemConfigController;
use App\Http\Controllers\Admin\AdminSubjectController;

/*
|--------------------------------------------------------------------------
| Admin API Routes
|--------------------------------------------------------------------------
| All routes here are prefixed with /api/admin via RouteServiceProvider.
| Public admin routes use only auth:sanctum.
| Protected admin routes additionally use the 'admin' middleware.
*/

// Admin login (public)
Route::post('/login', [AdminAuthController::class, 'login']);

// Admin protected routes
Route::middleware(['auth:sanctum', 'admin'])->group(function () {

    // Auth
    Route::post('/logout', [AdminAuthController::class, 'logout']);
    Route::get('/me', [AdminAuthController::class, 'me']);

    // Dashboard
    Route::get('/dashboard/overview', [AdminDashboardController::class, 'overview']);
    Route::get('/stats', [AdminDashboardController::class, 'overview']); // alias

    // Analytics
    Route::get('/analytics/overview', [AdminAnalyticsController::class, 'overview']);
    Route::get('/analytics/session-trends', [AdminAnalyticsController::class, 'sessionTrends']);
    Route::get('/analytics/subject-demand', [AdminAnalyticsController::class, 'subjectDemand']);
    Route::get('/analytics/user-growth', [AdminAnalyticsController::class, 'userGrowth']);
    Route::get('/analytics/activity', [AdminAnalyticsController::class, 'activity']);
    Route::get('/analytics/request-stats', [AdminAnalyticsController::class, 'requestStats']);
    Route::get('/analytics/session-status', [AdminAnalyticsController::class, 'sessionStatusBreakdown']);
    Route::get('/analytics/top-tutors', [AdminAnalyticsController::class, 'topTutors']);

    // Users
    Route::get('/users', [AdminUserController::class, 'index']);
    Route::post('/users', [AdminUserController::class, 'store']);
    Route::get('/users/{id}', [AdminUserController::class, 'show']);
    Route::put('/users/{id}', [AdminUserController::class, 'update']);
    Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);
    Route::post('/users/{id}/suspend', [AdminUserController::class, 'suspend']);
    Route::post('/users/{id}/unsuspend', [AdminUserController::class, 'unsuspend']);
    Route::post('/users/{id}/assign-role', [AdminRoleController::class, 'assignRole']);
    Route::post('/users/{id}/revoke-role', [AdminRoleController::class, 'revokeRole']);

    // Tutors
    Route::get('/tutors/pending', [AdminUserController::class, 'pendingTutors']);
    Route::post('/tutors/{id}/approve', [AdminUserController::class, 'approveTutor']);
    Route::post('/tutors/{id}/reject', [AdminUserController::class, 'rejectTutor']);

    // Complaints
    Route::get('/complaints', [AdminComplaintController::class, 'index']);
    Route::get('/complaints/{id}', [AdminComplaintController::class, 'show']);
    Route::put('/complaints/{id}', [AdminComplaintController::class, 'update']);

    // Announcements
    Route::get('/announcements', [AdminAnnouncementController::class, 'index']);
    Route::post('/announcements', [AdminAnnouncementController::class, 'store']);
    Route::put('/announcements/{id}', [AdminAnnouncementController::class, 'update']);
    Route::delete('/announcements/{id}', [AdminAnnouncementController::class, 'destroy']);

    // Sessions
    Route::get('/sessions', [AdminSessionController::class, 'index']);
    Route::get('/sessions/{id}', [AdminSessionController::class, 'show']);
    Route::delete('/sessions/{id}', [AdminSessionController::class, 'cancel']);

    // Match Requests
    Route::get('/match-requests', [AdminMatchRequestController::class, 'index']);

    // Feedback
    Route::get('/feedback', [AdminFeedbackController::class, 'index']);
    Route::put('/feedback/{id}', [AdminFeedbackController::class, 'update']);

    // Help Center / Tickets
    Route::get('/help-center', [AdminHelpCenterController::class, 'index']);
    Route::get('/help-center/{id}', [AdminHelpCenterController::class, 'show']);
    Route::post('/help-center/{id}/respond', [AdminHelpCenterController::class, 'respond']);

    // Resources
    Route::get('/resources',        [AdminResourceController::class, 'index']);
    Route::delete('/resources/{id}',[AdminResourceController::class, 'destroy']);

    // Reports
    Route::get('/reports/generate', [AdminReportController::class, 'generate']);

    // Audit Logs
    Route::get('/audit-logs', [AdminAuditLogController::class, 'index']);

    // Notifications
    Route::get('/notifications',               [AdminNotificationController::class, 'index']);
    Route::get('/notifications/unread-count',  [AdminNotificationController::class, 'unreadCount']);
    Route::put('/notifications/mark-all-read', [AdminNotificationController::class, 'markAllRead']);
    Route::put('/notifications/{id}/read',     [AdminNotificationController::class, 'markRead']);

    // Roles
    Route::get('/roles', [AdminRoleController::class, 'index']);

    // System Configuration
    Route::get('/system-config', [AdminSystemConfigController::class, 'index']);
    Route::post('/system-config', [AdminSystemConfigController::class, 'update']);
    Route::put('/system-config/{key}', [AdminSystemConfigController::class, 'updateKey']);

    // Subjects catalog
    Route::get('/subjects',              [AdminSubjectController::class, 'index']);
    Route::post('/subjects',             [AdminSubjectController::class, 'store']);
    Route::put('/subjects/{id}',         [AdminSubjectController::class, 'update']);
    Route::delete('/subjects/{id}',      [AdminSubjectController::class, 'destroy']);

    // All tutors (for subject assignment)
    Route::get('/tutors',                [AdminSubjectController::class, 'allTutors']);

    // Tutor subject assignment
    Route::get('/tutors/{id}/subjects',                          [AdminSubjectController::class, 'tutorSubjects']);
    Route::post('/tutors/{id}/subjects',                         [AdminSubjectController::class, 'assignSubject']);
    Route::put('/tutors/{tutorId}/subjects/{subjectId}',         [AdminSubjectController::class, 'updateTutorSubject']);
    Route::delete('/tutors/{tutorId}/subjects/{subjectId}',      [AdminSubjectController::class, 'removeTutorSubject']);
});
