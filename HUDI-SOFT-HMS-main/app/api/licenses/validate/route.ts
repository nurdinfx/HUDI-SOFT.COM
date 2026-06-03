import { NextResponse } from 'next/server';

// Pre-defined valid licenses matching the POS and other systems
const VALID_LICENSES: Record<string, any> = {
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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { licenseKey, machineID } = body;

        if (!licenseKey) {
            return NextResponse.json(
                { valid: false, message: 'License key is required' },
                { status: 400 }
            );
        }

        const cleanKey = licenseKey.toUpperCase().trim();

        // First check our known valid licenses
        if (VALID_LICENSES[cleanKey]) {
            return NextResponse.json(VALID_LICENSES[cleanKey]);
        }

        // Also accept any properly formatted license key (12+ chars with hyphens)
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
