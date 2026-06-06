'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { HudiLogo } from '@/components/hudi-logo';
import { goToDashboard } from '@/lib/capacitor-nav';
import { isNativeCapacitor } from '@/lib/capacitor-platform';

const DEMO_EMAIL = 'admin@hospital.com';
const DEMO_PASSWORD = 'admin123';

type HmsLoginFormProps = {
    onSuccess?: () => void;
};

function normalizeLoginEmail(email: string): string {
    const e = email.trim().toLowerCase();
    if (e === 'admin@hospital') return DEMO_EMAIL;
    return e;
}

export function HmsLoginForm({ onSuccess }: HmsLoginFormProps) {
    const { login } = useAuth();
    const [email, setEmail] = useState(DEMO_EMAIL);
    const [password, setPassword] = useState(DEMO_PASSWORD);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const cleanEmail = normalizeLoginEmail(email);
        if (!cleanEmail || !password) {
            toast.error('Please enter email and password');
            return;
        }
        setSubmitting(true);
        try {
            await login(cleanEmail, password);
            toast.success('Welcome back');
            if (onSuccess) {
                onSuccess();
            } else if (isNativeCapacitor()) {
                goToDashboard();
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Login failed';
            if (msg.includes('Invalid email') || msg.includes('401')) {
                toast.error('Invalid email or password. Use admin@hospital.com / admin123');
            } else if (msg.includes('timed out') || msg.includes('reach')) {
                toast.error('Cannot reach hospital server. Check internet connection.');
            } else {
                toast.error(msg);
            }
        } finally {
            setSubmitting(false);
        }
    }

    function fillDemo() {
        setEmail(DEMO_EMAIL);
        setPassword(DEMO_PASSWORD);
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/login-bg.png')" }}
            />
            <div className="absolute inset-0 z-10 bg-black/40" />

            <div className="relative z-20 w-full max-w-[420px] px-4">
                <div className="glass-card w-full rounded-[32px] p-8 flex flex-col items-center shadow-2xl relative mt-8">
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 p-3 bg-white/95 rounded-2xl shadow-xl">
                        <HudiLogo size="md" />
                    </div>

                    <h1 className="text-white text-2xl font-light tracking-tight mt-8 mb-2">User Login</h1>
                    <p className="text-white/50 text-[10px] mb-4 text-center">
                        Same database as HUDI SOFT HMS web system
                    </p>

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        <input
                            type="email"
                            placeholder="admin@hospital.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 glass-input px-4 rounded-xl outline-none focus:ring-2 focus:ring-white/30 text-sm text-white"
                            autoComplete="username"
                            inputMode="email"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 glass-input px-4 rounded-xl outline-none focus:ring-2 focus:ring-white/30 text-sm text-white tracking-widest"
                            autoComplete="current-password"
                            required
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center disabled:opacity-50"
                        >
                            {submitting ? (
                                <Loader2 className="animate-spin size-4" />
                            ) : (
                                'Log in'
                            )}
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={fillDemo}
                        className="mt-4 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center hover:bg-white/10 transition"
                    >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Tap to use demo login</p>
                        <p className="mt-1 text-xs text-teal-300 font-mono">{DEMO_EMAIL}</p>
                        <p className="text-xs text-teal-300 font-mono">{DEMO_PASSWORD}</p>
                    </button>
                </div>
            </div>
        </div>
    );
}
