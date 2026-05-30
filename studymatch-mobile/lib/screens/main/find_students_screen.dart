import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../utils/app_theme.dart';
import '../../services/api_service.dart';
import '../../services/app_state.dart';

class FindStudentsScreen extends StatefulWidget {
  const FindStudentsScreen({super.key});

  @override
  State<FindStudentsScreen> createState() => _FindStudentsScreenState();
}

class _FindStudentsScreenState extends State<FindStudentsScreen> {
  final _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _students = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load({String? search}) async {
    setState(() { _loading = true; _error = null; });
    final list = await ApiService.getStudents(search: search);
    if (!mounted) return;
    setState(() { _students = list; _loading = false; });
  }

  void _onSearch(String q) {
    _load(search: q.trim().isEmpty ? null : q.trim());
  }

  Future<void> _sendRequest(Map<String, dynamic> student) async {
    final userId   = student['id']?.toString() ?? '';
    final name     = student['name'] as String? ?? 'Student';
    final myUserId = context.read<AppState>().currentUser?.id ?? '';

    if (userId.isEmpty || myUserId.isEmpty) return;

    setState(() { _sending = true; _error = null; _success = null; });
    final res = await ApiService.saveMatch(userId: myUserId, matchedId: userId);
    if (!mounted) return;
    if (res['success'] == true || res['message'] != null) {
      _flash('Match request sent to $name!');
    } else {
      setState(() {
        _error = res['message'] as String? ?? 'Failed to send request.';
        _sending = false;
      });
    }
  }

  void _flash(String msg) {
    setState(() { _success = msg; _sending = false; });
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _success = null);
    });
  }

  void _showProfile(Map<String, dynamic> student) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _StudentProfileSheet(
        student: student,
        onConnect: () => _sendRequest(student),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 12, 16, 0),
              child: Row(
                children: [
                  if (Navigator.canPop(context))
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new,
                          size: 18, color: AppTheme.textDark),
                      onPressed: () => Navigator.pop(context),
                    ),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Find Students',
                            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold,
                                color: AppTheme.textDark, fontFamily: 'Poppins')),
                        Text('Browse students who need tutoring help.',
                            style: TextStyle(fontSize: 12, color: AppTheme.textMuted,
                                fontFamily: 'Poppins')),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Search bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _searchCtrl,
                onChanged: _onSearch,
                style: const TextStyle(fontFamily: 'Poppins', color: AppTheme.textDark),
                decoration: InputDecoration(
                  hintText: 'Search by name or email...',
                  hintStyle: const TextStyle(color: AppTheme.textMuted, fontFamily: 'Poppins', fontSize: 13),
                  prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted, size: 20),
                  suffixIcon: _searchCtrl.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close, color: AppTheme.textMuted, size: 18),
                          onPressed: () { _searchCtrl.clear(); _load(); },
                        )
                      : null,
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.borderLight)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.borderLight)),
                  focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.primary, width: 1.5)),
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Feedback
            if (_success != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppTheme.success.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.success.withValues(alpha: 0.25)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.check_circle_outline, color: AppTheme.success, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_success!,
                        style: const TextStyle(color: AppTheme.success, fontFamily: 'Poppins', fontSize: 12))),
                  ]),
                ),
              ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppTheme.error.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.error.withValues(alpha: 0.25)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.error_outline, color: AppTheme.error, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!,
                        style: const TextStyle(color: AppTheme.error, fontFamily: 'Poppins', fontSize: 12))),
                  ]),
                ),
              ),

            const SizedBox(height: 8),

            // Count chip
            if (!_loading && _students.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('${_students.length} student${_students.length != 1 ? 's' : ''} found',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textMuted, fontFamily: 'Poppins')),
                ),
              ),

            const SizedBox(height: 8),

            // List
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _students.isEmpty
                      ? _empty()
                      : RefreshIndicator(
                          onRefresh: () => _load(search: _searchCtrl.text.trim().isNotEmpty
                              ? _searchCtrl.text.trim() : null),
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _students.length,
                            itemBuilder: (_, i) => _StudentCard(
                              student: _students[i],
                              onTap: () => _showProfile(_students[i]),
                              onConnect: _sending ? null : () => _sendRequest(_students[i]),
                            ),
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _empty() => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.people_outline_rounded, color: AppTheme.primary, size: 36),
              ),
              const SizedBox(height: 20),
              const Text('No students found',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700,
                      color: AppTheme.textDark, fontFamily: 'Poppins')),
              const SizedBox(height: 8),
              const Text('Try a different search, or check back later.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppTheme.textMuted, fontFamily: 'Poppins')),
            ],
          ),
        ),
      );
}

// ── Student card ──────────────────────────────────────────────────────────────

class _StudentCard extends StatelessWidget {
  final Map<String, dynamic> student;
  final VoidCallback onTap;
  final VoidCallback? onConnect;

  const _StudentCard({
    required this.student,
    required this.onTap,
    required this.onConnect,
  });

  @override
  Widget build(BuildContext context) {
    final name     = student['name'] as String? ?? 'Student';
    final email    = student['email'] as String? ?? '';
    final initials = name.trim().split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase();
    final studentProfile = student['student'] as Map<String, dynamic>?;
    final program  = studentProfile?['program'] as String?;
    final year     = studentProfile?['year_level'] as String?;
    final weakSubjects = (studentProfile?['weak_subjects'] as List?)
        ?.map((s) => (s['subject'] as Map?)?['name'] as String? ?? '')
        .where((s) => s.isNotEmpty)
        .take(3)
        .toList() ?? [];

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.borderLight),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: AppTheme.primary.withValues(alpha: 0.12),
              child: Text(initials,
                  style: const TextStyle(color: AppTheme.primary,
                      fontWeight: FontWeight.w700, fontSize: 15, fontFamily: 'Poppins')),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14,
                          color: AppTheme.textDark, fontFamily: 'Poppins')),
                  if (program != null || year != null)
                    Text([if (program != null) program, if (year != null) year].join(' · '),
                        style: const TextStyle(fontSize: 12, color: AppTheme.textMuted,
                            fontFamily: 'Poppins')),
                  if (email.isNotEmpty)
                    Text(email, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted,
                        fontFamily: 'Poppins')),
                  if (weakSubjects.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 4, runSpacing: 4,
                      children: weakSubjects.map((s) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(s,
                            style: const TextStyle(color: AppTheme.primary, fontSize: 10,
                                fontWeight: FontWeight.w600, fontFamily: 'Poppins')),
                      )).toList(),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: onConnect,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                disabledBackgroundColor: AppTheme.primary.withValues(alpha: 0.4),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Connect',
                  style: TextStyle(color: Colors.white, fontFamily: 'Poppins',
                      fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Student profile bottom sheet ──────────────────────────────────────────────

class _StudentProfileSheet extends StatelessWidget {
  final Map<String, dynamic> student;
  final VoidCallback onConnect;
  const _StudentProfileSheet({required this.student, required this.onConnect});

  @override
  Widget build(BuildContext context) {
    final name     = student['name'] as String? ?? 'Student';
    final email    = student['email'] as String? ?? '';
    final initials = name.trim().split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase();
    final sp       = student['student'] as Map<String, dynamic>? ?? {};
    final program  = sp['program'] as String?;
    final year     = sp['year_level'] as String?;
    final bio      = sp['bio'] as String? ?? student['bio'] as String?;
    final weakSubs = (sp['weak_subjects'] as List?) ?? [];

    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      maxChildSize: 0.92,
      minChildSize: 0.4,
      expand: false,
      builder: (_, ctrl) => SingleChildScrollView(
        controller: ctrl,
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                    color: const Color(0xFFE8E8EF), borderRadius: BorderRadius.circular(2)),
              ),
            ),

            // Profile strip
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppTheme.primary.withValues(alpha: 0.12),
                  child: Text(initials,
                      style: const TextStyle(color: AppTheme.primary,
                          fontWeight: FontWeight.w700, fontSize: 18, fontFamily: 'Poppins')),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18,
                              color: AppTheme.textDark, fontFamily: 'Poppins')),
                      if (email.isNotEmpty)
                        Text(email,
                            style: const TextStyle(fontSize: 13, color: AppTheme.textMuted,
                                fontFamily: 'Poppins')),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            if (program != null || year != null) ...[
              _row('Program', program ?? '—'),
              _row('Year Level', year ?? '—'),
            ],

            if (bio != null && bio.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text('About',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
                      color: AppTheme.textDark, fontFamily: 'Poppins')),
              const SizedBox(height: 6),
              Text(bio, style: const TextStyle(fontSize: 13, color: AppTheme.textBody,
                  fontFamily: 'Poppins', height: 1.5)),
            ],

            if (weakSubs.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text('Needs Help With',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
                      color: AppTheme.textDark, fontFamily: 'Poppins')),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6, runSpacing: 6,
                children: weakSubs.map((ws) {
                  final subName = (ws['subject'] as Map?)?['name'] as String? ?? '';
                  final diff    = ws['difficulty_level'] as String? ?? 'moderate';
                  if (subName.isEmpty) return const SizedBox.shrink();
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('$subName · $diff',
                        style: const TextStyle(color: AppTheme.primary, fontSize: 12,
                            fontWeight: FontWeight.w600, fontFamily: 'Poppins')),
                  );
                }).toList(),
              ),
            ],

            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  onConnect();
                },
                icon: const Icon(Icons.handshake_outlined, color: Colors.white, size: 18),
                label: const Text('Send Match Request',
                    style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, color: Colors.white)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          children: [
            SizedBox(width: 90,
              child: Text(label,
                  style: const TextStyle(fontSize: 13, color: AppTheme.textMuted, fontFamily: 'Poppins'))),
            Expanded(child: Text(value,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                    color: AppTheme.textDark, fontFamily: 'Poppins'))),
          ],
        ),
      );
}
