'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { HudiLogo } from '@/components/hudi-logo';
import { goToDashboard } from '@/lib/capacitor-nav';
import { isNativeCapacitor } from '@/lib/capacitor-platform';
import { getHmsApiBase } from '@/lib/hms-http';

type HmsLoginFormProps = {
    onSuccess?: () => void;
};

function normalizeLoginEmail(email: string): string {
    const e = email.trim().toLowerCase();
    if (e === 'admin@hospital') return 'admin@hospital.com';
    return e;
}

export function HmsLoginForm({ onSuccess }: HmsLoginFormProps) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const apiBase = getHmsApiBase();

    useEffect(() => {
        const dbInfo = `HMS API: ${apiBase} (PostgreSQL — same as HUDI SOFT HMS web)`;
        console.log('[Capacitor Login]', dbInfo);
    }, [apiBase]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const cleanEmail = normalizeLoginEmail(email);
        const cleanPassword = password.trim();
        if (!cleanEmail || !cleanPassword) {
            toast.error('Please enter email and password');
            return;
        }
        setSubmitting(true);
        console.log('[Capacitor Login] attempt', { email: cleanEmail, api: apiBase });
        try {
            await login(cleanEmail, cleanPassword);
            toast.success('Welcome back');
            if (onSuccess) {
                onSuccess();
            } else if (isNativeCapacitor()) {
                goToDashboard();
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Login failed';
            console.error('[Capacitor Login] failed', { api: apiBase, error: msg });
            if (msg.includes('Invalid email') || msg.includes('401')) {
                toast.error('Invalid email or password');
            } else if (msg.includes('timed out') || msg.includes('reach')) {
                toast.error('Cannot reach hospital server. Check internet connection.');
            } else {
                toast.error(msg);
            }
        } finally {
            setSubmitting(false);
        }
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
                    <p className="text-white/50 text-[10px] mb-1 text-center">
                        Database: HUDI SOFT HMS (PostgreSQL)
                    </p>
                    <p className="text-white/40 text-[9px] mb-4 text-center break-all px-2">
                        {apiBase}
                    </p>

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 glass-input px-4 rounded-xl outline-none focus:ring-2 focus:ring-white/30 text-sm text-white placeholder:text-white/40"
                            autoComplete="username"
                            inputMode="email"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 glass-input px-4 rounded-xl outline-none focus:ring-2 focus:ring-white/30 text-sm text-white tracking-widest placeholder:text-white/40 placeholder:tracking-normal"
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
                </div>
            </div>
        </div>
    );
}
