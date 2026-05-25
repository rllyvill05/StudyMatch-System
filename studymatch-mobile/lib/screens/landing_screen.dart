import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../utils/app_theme.dart';
import 'auth/login_screen.dart';


// ── Design tokens ─────────────────────────────────────────────────────────────
const _kCard       = Color(0xFF161628);
const _kCardBorder = Color(0xFF2A2A45);
const _kField      = Color(0xFF1E1E35);
const _kFieldBorder= Color(0xFF2E2E50);
const _kHint       = Color(0xFF6B6B90);
const _kBody       = Color(0xFF8888AA);
const _kWhite      = Color(0xFFEEEEFF);

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  // null = none selected, 'student' or 'tutor'
  String? _selected;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // ── Background image ────────────────────────────────────────
          Image.asset('assets/images/background.png', fit: BoxFit.cover),

          // ── Dark overlay ────────────────────────────────────────────
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xCC0D0D1A),
                  Color(0xAA0D0D1A),
                  Color(0xCC0D0D1A),
                ],
              ),
            ),
          ),

          // ── Content ─────────────────────────────────────────────────
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                child: Container(
                  decoration: BoxDecoration(
                    color: _kCard.withValues(alpha: 0.88),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: _kCardBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.5),
                        blurRadius: 48,
                        offset: const Offset(0, 20),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 36),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Logo
                      _LogoBadge()
                          .animate()
                          .fadeIn(duration: 500.ms)
                          .scale(
                            begin: const Offset(0.8, 0.8),
                            duration: 500.ms,
                            curve: Curves.easeOut,
                          ),

                      const SizedBox(height: 16),

                      // Brand name
                      Text.rich(
                        TextSpan(children: [
                          TextSpan(
                            text: 'Study',
                            style: GoogleFonts.poppins(
                              color: _kWhite,
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          TextSpan(
                            text: 'Match',
                            style: GoogleFonts.poppins(
                              color: AppTheme.primaryLight,
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ]),
                      ).animate().fadeIn(delay: 100.ms, duration: 500.ms),

                      const SizedBox(height: 10),

                      // Welcome pill badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: AppTheme.primary.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          'Welcome to StudyMatch!',
                          style: GoogleFonts.poppins(
                            color: AppTheme.primaryLight,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ).animate().fadeIn(delay: 150.ms, duration: 500.ms),

                      const SizedBox(height: 24),

                      // Heading
                      Text(
                        'Create your account',
                        style: GoogleFonts.poppins(
                          color: _kWhite,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ).animate().fadeIn(delay: 200.ms, duration: 500.ms),

                      const SizedBox(height: 8),

                      Text(
                        'Join our learning community and\nstart your journey.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.poppins(color: _kBody, fontSize: 13, height: 1.6),
                      ).animate().fadeIn(delay: 230.ms, duration: 500.ms),

                      const SizedBox(height: 28),

                      Text(
                        'I want to register as',
                        style: GoogleFonts.poppins(color: _kHint, fontSize: 13),
                      ).animate().fadeIn(delay: 260.ms, duration: 400.ms),

                      const SizedBox(height: 16),

                      // Role cards
                      Row(
                        children: [
                          // Student card
                          Expanded(
                            child: _RoleCard(
                              icon: Icons.school_rounded,
                              title: "I'm a Student",
                              subtitle: 'Learn and connect\nwith tutors',
                              isSelected: _selected == 'student',
                              onTap: () => setState(() => _selected = 'student'),
                            ).animate().fadeIn(delay: 300.ms, duration: 400.ms).slideX(begin: -0.1),
                          ),
                          const SizedBox(width: 12),
                          // Tutor card
                          Expanded(
                            child: _RoleCard(
                              icon: Icons.people_alt_rounded,
                              title: "I'm a Tutor",
                              subtitle: 'Teach and help\nstudents succeed',
                              isSelected: _selected == 'tutor',
                              onTap: () => setState(() => _selected = 'tutor'),
                            ).animate().fadeIn(delay: 350.ms, duration: 400.ms).slideX(begin: 0.1),
                          ),
                        ],
                      ),

                      const SizedBox(height: 28),

                      // Sign in link
                      TextButton(
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                        ),
                        child: Text.rich(
                          TextSpan(
                            text: 'Already have an account? ',
                            style: GoogleFonts.poppins(color: _kBody, fontSize: 13),
                            children: [
                              TextSpan(
                                text: 'Log in',
                                style: GoogleFonts.poppins(
                                  color: AppTheme.primaryLight,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(delay: 440.ms, duration: 400.ms),
                    ],
                  ),
                ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.04),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Role selection card ───────────────────────────────────────────────────────
class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primary.withValues(alpha: 0.15)
              : _kField,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppTheme.primary : _kFieldBorder,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.2),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppTheme.primary.withValues(alpha: 0.2)
                    : AppTheme.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                icon,
                color: isSelected ? AppTheme.primaryLight : _kHint,
                size: 26,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                color: isSelected ? _kWhite : _kWhite.withValues(alpha: 0.8),
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                color: isSelected ? _kBody : _kHint,
                fontSize: 11,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Logo badge ────────────────────────────────────────────────────────────────
class _LogoBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 68,
      height: 68,
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