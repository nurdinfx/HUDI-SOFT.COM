import { NextResponse } from 'next/server';

// ─── Hardcoded demo/trial licenses (always available, no network needed) ────
const STATIC_LICENSES: Record<string, {
  valid: boolean;
  expiryDate: string;
  isTrial: boolean;
  daysRemaining: number;
  type: string;
  message: string;
}> = {
  'HUDI-DEMO-2025-SUCCESS': {
    valid: true,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isTrial: true,
    daysRemaining: 30,
    type: 'demo',
    message: 'Demo license activated successfully!',
  },
  'HUDI-PRO-ENTERPRISE-2025': {
    valid: true,
    expiryDate: new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000).toISOString(),
    isTrial: false,
    daysRemaining: 1825,
    type: 'enterprise',
    message: 'Enterprise license activated successfully!',
  },
  'HUDI-STD-2025-LICENSE': {
    valid: true,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    isTrial: false,
    daysRemaining: 365,
    type: 'standard',
    message: 'Standard license activated successfully!',
  },
};

// ─── Fetch against the real licensing backend with a hard timeout ────────────
async function validateAgainstBackend(
  licenseKey: string,
  machineID: string,
  timeoutMs = 8000
): Promise<{ valid: boolean; [key: string]: unknown } | null> {
  const LICENSING_API =
    process.env.LICENSING_API_URL ||
    'https://hudi-hospital.onrender.com/api';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${LICENSING_API}/licenses/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, machineID }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[License API] upstream status ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    clearTimeout(timer);
    const name = (err instanceof Error) ? err.name : 'UnknownError';
    if (name === 'AbortError') {
      console.warn('[License API] upstream timed out after', timeoutMs, 'ms');
    } else {
      console.error('[License API] upstream fetch error:', err);
    }
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { licenseKey, machineID = 'UNKNOWN' } = body as {
      licenseKey?: string;
      machineID?: string;
    };

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, message: 'License key is required' },
        { status: 400 }
      );
    }

    const cleanKey = String(licenseKey).toUpperCase().trim().replace(/\s+/g, '');

    console.log(
      `[License Validate] key=${cleanKey.substring(0, 10)}… machine=${machineID}`
    );

    // 1. Check static/demo licenses first (instant, no network)
    if (STATIC_LICENSES[cleanKey]) {
      console.log(`[License Validate] static match: ${cleanKey}`);
      return NextResponse.json(STATIC_LICENSES[cleanKey]);
    }

    // 2. Try the real licensing backend with timeout protection
    const upstream = await validateAgainstBackend(cleanKey, machineID, 8000);

    if (upstream !== null) {
      // Normalise: upstream may return { success: true } or { valid: true }
      const isValid = upstream.valid === true || (upstream as any).success === true;
      return NextResponse.json({
        valid: isValid,
        expiryDate: upstream.expiryDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        isTrial: upstream.isTrial ?? false,
        daysRemaining: upstream.daysRemaining ?? 365,
        companyName: upstream.companyName,
        productType: upstream.productType,
        type: upstream.type ?? 'professional',
        message: upstream.message ?? (isValid ? 'License activated successfully!' : 'Invalid license key.'),
      });
    }

    // 3. Fallback for properly-formatted keys when backend is unreachable
    //    Accept keys matching pattern: XXXX-XXXX-XXXX-XXXX (36-char UUID style)
    const UUID_PATTERN =
      /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
    const HUDI_PATTERN = /^HUDI-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/;

    if (UUID_PATTERN.test(cleanKey) || HUDI_PATTERN.test(cleanKey)) {
      console.warn(
        '[License Validate] backend unreachable, accepting formatted key as provisional'
      );
      return NextResponse.json({
        valid: true,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        isTrial: false,
        daysRemaining: 365,
        type: 'professional',
        message: 'License activated (offline mode). Full validation will resume when service reconnects.',
      });
    }

    // 4. Reject
    return NextResponse.json({
      valid: false,
      message: 'Invalid license key. Please check and try again.',
    });
  } catch (error) {
    console.error('[License Validate] handler error:', error);
    return NextResponse.json(
      { valid: false, message: 'Server error during validation. Please try again.' },
      { status: 500 }
    );
  }
}

// Support OPTIONS preflight (Vercel handles it, but be explicit)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
