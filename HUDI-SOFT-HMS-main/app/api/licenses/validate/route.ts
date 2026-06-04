import { NextResponse } from 'next/server';

const CENTRAL_LICENSE_API =
  process.env.LICENSE_API_URL?.replace(/\/$/, '') ||
  'https://hudi-soft-com.onrender.com/api';

const PROXY_TIMEOUT_MS = 25000;

/**
 * Server-side proxy: browser calls same-origin /api/licenses/validate (no CORS).
 * Forwards to the central licensing API on Render (MongoDB-backed keys).
 */
export async function POST(request: Request) {
  const started = Date.now();
  try {
    const body = await request.json();
    const licenseKey = body?.licenseKey || body?.key;
    const machineID = body?.machineID || body?.machineId;

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, message: 'License key is required' },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${CENTRAL_LICENSE_API}/licenses/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, machineID }),
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });

    const data = await upstream.json().catch(() => ({}));
    console.log(
      `[license-proxy] status=${upstream.status} ms=${Date.now() - started} key=${String(licenseKey).slice(0, 8)}…`
    );

    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'License server timed out. Wait 30 seconds and try again (Render may be waking up).'
        : 'Could not reach the license server. Please try again.';

    console.error('[license-proxy] error:', error);
    return NextResponse.json({ valid: false, message }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
