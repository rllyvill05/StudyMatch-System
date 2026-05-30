import 'package:flutter/material.dart';
import '../../utils/app_theme.dart';
import '../../services/api_service.dart';

class MySubjectsScreen extends StatefulWidget {
  const MySubjectsScreen({super.key});

  @override
  State<MySubjectsScreen> createState() => _MySubjectsScreenState();
}

class _MySubjectsScreenState extends State<MySubjectsScreen> {
  List<Map<String, dynamic>> _weakSubjects = [];
  List<Map<String, dynamic>> _allSubjects  = [];
  bool _loading = true;
  bool _adding  = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    final results = await Future.wait([
      ApiService.getWeakSubjects(),
      ApiService.getSubjects(),
    ]);
    if (!mounted) return;
    setState(() {
      _weakSubjects = results[0];
      _allSubjects  = results[1];
      _loading      = false;
    });
  }

  Set<int> get _assignedIds =>
      _weakSubjects.map((s) => (s['subject_id'] ?? s['id']) as int).toSet();

  Future<void> _add(Map<String, dynamic> subject, String difficulty) async {
    setState(() { _adding = true; _error = null; });
    final res = await ApiService.addWeakSubject(
      subjectId: subject['id'] as int,
      difficultyLevel: difficulty,
    );
    if (!mounted) return;
    if (res['success'] == true || res['message']?.toString().contains('success') == true) {
      _flash('${subject['name']} added to your subjects.');
      await _load();
    } else {
      setState(() {
        _error = res['message'] as String? ?? 'Failed to add subject.';
        _adding = false;
      });
    }
  }

  Future<void> _remove(Map<String, dynamic> ws) async {
    final id = ws['id'] as int?;
    if (id == null) return;
    final name = (ws['subject'] as Map?)?['name'] ?? 'Subject';
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Remove Subject',
            style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold,
                color: AppTheme.textDark)),
        content: Text('Remove "$name" from your subjects?',
            style: const TextStyle(fontFamily: 'Poppins', color: AppTheme.textBody)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.textMuted))),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Remove', style: TextStyle(color: Colors.white, fontFamily: 'Poppins')),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    final res = await ApiService.removeWeakSubject(id);
    if (!mounted) return;
    if (res['success'] == true || res['message'] != null) {
      _flash('$name removed.');
      await _load();
    } else {
      setState(() => _error = 'Failed to remove subject.');
    }
  }

  void _flash(String msg) {
    setState(() { _success = msg; _adding = false; });
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _success = null);
    });
  }

  void _openAddSheet() {
    final unassigned = _allSubjects.where((s) => !_assignedIds.contains(s['id'] as int)).toList();
    if (unassigned.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('All subjects are already added.',
            style: TextStyle(fontFamily: 'Poppins')),
          backgroundColor: AppTheme.primary, behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
        ),
      );
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _AddSubjectSheet(
        subjects: unassigned,
        onAdd: _add,
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
                    child: Text('My Subjects',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold,
                            color: AppTheme.textDark, fontFamily: 'Poppins')),
                  ),
                  if (_adding)
                    const SizedBox(
                      width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  else
                    FilledButton.icon(
                      onPressed: _openAddSheet,
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Add', style: TextStyle(fontFamily: 'Poppins', fontSize: 13)),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Feedback banners
            if (_success != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
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
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
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

            // Info chip
            if (!_loading)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.12)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline, color: AppTheme.primary, size: 15),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'These subjects are shown to tutors to help them find students who need help.',
                          style: TextStyle(fontSize: 12, color: AppTheme.primary,
                              fontFamily: 'Poppins', height: 1.4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 8),

            // Content
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: _weakSubjects.isEmpty
                          ? ListView(
                              children: [
                                const SizedBox(height: 60),
                                _EmptyState(onAdd: _openAddSheet),
                              ],
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: _weakSubjects.length,
                              itemBuilder: (_, i) => _SubjectCard(
                                data: _weakSubjects[i],
                                onRemove: () => _remove(_weakSubjects[i]),
                              ),
                            ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Subject card ──────────────────────────────────────────────────────────────

class _SubjectCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final VoidCallback onRemove;
  const _SubjectCard({required this.data, required this.onRemove});

  static const _diffColors = {
    'moderate':      Color(0xFF3B82F6),
    'difficult':     Color(0xFFF59E0B),
    'very_difficult': Color(0xFFEF4444),
  };

  @override
  Widget build(BuildContext context) {
    final subject  = data['subject'] as Map<String, dynamic>? ?? {};
    final name     = subject['name'] as String? ?? data['name'] as String? ?? '—';
    final code     = subject['code'] as String? ?? '';
    final diff     = data['difficulty_level'] as String? ?? 'moderate';
    final color    = _diffColors[diff] ?? const Color(0xFF3B82F6);
    final label    = diff.replaceAll('_', ' ');

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.bookmark_rounded, color: AppTheme.primary, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14,
                        color: AppTheme.textDark, fontFamily: 'Poppins')),
                if (code.isNotEmpty)
                  Text(code,
                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted,
                          fontFamily: 'Poppins')),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(label[0].toUpperCase() + label.substring(1),
                      style: TextStyle(color: color, fontSize: 11,
                          fontWeight: FontWeight.w600, fontFamily: 'Poppins')),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.error, size: 20),
            onPressed: onRemove,
            tooltip: 'Remove',
          ),
        ],
      ),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyState({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Center(
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
              child: const Icon(Icons.bookmark_outline_rounded, color: AppTheme.primary, size: 36),
            ),
            const SizedBox(height: 20),
            const Text('No subjects added yet',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700,
                    color: AppTheme.textDark, fontFamily: 'Poppins')),
            const SizedBox(height: 8),
            const Text(
              'Add subjects you need help with so tutors can find and match with you.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppTheme.textMuted,
                  fontFamily: 'Poppins', height: 1.5),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add, size: 18, color: Colors.white),
              label: const Text('Add Subject',
                  style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Add subject bottom sheet ──────────────────────────────────────────────────

class _AddSubjectSheet extends StatefulWidget {
  final List<Map<String, dynamic>> subjects;
  final Future<void> Function(Map<String, dynamic>, String) onAdd;
  const _AddSubjectSheet({required this.subjects, required this.onAdd});

  @override
  State<_AddSubjectSheet> createState() => _AddSubjectSheetState();
}

class _AddSubjectSheetState extends State<_AddSubjectSheet> {
  Map<String, dynamic>? _selected;
  String _difficulty = 'moderate';
  bool _saving = false;

  static const _difficulties = ['moderate', 'difficult', 'very_difficult'];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24, right: 24, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 32,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFE8E8EF), borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const Text('Add Subject',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold,
                  color: AppTheme.textDark, fontFamily: 'Poppins')),
          const SizedBox(height: 4),
          const Text('Pick a subject you need help with.',
              style: TextStyle(fontSize: 13, color: AppTheme.textMuted, fontFamily: 'Poppins')),
          const SizedBox(height: 20),

          const Text('Subject',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500,
                  color: Color(0xFF374151), fontFamily: 'Poppins')),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F8),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE8E8EF)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<Map<String, dynamic>>(
                value: _selected,
                isExpanded: true,
                hint: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Text('Select a subject...', style: TextStyle(
                      color: AppTheme.textMuted, fontFamily: 'Poppins', fontSize: 13)),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                borderRadius: BorderRadius.circular(12),
                items: widget.subjects.map((s) => DropdownMenuItem(
                  value: s,
                  child: Text('${s['name']} (${s['code']})',
                      style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppTheme.textDark)),
                )).toList(),
                onChanged: (v) => setState(() => _selected = v),
              ),
            ),
          ),

          const SizedBox(height: 16),
          const Text('Difficulty Level',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500,
                  color: Color(0xFF374151), fontFamily: 'Poppins')),
          const SizedBox(height: 8),
          Row(
            children: _difficulties.map((d) {
              final sel   = _difficulty == d;
              final label = d.replaceAll('_', ' ');
              return Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _difficulty = d),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: sel ? AppTheme.primary : const Color(0xFFF8F8FA),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: sel ? AppTheme.primary : AppTheme.borderLight),
                    ),
                    child: Text(label[0].toUpperCase() + label.substring(1),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: sel ? Colors.white : AppTheme.textMuted,
                            fontFamily: 'Poppins', fontSize: 11,
                            fontWeight: sel ? FontWeight.w600 : FontWeight.normal)),
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: (_selected == null || _saving)
                  ? null
                  : () async {
                      setState(() => _saving = true);
                      final nav = Navigator.of(context);
                      await widget.onAdd(_selected!, _difficulty);
                      if (mounted) nav.pop();
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                disabledBackgroundColor: AppTheme.primary.withValues(alpha: 0.4),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Add Subject',
                      style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }
}
