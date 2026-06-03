import { NextResponse } from 'next/server';

// Simple license validation that works without a database first
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { licenseKey, machineId } = body;

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, message: 'License key is required' },
        { status: 400 }
      );
    }

    // Clean the key
    const cleanKey = licenseKey.toUpperCase().trim();

    // Pre-defined valid licenses
    const validLicenses: Record<string, any> = {
      'HUDI-DEMO-2025-SUCCESS': {
        valid: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isTrial: true,
        daysRemaining: 30,
        type: 'demo',
        message: 'Demo license activated successfully!'
      },
      'HUDI-PRO-ENTERPRISE-2025': {
        valid: true,
        expiryDate: new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000).toISOString(),
        isTrial: false,
        daysRemaining: 1825,
        type: 'enterprise',
        message: 'Enterprise license activated successfully!'
      },
      'HUDI-STD-2025-LICENSE': {
        valid: true,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        isTrial: false,
        daysRemaining: 365,
        type: 'standard',
        message: 'Standard license activated successfully!'
      }
    };

    // Check if it's a known valid license
    if (validLicenses[cleanKey]) {
      return NextResponse.json(validLicenses[cleanKey]);
    }

    // Also accept any properly formatted license for development
    if (cleanKey.length >= 12 && cleanKey.includes('-')) {
      return NextResponse.json({
        valid: true,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        isTrial: false,
        daysRemaining: 365,
        type: 'professional',
        message: 'License activated successfully!'
      });
    }

    // Invalid license
    return NextResponse.json({
      valid: false,
      message: 'Invalid license key. Please check and try again.'
    });

  } catch (error) {
    console.error('License validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Server error during validation' },
      { status: 500 }
    );
  }
}
