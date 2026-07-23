import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

// ─────────────────────────────────────────────────────────────
// Activation Screen — clone of activation.jsx
// User enters license key to activate the POS system
// ─────────────────────────────────────────────────────────────

class ActivationScreen extends StatefulWidget {
  const ActivationScreen({super.key});

  @override
  State<ActivationScreen> createState() => _ActivationScreenState();
}

class _ActivationScreenState extends State<ActivationScreen> {
  final _keyCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = false;

  @override
  void dispose() {
    _keyCtrl.dispose();
    super.dispose();
  }

  Future<void> _activate() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    final err = await auth.activateLicense(_keyCtrl.text.trim());
    if (err == null && mounted) {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: Stack(
        children: [
          // Background gradient
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1e4c82), Color(0xFF163a63), Color(0xFF0f2744)],
              ),
            ),
          ),
          // Subtle pattern overlay
          Opacity(
            opacity: 0.05,
            child: Image.network(
              'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=80&w=2070',
              fit: BoxFit.cover, width: double.infinity, height: double.infinity,
              errorBuilder: (_, __, ___) => const SizedBox(),
            ),
          ),

          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Logo
                    Container(
                      width: 80, height: 80,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [BoxShadow(color: Colors.black38, blurRadius: 20)],
                      ),
                      padding: const EdgeInsets.all(12),
                      child: Icon(Icons.point_of_sale, color: AppColors.primary, size: 48),
                    ),
                    const SizedBox(height: 20),
                    const Text('HUDI-SOFT POS',
                        style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900,
                            color: Colors.white, letterSpacing: -1)),
                    const SizedBox(height: 6),
                    Text('License Activation',
                        style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.7))),

                    const SizedBox(height: 32),

                    // Card
                    Container(
                      padding: const EdgeInsets.all(28),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 30, offset: const Offset(0, 10)),
                        ],
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('Enter License Key',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700,
                                    color: AppColors.textDark)),
                            const SizedBox(height: 6),
                            Text('Enter the license key provided to you to activate this POS system.',
                                style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                            const SizedBox(height: 20),

                            // License key field
                            TextFormField(
                              controller: _keyCtrl,
                              obscureText: _obscure,
                              style: const TextStyle(fontFamily: 'monospace', letterSpacing: 2),
                              decoration: InputDecoration(
                                labelText: 'License Key',
                                hintText: 'XXXX-XXXX-XXXX-XXXX',
                                prefixIcon: const Icon(Icons.vpn_key_outlined),
                                suffixIcon: IconButton(
                                  icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                                  onPressed: () => setState(() => _obscure = !_obscure),
                                ),
                              ),
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) return 'License key is required';
                                if (v.trim().length < 6) return 'Key too short';
                                return null;
                              },
                            ),

                            if (auth.error != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEE2E2),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFFCA5A5)),
                                ),
                                child: Text(auth.error!,
                                    style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13)),
                              ),
                            ],

                            const SizedBox(height: 20),

                            ElevatedButton(
                              onPressed: auth.isLoading ? null : _activate,
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: auth.isLoading
                                  ? const SizedBox(width: 20, height: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Text('Activate License',
                                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),
                    Text('Powered by HUDI-SOFT • hudi-soft.com',
                        style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.4))),
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
