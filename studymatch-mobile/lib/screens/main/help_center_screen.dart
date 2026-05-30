import 'package:flutter/material.dart';
import '../../utils/app_theme.dart';
import '../../services/api_service.dart';

class HelpCenterScreen extends StatefulWidget {
  const HelpCenterScreen({super.key});

  @override
  State<HelpCenterScreen> createState() => _HelpCenterScreenState();
}

class _HelpCenterScreenState extends State<HelpCenterScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  List<Map<String, dynamic>> _tickets = [];
  bool _loading = true;

  static const _faqs = [
    ('How does matching work?',
     'StudyMatch pairs students with tutors whose strong subjects overlap with your weak subjects — and vice versa.'),
    ('How do I book a study session?',
     'Once matched, go to Study Sessions and tap the + button. Choose a tutor, pick a date and time, and confirm.'),
    ('Can I reschedule a session?',
     'Yes. Open the session from the Sessions screen and tap "Reschedule". You can pick a new date and time.'),
    ('Why am I not seeing any tutors?',
     'Make sure your profile is complete with your subjects and year level. Matches are based on academic compatibility.'),
    ('How do I report a problem?',
     'Use the Complaints screen from the drawer menu or submit a support ticket here in Help Center.'),
    ('How do I update my subjects?',
     'Go to My Subjects from the drawer. You can add or remove subjects and set difficulty levels.'),
    ('Can I delete my account?',
     'Yes. Go to Settings → Account → Delete Account. Note this is permanent and cannot be undone.'),
  ];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _loadTickets();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _loadTickets() async {
    setState(() => _loading = true);
    final list = await ApiService.getMyTickets();
    if (mounted) setState(() { _tickets = list; _loading = false; });
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
                    child: Text('Help Center',
                        style: TextStyle(
                            fontSize: 22, fontWeight: FontWeight.bold,
                            color: AppTheme.textDark, fontFamily: 'Poppins')),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Tabs
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F0F6),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: _tabs,
                indicator: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4)],
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                labelColor: AppTheme.primary,
                unselectedLabelColor: AppTheme.textMuted,
                labelStyle: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 12),
                unselectedLabelStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 12),
                tabs: const [Tab(text: 'FAQ'), Tab(text: 'My Tickets'), Tab(text: 'New Ticket')],
              ),
            ),
            const SizedBox(height: 12),

            Expanded(
              child: TabBarView(
                controller: _tabs,
                children: [
                  // FAQ
                  ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      ..._faqs.map((faq) => _FaqItem(q: faq.$1, a: faq.$2)),
                      const SizedBox(height: 12),
                      _ContactCard(),
                      const SizedBox(height: 24),
                    ],
                  ),

                  // My Tickets
                  _loading
                      ? const Center(child: CircularProgressIndicator())
                      : _tickets.isEmpty
                          ? _empty()
                          : RefreshIndicator(
                              onRefresh: _loadTickets,
                              child: ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                itemCount: _tickets.length,
                                itemBuilder: (_, i) => _TicketCard(data: _tickets[i]),
                              ),
                            ),

                  // New Ticket
                  SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: _NewTicketForm(onSubmitted: () {
                      _loadTickets();
                      _tabs.animateTo(1);
                    }),
                  ),
                ],
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
                width: 72, height: 72,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.support_agent_outlined, color: AppTheme.primary, size: 32),
              ),
              const SizedBox(height: 16),
              const Text('No support tickets yet.',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700,
                      color: AppTheme.textDark, fontFamily: 'Poppins')),
              const SizedBox(height: 6),
              const Text('Submit a ticket and our team will respond shortly.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppTheme.textMuted, fontFamily: 'Poppins')),
            ],
          ),
        ),
      );
}

// ── Ticket card ───────────────────────────────────────────────────────────────

class _TicketCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _TicketCard({required this.data});

  static const _statusColors = {
    'open':        Color(0xFF3B82F6),
    'in_progress': Color(0xFFF59E0B),
    'resolved':    Color(0xFF10B981),
    'closed':      Color(0xFF9CA3AF),
  };

  @override
  Widget build(BuildContext context) {
    final status = data['status'] as String? ?? 'open';
    final color  = _statusColors[status] ?? const Color(0xFF9CA3AF);
    final date   = data['created_at'] as String? ?? '';
    final adminResp = data['admin_response'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Expanded(
                  child: Text(data['subject'] as String? ?? '—',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 14,
                          color: AppTheme.textDark, fontFamily: 'Poppins')),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(status.replaceAll('_', ' ').toUpperCase(),
                      style: TextStyle(color: color, fontSize: 10,
                          fontWeight: FontWeight.w700, fontFamily: 'Poppins')),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(data['message'] as String? ?? '',
                maxLines: 2, overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 13, color: AppTheme.textBody,
                    fontFamily: 'Poppins', height: 1.4)),
          ),
          if (adminResp != null && adminResp.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.15)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.support_agent_outlined, color: AppTheme.primary, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(adminResp,
                        style: const TextStyle(
                            fontSize: 12, color: AppTheme.textBody,
                            fontFamily: 'Poppins', height: 1.4)),
                  ),
                ],
              ),
            ),
          ],
          if (date.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
              child: Text(_fmtDate(date),
                  style: const TextStyle(
                      fontSize: 11, color: AppTheme.textMuted, fontFamily: 'Poppins')),
            )
          else
            const SizedBox(height: 14),
        ],
      ),
    );
  }

  String _fmtDate(String iso) {
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return iso;
    }
  }
}

// ── New ticket form ───────────────────────────────────────────────────────────

class _NewTicketForm extends StatefulWidget {
  final VoidCallback onSubmitted;
  const _NewTicketForm({required this.onSubmitted});

  @override
  State<_NewTicketForm> createState() => _NewTicketFormState();
}

class _NewTicketFormState extends State<_NewTicketForm> {
  final _subjectCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();
  String _category = 'Technical';
  String _priority = 'medium';
  bool _submitting = false;
  bool _done = false;
  String? _error;

  static const _categories = ['Technical', 'Tutors', 'Billing', 'Account', 'Other'];

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final subject = _subjectCtrl.text.trim();
    final message = _messageCtrl.text.trim();
    if (subject.isEmpty || message.isEmpty) {
      setState(() => _error = 'Subject and message are required.');
      return;
    }
    setState(() { _submitting = true; _error = null; });
    final res = await ApiService.submitHelpTicket(
      subject: subject, message: message,
      category: _category, priority: _priority,
    );
    if (!mounted) return;
    if (res['success'] == true) {
      setState(() { _done = true; _submitting = false; });
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) { setState(() => _done = false); _reset(); widget.onSubmitted(); }
    } else {
      setState(() {
        _error = res['message'] as String? ?? 'Failed to submit ticket.';
        _submitting = false;
      });
    }
  }

  void _reset() {
    _subjectCtrl.clear();
    _messageCtrl.clear();
    setState(() { _category = 'Technical'; _priority = 'medium'; _error = null; });
  }

  @override
  Widget build(BuildContext context) {
    if (_done) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 40),
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: AppTheme.success.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.success.withValues(alpha: 0.2)),
        ),
        child: const Column(
          children: [
            Icon(Icons.check_circle_outline, color: AppTheme.success, size: 48),
            SizedBox(height: 12),
            Text('Ticket Submitted!',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold,
                    color: AppTheme.success, fontFamily: 'Poppins')),
            SizedBox(height: 6),
            Text('We\'ll get back to you as soon as possible.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppTheme.success, fontFamily: 'Poppins')),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 4),
        if (_error != null) ...[
          _errBanner(_error!),
          const SizedBox(height: 12),
        ],
        _label('Subject *'),
        const SizedBox(height: 6),
        _field(_subjectCtrl, 'Brief title of your issue', maxLines: 1),
        const SizedBox(height: 14),
        _label('Category'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8, runSpacing: 8,
          children: _categories.map((cat) {
            final sel = _category == cat;
            return GestureDetector(
              onTap: () => setState(() => _category = cat),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: sel ? AppTheme.primary : const Color(0xFFF8F8FA),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: sel ? AppTheme.primary : AppTheme.borderLight),
                ),
                child: Text(cat,
                    style: TextStyle(
                        color: sel ? Colors.white : AppTheme.textMuted,
                        fontFamily: 'Poppins', fontSize: 12,
                        fontWeight: sel ? FontWeight.w600 : FontWeight.normal)),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 14),
        _label('Priority'),
        const SizedBox(height: 8),
        Row(
          children: ['low', 'medium', 'high', 'urgent'].map((p) {
            final sel = _priority == p;
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _priority = p),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: sel ? AppTheme.primary : const Color(0xFFF8F8FA),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: sel ? AppTheme.primary : AppTheme.borderLight),
                  ),
                  child: Text(p[0].toUpperCase() + p.substring(1),
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
        const SizedBox(height: 14),
        _label('Message *'),
        const SizedBox(height: 6),
        _field(_messageCtrl, 'Describe your issue in detail...', maxLines: 5),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _submitting ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              disabledBackgroundColor: AppTheme.primary.withValues(alpha: 0.5),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _submitting
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Submit Ticket',
                    style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, color: Colors.white)),
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _label(String t) => Text(t,
      style: const TextStyle(
          color: Color(0xFF374151), fontSize: 13, fontWeight: FontWeight.w500, fontFamily: 'Poppins'));

  Widget _field(TextEditingController ctrl, String hint, {int maxLines = 1}) => TextField(
        controller: ctrl,
        maxLines: maxLines,
        style: const TextStyle(color: AppTheme.textDark, fontFamily: 'Poppins'),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: AppTheme.textMuted, fontFamily: 'Poppins', fontSize: 13),
          filled: true, fillColor: const Color(0xFFF5F5F8),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE8E8EF))),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE8E8EF))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppTheme.primary, width: 1.5)),
        ),
      );

  Widget _errBanner(String msg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.error.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.error.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: AppTheme.error, size: 16),
            const SizedBox(width: 8),
            Expanded(child: Text(msg,
                style: const TextStyle(color: AppTheme.error, fontFamily: 'Poppins', fontSize: 12))),
          ],
        ),
      );
}

// ── FAQ item ──────────────────────────────────────────────────────────────────

class _FaqItem extends StatefulWidget {
  final String q, a;
  const _FaqItem({required this.q, required this.a});

  @override
  State<_FaqItem> createState() => _FaqItemState();
}

class _FaqItemState extends State<_FaqItem> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => setState(() => _open = !_open),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _open ? AppTheme.primary.withValues(alpha: 0.04) : const Color(0xFFF8F8FA),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _open ? AppTheme.primary : const Color(0xFFE8E8EF)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(widget.q,
                      style: TextStyle(
                          color: _open ? AppTheme.primary : AppTheme.textDark,
                          fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 13)),
                ),
                Icon(
                  _open ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                  color: _open ? AppTheme.primary : AppTheme.textMuted, size: 20,
                ),
              ],
            ),
            if (_open) ...[
              const SizedBox(height: 10),
              Text(widget.a,
                  style: const TextStyle(
                      color: AppTheme.textBody, fontFamily: 'Poppins', fontSize: 13, height: 1.5)),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Contact card ──────────────────────────────────────────────────────────────

class _ContactCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F8FA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE8E8EF)),
      ),
      child: const Row(
        children: [
          Icon(Icons.email_outlined, color: AppTheme.primary, size: 20),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Still need help?',
                    style: TextStyle(color: AppTheme.textDark,
                        fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 14)),
                Text('Contact us at support@studymatch.app',
                    style: TextStyle(color: AppTheme.primary,
                        fontFamily: 'Poppins', fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
