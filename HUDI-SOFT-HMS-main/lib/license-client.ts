/**
 * Online license validation — central HUDI SOFT server (same keys as hudisoft.online demo).
 * Capacitor Android uses https://localhost; fetch() is CORS-blocked → use native HTTP.
 */

const LICENSE_VALIDATE_URL = 'https://hudi-soft-com.onrender.com/api/licenses/validate';
const TIMEOUT_MS = 45000;

export type LicenseValidateResult = {
    valid: true;
    message: string;
    expiryDate: string;
    isTrial: boolean;
    daysRemaining: number;
    companyName?: string;
};

function isNativeCapacitor(): boolean {
    if (typeof window === 'undefined') return false;
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
    if (!cap) return false;
    if (cap.isNativePlatform?.()) return true;
    const platform = cap.getPlatform?.();
    return platform === 'android' || platform === 'ios';
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

    return {
        valid: true,
        message: result.message || 'License is valid',
        expiryDate: result.expiryDate || '',
        isTrial: result.isTrial ?? false,
        daysRemaining: result.daysRemaining ?? 0,
        companyName: result.companyName,
    };
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

    const data =
        typeof response.data === 'string'
            ? (JSON.parse(response.data) as Record<string, unknown>)
            : (response.data as Record<string, unknown>);

    if (response.status < 200 || response.status >= 300) {
        const err = data as { message?: string; error?: string };
        throw new Error(err.message || err.error || `License server error (${response.status})`);
    }

    return parsePayload(data);
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
            throw new Error(err.message || err.error || `License server error (${res.status})`);
        }

        return parsePayload(data);
    } finally {
        clearTimeout(timer);
    }
}

export async function validateLicenseOnline(
    licenseKey: string,
    machineID: string
): Promise<LicenseValidateResult> {
    const key = licenseKey.trim().toUpperCase().replace(/\s+/g, '');
    if (!key || key.length < 8) {
        throw new Error('Please enter your full license key from hudisoft.online.');
    }

    try {
        if (isNativeCapacitor()) {
            return await validateViaCapacitorHttp(key, machineID);
        }
        return await validateViaFetch(key, machineID);
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.name === 'AbortError') {
                throw new Error('License server timed out. Wait 30 seconds and try again.');
            }
            if (
                err.message.includes('Failed to fetch') ||
                err.message.includes('NetworkError') ||
                err.message.includes('Network request failed')
            ) {
                throw new Error(
                    'Cannot reach license server. Turn on internet and try again (connects to hudi-soft-com.onrender.com).'
                );
            }
            throw err;
        }
        throw new Error('Cannot reach license server. Check your internet connection.');
    }
}
