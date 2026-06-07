/**
 * License validation for web + Capacitor APK.
 * Expiry dates always come from hudisoft.online server when online.
 * Same license key = same expiry date on APK, web, and desktop.
 */

import { isNativeCapacitor } from './capacitor-platform';

const LICENSE_VALIDATE_URL = 'https://hudi-soft-com.onrender.com/api/licenses/validate';
const TIMEOUT_MS = 12000;

export type LicenseValidateResult = {
    valid: true;
    message: string;
    expiryDate: string;
    isTrial: boolean;
    daysRemaining: number;
    companyName?: string;
};

/** Offline-only fallback for demo keys when server is unreachable. */
const OFFLINE_DEMO_KEYS: Record<string, LicenseValidateResult> = {
    'HUDI-DEMO-2025-SUCCESS': {
        valid: true,
        expiryDate: '2026-12-31T23:59:59.000Z',
        isTrial: true,
        daysRemaining: 30,
        message: 'Demo license activated successfully!',
    },
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
        promise
            .then((v) => {
                clearTimeout(timer);
                resolve(v);
            })
            .catch((e) => {
                clearTimeout(timer);
                reject(e);
            });
    });
}

function parsePayload(data: Record<string, unknown>): LicenseValidateResult {
    const result = data as {
        valid?: boolean;
        success?: boolean;
        message?: string;
        expiryDate?: string;
        isTrial?: boolean;
        daysRemaining?: number;
        companyName?: string;
    };

    if (result.valid !== true && result.success !== true) {
        throw new Error(result.message || 'Invalid license key');
    }

    if (!result.expiryDate) {
        throw new Error('License server did not return an expiry date.');
    }

    const expiryDate = new Date(result.expiryDate);
    const now = new Date();
    const daysRemaining =
        result.daysRemaining ??
        Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
        valid: true,
        message: result.message || 'License is valid',
        expiryDate: expiryDate.toISOString(),
        isTrial: result.isTrial ?? false,
        daysRemaining,
        companyName: result.companyName,
    };
}

export function isWellFormedLicenseKey(key: string): boolean {
    const uuid =
        /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
    const hudi = /^HUDI-[A-Z0-9]+(-[A-Z0-9]+)+$/;
    return uuid.test(key) || hudi.test(key) || key.length >= 16;
}

async function validateViaFetch(licenseKey: string, machineID: string): Promise<LicenseValidateResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(LICENSE_VALIDATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ licenseKey, machineID }),
            signal: controller.signal,
        });

        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

        if (!res.ok) {
            const err = data as { message?: string; error?: string };
            const msg = err.message || err.error || `License server error (${res.status})`;
            if (res.status === 404) {
                throw new Error('Invalid license key. Please check and try again.');
            }
            throw new Error(msg);
        }

        return parsePayload(data);
    } finally {
        clearTimeout(timer);
    }
}

async function validateViaCapacitorHttp(
    licenseKey: string,
    machineID: string
): Promise<LicenseValidateResult> {
    const { CapacitorHttp } = await import('@capacitor/core');
    const response = await CapacitorHttp.request({
        method: 'POST',
        url: LICENSE_VALIDATE_URL,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        data: { licenseKey, machineID },
        connectTimeout: TIMEOUT_MS,
        readTimeout: TIMEOUT_MS,
    });

    let data: Record<string, unknown>;
    if (typeof response.data === 'string') {
        try {
            data = JSON.parse(response.data) as Record<string, unknown>;
        } catch {
            throw new Error('Invalid response from license server');
        }
    } else {
        data = (response.data ?? {}) as Record<string, unknown>;
    }

    if (response.status < 200 || response.status >= 300) {
        const err = data as { message?: string; error?: string };
        const msg = err.message || err.error || `License server error (${response.status})`;
        if (response.status === 404) {
            throw new Error('Invalid license key. Please check and try again.');
        }
        throw new Error(msg);
    }

    return parsePayload(data);
}

function isNetworkFailure(err: unknown): boolean {
    if (!(err instanceof Error)) return true;
    const m = err.message;
    return (
        err.name === 'AbortError' ||
        m === 'TIMEOUT' ||
        m.includes('timed out') ||
        m.includes('Failed to fetch') ||
        m.includes('NetworkError') ||
        m.includes('Network request failed') ||
        m.includes('timeout') ||
        m.includes('Unable to resolve host') ||
        m.includes('temporarily unavailable')
    );
}

export async function validateLicenseOnline(
    licenseKey: string,
    machineID: string
): Promise<LicenseValidateResult> {
    const key = licenseKey.trim().toUpperCase().replace(/\s+/g, '');
    if (!key || key.length < 8) {
        throw new Error('Please enter your full license key from hudisoft.online.');
    }

    const attempts: Array<() => Promise<LicenseValidateResult>> = isNativeCapacitor()
        ? [() => validateViaFetch(key, machineID), () => validateViaCapacitorHttp(key, machineID)]
        : [() => validateViaFetch(key, machineID)];

    let lastError: Error | null = null;

    for (const attempt of attempts) {
        try {
            return await withTimeout(attempt(), TIMEOUT_MS + 1000);
        } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error(String(err));
        }
    }

    if (OFFLINE_DEMO_KEYS[key] && isNetworkFailure(lastError)) {
        return { ...OFFLINE_DEMO_KEYS[key] };
    }

    if (lastError?.name === 'AbortError' || lastError?.message === 'TIMEOUT') {
        throw new Error('License server timed out. Check internet and try again.');
    }
    if (lastError && isNetworkFailure(lastError)) {
        throw new Error('Cannot reach license server. Turn on Wi‑Fi or mobile data and try again.');
    }

    throw lastError ?? new Error('Activation failed. Please try again.');
}
