import { NextResponse } from 'next/server';

const LICENSE_SERVER =
  process.env.LICENSING_API_URL || 'https://hudi-soft-com.onrender.com/api';

async function validateAgainstBackend(
  licenseKey: string,
  machineID: string,
  timeoutMs = 12000
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${LICENSE_SERVER}/licenses/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ licenseKey, machineID }),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const msg = (data.message as string) || (data.error as string) || `License server error (${res.status})`;
      throw new Error(msg);
    }

    return data;
  } finally {
    clearTimeout(timer);
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

    const upstream = await validateAgainstBackend(cleanKey, machineID);

    const isValid = upstream.valid === true || upstream.success === true;
    if (!isValid) {
      return NextResponse.json({
        valid: false,
        message: (upstream.message as string) || 'Invalid license key.',
      });
    }

    if (!upstream.expiryDate) {
      return NextResponse.json(
        { valid: false, message: 'License server did not return an expiry date.' },
        { status: 502 }
      );
    }

    const expiry = new Date(upstream.expiryDate as string);
    const daysRemaining =
      (upstream.daysRemaining as number) ??
      Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      valid: true,
      expiryDate: expiry.toISOString(),
      isTrial: upstream.isTrial ?? false,
      daysRemaining,
      companyName: upstream.companyName,
      productType: upstream.productType,
      message: (upstream.message as string) || 'License is valid.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Validation failed';
    console.error('[License Validate] error:', msg);
    return NextResponse.json({ valid: false, message: msg }, { status: 502 });
  }
}

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
