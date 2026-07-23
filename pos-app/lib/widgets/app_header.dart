import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

// ─────────────────────────────────────────────────────────────
// App Header — exact clone of Header.jsx
// Solid #1e4c82 on POS page, blurred image overlay on other pages
// Shows: hamburger menu, page title, live clock, logout
// ─────────────────────────────────────────────────────────────

class AppHeader extends StatefulWidget {
  final String pageTitle;
  final VoidCallback onMenuTap;
  final Widget? centerContent;  // for POS totals in center
  final bool isPos;             // affects hero section visibility
  final VoidCallback? onLogout;

  const AppHeader({
    super.key,
    required this.pageTitle,
    required this.onMenuTap,
    this.centerContent,
    this.isPos = false,
    this.onLogout,
  });

  @override
  State<AppHeader> createState() => _AppHeaderState();
}

class _AppHeaderState extends State<AppHeader> {
  late Timer _timer;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String get _timeStr {
    final h = _now.hour > 12 ? _now.hour - 12 : _now.hour == 0 ? 12 : _now.hour;
    final m = _now.minute.toString().padLeft(2, '0');
    final s = _now.second.toString().padLeft(2, '0');
    final ampm = _now.hour >= 12 ? 'AM' : 'PM';
    return '$h:$m $ampm';
  }

  @override
  Widget build(BuildContext context) {
    final topBarH  = 55.0;
    final heroH    = widget.isPos ? 0.0 : 105.0;
    final totalH   = topBarH + heroH;

    return Container(
      height: totalH,
      width: double.infinity,
      child: Stack(
        children: [
          // ── Background ───────────────────────────────────
          if (!widget.isPos) ...[
            // Background image with brightness overlay
            Positioned.fill(
              child: Image.network(
                'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=80&w=2070&auto=format&fit=crop',
                fit: BoxFit.cover,
                color: Colors.black.withOpacity(0.6),
                colorBlendMode: BlendMode.darken,
                errorBuilder: (_, __, ___) => Container(color: AppColors.sidebarTop),
              ),
            ),
            // Gradient overlay
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0xE61e4c82),
                      Color(0xB21e4c82),
                      Color(0x991e3a63),
                    ],
                  ),
                ),
              ),
            ),
          ] else
            // POS solid color
            Positioned.fill(
              child: Container(color: AppColors.sidebarTop),
            ),

          // Bottom glow line
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: Container(
              height: 1,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [
                  Colors.transparent,
                  Color(0x8060A5FA),
                  Colors.transparent,
                ]),
              ),
            ),
          ),

          // ── Top Bar ──────────────────────────────────────
          Positioned(
            top: 0, left: 0, right: 0,
            height: topBarH,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: widget.isPos ? Colors.transparent : Colors.black.withOpacity(0.10),
                border: Border(
                  bottom: BorderSide(color: Colors.white.withOpacity(0.10)),
                ),
              ),
              child: Row(
                children: [
                  // Menu button with green dot
                  Stack(
                    children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.10),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white.withOpacity(0.10)),
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.menu, color: Colors.white, size: 20),
                          onPressed: widget.onMenuTap,
                          padding: EdgeInsets.zero,
                        ),
                      ),
                      Positioned(
                        right: 0, bottom: 0,
                        child: Container(
                          width: 10, height: 10,
                          decoration: BoxDecoration(
                            color: const Color(0xFF22C55E),
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.sidebarTop, width: 2),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  Text(widget.pageTitle.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w900,
                        color: Colors.white, letterSpacing: -0.5,
                      )),

                  // Center content (POS totals)
                  if (widget.centerContent != null) ...[
                    const Spacer(),
                    Expanded(child: Center(child: widget.centerContent!)),
                    const Spacer(),
                  ] else
                    const Spacer(),

                  // Clock
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.20),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Text(_timeStr,
                        style: const TextStyle(
                            fontSize: 10, fontWeight: FontWeight.w900,
                            color: Colors.white, letterSpacing: 0.5)),
                  ),
                  const SizedBox(width: 8),

                  // Logout
                  Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(
                      color: const Color(0xCCEF4444),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      icon: const Icon(Icons.logout, color: Colors.white, size: 14),
                      onPressed: widget.onLogout,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Hero Section (non-POS pages) ─────────────────
          if (!widget.isPos)
            Positioned(
              top: topBarH, left: 0, right: 0, bottom: 0,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(32, 0, 32, 16),
                child: Align(
                  alignment: Alignment.bottomLeft,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Container(
                          width: 32, height: 4,
                          decoration: BoxDecoration(
                            color: const Color(0xFF60A5FA),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text('CURRENT PAGE',
                            style: TextStyle(
                                fontSize: 9, fontWeight: FontWeight.w900,
                                color: Color(0xAABFDBFE), letterSpacing: 4)),
                      ]),
                      const SizedBox(height: 4),
                      Text(widget.pageTitle.toUpperCase(),
                          style: const TextStyle(
                              fontSize: 36, fontWeight: FontWeight.w900,
                              color: Colors.white, letterSpacing: -1.5)),
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
