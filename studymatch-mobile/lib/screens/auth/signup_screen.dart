import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../utils/app_theme.dart';
import '../../services/app_state.dart';
import 'login_screen.dart';
import 'otp_verification_screen.dart';

// ── Design tokens ─────────────────────────────────────────────────────────────
const _kCard       = Color(0xFF161628);
const _kCardBorder = Color(0xFF2A2A45);
const _kField      = Color(0xFF1E1E35);
const _kFieldBorder= Color(0xFF2E2E50);
const _kHint       = Color(0xFF6B6B90);
const _kLabel      = Color(0xFFB0B0D0);
const _kBody       = Color(0xFF8888AA);
const _kWhite      = Color(0xFFEEEEFF);

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});
  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _formKey         = GlobalKey<FormState>();
  final _nameCtrl        = TextEditingController();
  final _emailCtrl       = TextEditingController();
  final _passCtrl        = TextEditingController();
  final _confirmPassCtrl = TextEditingController();
  bool _loading     = false;
  bool _agreed      = false;
  bool _obscurePass = true;
  bool _obscureConf = true;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  void _signUp() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please accept the Terms of Service'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }
    setState(() => _loading = true);
    final error = await context.read<AppState>().signUp(
      name: _nameCtrl.text.trim(),
      email: _emailCtrl.text.trim(),
      password: _passCtrl.text,
    );
    if (!mounted) return;
    setState(() => _loading = false);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: AppTheme.error),
      );
      return;
    }
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => OtpVerificationScreen(
          email: _emailCtrl.text.trim(),
          name: _nameCtrl.text.trim(),
        ),
      ),
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

          // ── Dark overlay ──────────────────────────────────────────────
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xCC0D0D1A),
                  Color(0xB30D0D1A),
                  Color(0xCC0D0D1A),
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
                    const SizedBox(height: 16),

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
                      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
                      child: Column(
                        children: [
                          // Logo
                          _LogoBadge()
                              .animate()
                              .fadeIn(duration: 500.ms)
                              .scale(begin: const Offset(0.8, 0.8), duration: 500.ms, curve: Curves.easeOut),

                          const SizedBox(height: 16),

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

                          const SizedBox(height: 22),

                          // Section heading
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Create Account',
                                    style: GoogleFonts.poppins(
                                        color: _kWhite, fontSize: 22, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text('Join thousands of students on their learning journey',
                                    style: GoogleFonts.poppins(color: _kBody, fontSize: 13)),
                              ],
                            ),
                          ).animate().fadeIn(delay: 200.ms, duration: 500.ms).slideY(begin: 0.1),

                          const SizedBox(height: 24),

                          // Full Name
                          _DarkFieldLabel('Full Name').animate().fadeIn(delay: 240.ms, duration: 400.ms),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _nameCtrl,
                            style: GoogleFonts.poppins(color: _kWhite),
                            validator: (v) =>
                                (v == null || v.trim().length < 2) ? 'Enter your full name' : null,
                            decoration: _darkInput(hint: 'Juan dela Cruz', icon: Icons.person_outline),
                          ).animate().fadeIn(delay: 260.ms, duration: 400.ms),

                          const SizedBox(height: 16),

                          // Email
                          _DarkFieldLabel('Email').animate().fadeIn(delay: 280.ms, duration: 400.ms),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _emailCtrl,
                            keyboardType: TextInputType.emailAddress,
                            style: GoogleFonts.poppins(color: _kWhite),
                            validator: (v) =>
                                (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
                            decoration: _darkInput(hint: 'your@email.com', icon: Icons.email_outlined),
                          ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

                          const SizedBox(height: 16),

                          // Password
                          _DarkFieldLabel('Password').animate().fadeIn(delay: 320.ms, duration: 400.ms),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _passCtrl,
                            obscureText: _obscurePass,
                            style: GoogleFonts.poppins(color: _kWhite),
                            validator: (v) =>
                                (v == null || v.length < 8) ? 'At least 8 characters' : null,
                            decoration: _darkInput(
                              hint: 'At least 8 characters',
                              icon: Icons.lock_outline,
                            ).copyWith(
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePass ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                  color: _kHint, size: 20,
                                ),
                                onPressed: () => setState(() => _obscurePass = !_obscurePass),
                              ),
                            ),
                          ).animate().fadeIn(delay: 340.ms, duration: 400.ms),

                          const SizedBox(height: 16),

                          // Confirm Password
                          _DarkFieldLabel('Confirm Password').animate().fadeIn(delay: 360.ms, duration: 400.ms),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _confirmPassCtrl,
                            obscureText: _obscureConf,
                            style: GoogleFonts.poppins(color: _kWhite),
                            validator: (v) =>
                                v != _passCtrl.text ? 'Passwords do not match' : null,
                            decoration: _darkInput(
                              hint: 'Re-enter password',
                              icon: Icons.lock_outline,
                            ).copyWith(
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscureConf ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                  color: _kHint, size: 20,
                                ),
                                onPressed: () => setState(() => _obscureConf = !_obscureConf),
                              ),
                            ),
                          ).animate().fadeIn(delay: 380.ms, duration: 400.ms),

                          const SizedBox(height: 20),

                          // Terms checkbox
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 20, height: 20,
                                child: Checkbox(
                                  value: _agreed,
                                  onChanged: (v) => setState(() => _agreed = v ?? false),
                                  activeColor: AppTheme.primary,
                                  checkColor: Colors.white,
                                  side: const BorderSide(color: _kFieldBorder, width: 1.5),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text.rich(
                                  TextSpan(
                                    text: 'I agree to the ',
                                    style: GoogleFonts.poppins(color: _kBody, fontSize: 13),
                                    children: [
                                      TextSpan(
                                        text: 'Terms of Service',
                                        style: GoogleFonts.poppins(
                                            color: AppTheme.primaryLight, fontWeight: FontWeight.w600),
                                      ),
                                      const TextSpan(text: ' and '),
                                      TextSpan(
                                        text: 'Privacy Policy',
                                        style: GoogleFonts.poppins(
                                            color: AppTheme.primaryLight, fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ).animate().fadeIn(delay: 400.ms, duration: 400.ms),

                          const SizedBox(height: 26),

                          // Create Account button
                          _DarkGradientButton(
                            text: 'Create Account',
                            isLoading: _loading,
                            onPressed: _signUp,
                          ).animate().fadeIn(delay: 420.ms, duration: 400.ms).slideY(begin: 0.1),

                          const SizedBox(height: 20),

                          // Sign in link
                          TextButton(
                            onPressed: () => Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(builder: (_) => const LoginScreen()),
                            ),
                            child: Text.rich(TextSpan(
                              text: 'Already have an account? ',
                              style: GoogleFonts.poppins(color: _kBody, fontSize: 13),
                              children: [
                                TextSpan(
                                  text: 'Sign In',
                                  style: GoogleFonts.poppins(
                                      color: AppTheme.primaryLight, fontWeight: FontWeight.w600),
                                ),
                              ],
                            )),
                          ).animate().fadeIn(delay: 460.ms, duration: 400.ms),
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