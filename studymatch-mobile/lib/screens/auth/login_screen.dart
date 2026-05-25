import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../utils/app_theme.dart';
import '../../services/app_state.dart';

// ── Design tokens ─────────────────────────────────────────────────────────────
const _kCard       = Color(0xFF161628);
const _kCardBorder = Color(0xFF2A2A45);
const _kField      = Color(0xFF1E1E35);
const _kFieldBorder= Color(0xFF2E2E50);
const _kHint       = Color(0xFF6B6B90);
const _kLabel      = Color(0xFFB0B0D0);
const _kBody       = Color(0xFF8888AA);
const _kWhite      = Color(0xFFEEEEFF);

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey    = GlobalKey<FormState>();
  final _emailCtrl  = TextEditingController();
  final _passCtrl   = TextEditingController();
  bool _loading     = false;
  bool _obscurePass = true;
  bool _rememberMe  = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  void _signIn() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final error = await context.read<AppState>().signIn(
      email: _emailCtrl.text.trim(),
      password: _passCtrl.text,
    );
    if (!mounted) return;
    setState(() => _loading = false);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: AppTheme.error),
      );
    } else {
      Navigator.of(context).pop();
    }
  }

  void _forgotPassword() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: _kCard,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => const _ForgotPasswordSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // ── Background image ──────────────────────────────────────────
          Image.asset(
            'assets/images/background.png',
            fit: BoxFit.cover,
          ),

          // ── Dark overlay to darken the bg like the website ────────────
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xCC0D0D1A), // 80% dark top
                  Color(0xB30D0D1A), // 70% dark middle
                  Color(0xCC0D0D1A), // 80% dark bottom
                ],
              ),
            ),
          ),

          // ── Main content ──────────────────────────────────────────────
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new, color: _kLabel, size: 18),
                      onPressed: () => Navigator.pop(context),
                    ).animate().fadeIn(duration: 400.ms),
                    const SizedBox(height: 24),

                    // ── Glass card ────────────────────────────────────
                    Container(
                      decoration: BoxDecoration(
                        color: _kCard.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: _kCardBorder),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.5),
                            blurRadius: 40,
                            offset: const Offset(0, 16),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 36),
                      child: Column(
                        children: [
                          // Logo
                          _LogoBadge()
                              .animate()
                              .fadeIn(duration: 500.ms)
                              .scale(begin: const Offset(0.8, 0.8), duration: 500.ms, curve: Curves.easeOut),

                          const SizedBox(height: 18),

                          // Brand name
                          Text.rich(
                            TextSpan(children: [
                              TextSpan(
                                text: 'Study',
                                style: GoogleFonts.poppins(
                                  color: _kWhite, fontSize: 26, fontWeight: FontWeight.bold),
                              ),
                              TextSpan(
                                text: 'Match',
                                style: GoogleFonts.poppins(
                                  color: AppTheme.primaryLight, fontSize: 26, fontWeight: FontWeight.bold),
                              ),
                            ]),
                          ).animate().fadeIn(delay: 100.ms, duration: 500.ms),

                          const SizedBox(height: 2),
                          Text(
                            'LEARNING PLATFORM',
                            style: GoogleFonts.poppins(color: _kHint, fontSize: 10, letterSpacing: 3),
                          ).animate().fadeIn(delay: 150.ms, duration: 500.ms),

                          const SizedBox(height: 28),

                          // Welcome heading
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Welcome back',
                                    style: GoogleFonts.poppins(
                                        color: _kWhite, fontSize: 22, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text('Sign in to your StudyMatch account',
                                    style: GoogleFonts.poppins(color: _kBody, fontSize: 13)),
                              ],
                            ),
                          ).animate().fadeIn(delay: 200.ms, duration: 500.ms).slideY(begin: 0.1),

                          const SizedBox(height: 28),

                          // Email
                          _DarkFieldLabel('Email').animate().fadeIn(delay: 250.ms, duration: 400.ms),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _emailCtrl,
                            keyboardType: TextInputType.emailAddress,
                            style: GoogleFonts.poppins(color: _kWhite),
                            validator: (v) =>
                                (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
                            decoration: _darkInput(hint: 'you@example.com', icon: Icons.email_outlined),
                          ).animate().fadeIn(delay: 280.ms, duration: 400.ms),

                          const SizedBox(height: 20),

                          // Password
                          _DarkFieldLabel('Password').animate().fadeIn(delay: 300.ms, duration: 400.ms),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _passCtrl,
                            obscureText: _obscurePass,
                            style: GoogleFonts.poppins(color: _kWhite),
                            validator: (v) =>
                                (v == null || v.length < 6) ? 'At least 6 characters' : null,
                            decoration: _darkInput(hint: '••••••••', icon: Icons.lock_outline).copyWith(
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePass ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                  color: _kHint, size: 20,
                                ),
                                onPressed: () => setState(() => _obscurePass = !_obscurePass),
                              ),
                            ),
                          ).animate().fadeIn(delay: 330.ms, duration: 400.ms),

                          const SizedBox(height: 14),

                          // Remember me + Forgot password
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  SizedBox(
                                    width: 20, height: 20,
                                    child: Checkbox(
                                      value: _rememberMe,
                                      onChanged: (v) => setState(() => _rememberMe = v ?? false),
                                      activeColor: AppTheme.primary,
                                      checkColor: Colors.white,
                                      side: const BorderSide(color: _kFieldBorder, width: 1.5),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text('Remember me',
                                      style: GoogleFonts.poppins(color: _kBody, fontSize: 13)),
                                ],
                              ),
                              TextButton(
                                onPressed: _forgotPassword,
                                style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                                child: Text('Forgot password?',
                                    style: GoogleFonts.poppins(
                                        color: AppTheme.primaryLight,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500)),
                              ),
                            ],
                          ).animate().fadeIn(delay: 360.ms, duration: 400.ms),

                          const SizedBox(height: 26),

                          // Sign In button
                          _DarkGradientButton(
                            text: 'Sign In',
                            isLoading: _loading,
                            onPressed: _signIn,
                          ).animate().fadeIn(delay: 400.ms, duration: 400.ms).slideY(begin: 0.1),

                          const SizedBox(height: 22),

                          // Sign up link
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: Text.rich(TextSpan(
                              text: "Don't have an account? ",
                              style: GoogleFonts.poppins(color: _kBody, fontSize: 13),
                              children: [
                                TextSpan(
                                  text: 'Create Account',
                                  style: GoogleFonts.poppins(
                                      color: AppTheme.primaryLight, fontWeight: FontWeight.w600),
                                ),
                              ],
                            )),
                          ).animate().fadeIn(delay: 440.ms, duration: 400.ms),
                        ],
                      ),
                    ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.05),

                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Forgot Password Bottom Sheet ──────────────────────────────────────────────
class _ForgotPasswordSheet extends StatefulWidget {
  const _ForgotPasswordSheet();
  @override
  State<_ForgotPasswordSheet> createState() => _ForgotPasswordSheetState();
}

class _ForgotPasswordSheetState extends State<_ForgotPasswordSheet> {
  final _emailCtrl = TextEditingController();
  bool _sending = false;
  bool _sent    = false;
  String? _error;

  @override
  void dispose() { _emailCtrl.dispose(); super.dispose(); }

  Future<void> _send() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Please enter a valid email address.');
      return;
    }
    setState(() { _sending = true; _error = null; });
    try {
      final result = await context.read<AppState>().forgotPassword(email);
      if (mounted) {
        setState(() {
          _sending = false;
          if (result['success'] == true) {
            _sent = true;
          } else {
            _error = result['message'] as String? ?? 'Something went wrong.';
          }
        });
      }
    } catch (e) {
      if (mounted) setState(() { _sending = false; _error = 'Network error: $e'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24, right: 24, top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 32,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(color: _kFieldBorder, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 20),
          Center(
            child: Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
              ),
              child: const Icon(Icons.lock_reset_rounded, color: AppTheme.primary, size: 30),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text('Forgot Password?',
                style: GoogleFonts.poppins(
                    color: _kWhite, fontSize: 20, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text("Enter your email and we'll send you a reset link.",
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(color: _kBody, fontSize: 13)),
          ),
          const SizedBox(height: 24),
          if (_sent) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.success.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
              ),
              child: Row(children: [
                const Icon(Icons.check_circle_outline, color: AppTheme.success, size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('Reset link sent! Check your inbox.',
                      style: GoogleFonts.poppins(color: AppTheme.success, fontSize: 13)),
                ),
              ]),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text('Done',
                    style: GoogleFonts.poppins(fontWeight: FontWeight.w600, color: Colors.white)),
              ),
            ),
          ] else ...[
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.error.withValues(alpha: 0.3)),
                ),
                child: Row(children: [
                  const Icon(Icons.error_outline, color: AppTheme.error, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(_error!,
                        style: GoogleFonts.poppins(color: AppTheme.error, fontSize: 12)),
                  ),
                ]),
              ),
              const SizedBox(height: 16),
            ],
            Text('Email Address',
                style: GoogleFonts.poppins(
                    color: _kLabel, fontSize: 13, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            TextField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              style: GoogleFonts.poppins(color: _kWhite),
              decoration: _darkInput(hint: 'your@email.com', icon: Icons.email_outlined),
            ),
            const SizedBox(height: 20),
            _DarkGradientButton(
              text: 'Send Reset Link',
              isLoading: _sending,
              onPressed: _send,
              icon: Icons.send_rounded,
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('Cancel', style: GoogleFonts.poppins(color: _kHint)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

InputDecoration _darkInput({required String hint, IconData? icon}) {
  return InputDecoration(
    hintText: hint,
    hintStyle: GoogleFonts.poppins(color: _kHint, fontSize: 14),
    prefixIcon: icon != null ? Icon(icon, color: _kHint, size: 20) : null,
    filled: true,
    fillColor: _kField,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _kFieldBorder)),
    enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _kFieldBorder)),
    focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.primary, width: 1.5)),
    errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.error)),
    focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.error, width: 1.5)),
  );
}

class _DarkFieldLabel extends StatelessWidget {
  final String text;
  const _DarkFieldLabel(this.text);
  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.centerLeft,
        child: Text(text,
            style: GoogleFonts.poppins(
                color: _kLabel, fontSize: 13, fontWeight: FontWeight.w500)),
      );
}

class _DarkGradientButton extends StatelessWidget {
  final String text;
  final bool isLoading;
  final VoidCallback onPressed;
  final IconData? icon;
  const _DarkGradientButton({
    required this.text,
    required this.isLoading,
    required this.onPressed,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [AppTheme.primary, AppTheme.accent]),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primary.withValues(alpha: 0.4),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: isLoading
              ? const SizedBox(
                  width: 20, height: 20,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                    ],
                    Text(text,
                        style: GoogleFonts.poppins(
                            color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15)),
                  ],
                ),
        ),
      ),
    );
  }
}

class _LogoBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 68, height: 68,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.primary, AppTheme.accent],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.5),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: const Icon(Icons.school_rounded, color: Colors.white, size: 36),
    );
  }
}