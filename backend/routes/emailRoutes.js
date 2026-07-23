const express = require('express');
const router = express.Router();
const CustomerEmail = require('../models/CustomerEmail');
const { protect, admin } = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');

// @desc    Get all customer emails with filtering
// @route   GET /api/admin/emails
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const {
            search,
            product,
            subscriptionStatus,
            hasActiveLicense,
            unsubscribed,
            page = 1,
            limit = 50
        } = req.query;

        const filter = {};

        if (search) {
            const re = new RegExp(search, 'i');
            filter.$or = [{ email: re }, { name: re }, { companyName: re }];
        }
        if (product) filter.products = product;
        if (subscriptionStatus) filter.subscriptionStatus = subscriptionStatus;
        if (hasActiveLicense !== undefined) filter.hasActiveLicense = hasActiveLicense === 'true';
        if (unsubscribed !== undefined) filter.unsubscribed = unsubscribed === 'true';

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await CustomerEmail.countDocuments(filter);
        const emails = await CustomerEmail.find(filter)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({ total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), emails });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get email marketing stats
// @route   GET /api/admin/emails/stats
// @access  Private/Admin
router.get('/stats', protect, admin, async (req, res) => {
    try {
        const total = await CustomerEmail.countDocuments();
        const active = await CustomerEmail.countDocuments({ subscriptionStatus: 'Active' });
        const trial = await CustomerEmail.countDocuments({ subscriptionStatus: 'Trial' });
        const expired = await CustomerEmail.countDocuments({ subscriptionStatus: 'Expired' });
        const withLicense = await CustomerEmail.countDocuments({ hasActiveLicense: true });
        const unsubscribed = await CustomerEmail.countDocuments({ unsubscribed: true });

        // By product
        const byProduct = await CustomerEmail.aggregate([
            { $unwind: '$products' },
            { $group: { _id: '$products', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({ total, active, trial, expired, withLicense, unsubscribed, byProduct });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Check if Resend HTTP API is configured */
function getResendConfig() {
    return process.env.RESEND_API_KEY || null;
}

/** Helper to get a verified SMTP transporter (checks port 587 first, auto-falls back to 465 SSL if blocked/timed out) */
async function getVerifiedTransporter() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
        throw new Error('SMTP credentials not configured. Please add SMTP_USER and SMTP_PASS variables to Render.');
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT) || 587;
    const secure = port === 465;

    const primaryConfig = {
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
        family: 4 // Force IPv4 to prevent ENETUNREACH on Render's IPv6-unsupported network
    };

    console.log(`[SMTP] Attempting connection to ${host}:${port} (secure: ${secure})...`);
    let transporter = nodemailer.createTransport(primaryConfig);
    try {
        await transporter.verify();
        console.log(`[SMTP] Verified successfully on ${host}:${port}`);
        return { transporter, config: primaryConfig };
    } catch (primaryErr) {
        console.warn(`[SMTP] Primary configuration failed on ${host}:${port}: ${primaryErr.message}`);
        
        // If the user set a custom port/host, don't try fallback
        if (process.env.SMTP_HOST || process.env.SMTP_PORT) {
            throw primaryErr;
        }

        // Auto-fallback to port 465 SSL (very common solution on hosts that block port 587)
        const fallbackConfig = {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user, pass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000,
            family: 4 // Force IPv4
        };

        console.log(`[SMTP] Trying fallback configuration to smtp.gmail.com:465 (secure: true)...`);
        try {
            transporter = nodemailer.createTransport(fallbackConfig);
            await transporter.verify();
            console.log('[SMTP] Verified successfully using fallback configuration (Port 465)');
            return { transporter, config: fallbackConfig };
        } catch (fallbackErr) {
            console.error(`[SMTP] Fallback configuration also failed: ${fallbackErr.message}`);
            throw new Error(`Failed to connect to SMTP. Port 587 error: ${primaryErr.message}. Port 465 fallback error: ${fallbackErr.message}`);
        }
    }
}

/** Build a professional branded HTML email */
function buildHtmlEmail(recipientName, subject, textBody) {
    const name = recipientName || 'Valued Customer';
    const lines = textBody.split('\n').map(l => `<p style="margin:0 0 10px 0;color:#374151;">${l || '&nbsp;'}</p>`).join('');
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">🚀 HUDI SOFT</h1>
          <p style="margin:6px 0 0 0;color:#bfdbfe;font-size:13px;">Enterprise Software Solutions</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="margin:0 0 20px 0;font-size:16px;color:#111827;font-weight:600;">Hello, ${name}!</p>
          ${lines}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">© ${new Date().getFullYear()} HUDI SOFT — Enterprise Software Solutions</p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">You received this email because you registered a HUDI SOFT product.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// @desc    Test SMTP or Resend connection
// @route   GET /api/admin/emails/test-smtp
// @access  Private/Admin
router.get('/test-smtp', protect, admin, async (req, res) => {
    const resendApiKey = getResendConfig();
    if (resendApiKey) {
        try {
            const testRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'HUDI SOFT <onboarding@resend.dev>',
                    to: 'cismaankayse377@gmail.com',
                    subject: 'SMTP / API Test Connection',
                    html: '<p>Resend HTTP API connection is working!</p>'
                })
            });
            if (testRes.ok) {
                return res.json({ ok: true, message: 'Resend HTTP API connected and verified successfully!' });
            } else {
                const errData = await testRes.json();
                return res.status(500).json({ ok: false, message: `Resend API Error: ${errData.message || testRes.statusText}` });
            }
        } catch (err) {
            return res.status(500).json({ ok: false, message: `Resend HTTP check failed: ${err.message}` });
        }
    }

    try {
        const { config } = await getVerifiedTransporter();
        res.json({ ok: true, message: `SMTP connected successfully using ${config.auth.user} on port ${config.port}` });
    } catch (err) {
        res.status(500).json({ ok: false, message: `SMTP connection failed: ${err.message}. If you are on Render Free plan, standard SMTP ports are blocked. Please use RESEND_API_KEY instead.` });
    }
});

// @desc    Send email campaign
// @route   POST /api/admin/emails/campaign
// @access  Private/Admin
router.post('/campaign', protect, admin, async (req, res) => {
    const { subject, htmlBody, textBody, targetIds, filter } = req.body;

    if (!subject || (!htmlBody && !textBody)) {
        return res.status(400).json({ message: 'Subject and body are required' });
    }

    const resendApiKey = getResendConfig();
    let smtpConnection;

    if (!resendApiKey) {
        try {
            smtpConnection = await getVerifiedTransporter();
        } catch (err) {
            return res.status(503).json({
                message: `⚠️ SMTP setup failed: ${err.message}. Note: Render Free plan blocks all SMTP ports. To bypass this, sign up at resend.com and add the RESEND_API_KEY environment variable.`,
                error: 'SMTP_NOT_CONFIGURED'
            });
        }
    }

    try {
        let recipients = [];

        if (targetIds && targetIds.length > 0) {
            const records = await CustomerEmail.find({
                _id: { $in: targetIds },
                unsubscribed: { $ne: true }
            }).select('email name');
            recipients = records;
        } else if (filter) {
            const query = { unsubscribed: { $ne: true } };
            if (filter.product) query.products = filter.product;
            if (filter.subscriptionStatus) query.subscriptionStatus = filter.subscriptionStatus;
            if (filter.hasActiveLicense !== undefined) query.hasActiveLicense = filter.hasActiveLicense;
            const records = await CustomerEmail.find(query).select('email name');
            recipients = records;
        }

        if (recipients.length === 0) {
            return res.status(400).json({ message: 'No recipients matched the selection.' });
        }

        const errors = [];
        let sent = 0;
        let failed = 0;

        if (resendApiKey) {
            // Send via Resend HTTP API
            for (const recipient of recipients) {
                try {
                    const personalHtml = buildHtmlEmail(
                        recipient.name,
                        subject,
                        textBody || htmlBody.replace(/<[^>]+>/g, '')
                    );
                    const resendRes = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${resendApiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            from: process.env.EMAIL_FROM || 'HUDI SOFT <info@hudisoft.online>',
                            reply_to: process.env.REPLY_TO || process.env.SMTP_USER || undefined,
                            to: recipient.email,
                            subject: subject,
                            html: personalHtml
                        })
                    });
                    if (resendRes.ok) {
                        sent++;
                        console.log(`[Resend API] ✅ Sent to ${recipient.email}`);
                    } else {
                        const errData = await resendRes.json();
                        throw new Error(errData.message || resendRes.statusText);
                    }
                } catch (apiErr) {
                    console.error(`[Resend API] ❌ Failed to send to ${recipient.email}:`, apiErr.message);
                    errors.push({ email: recipient.email, error: apiErr.message });
                    failed++;
                }
            }
        } else {
            // Send via SMTP
            const { transporter, config } = smtpConnection;
            const BATCH_SIZE = 10;

            for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
                const batch = recipients.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (recipient) => {
                    try {
                        const personalHtml = buildHtmlEmail(
                            recipient.name,
                            subject,
                            textBody || htmlBody.replace(/<[^>]+>/g, '')
                        );
                        await transporter.sendMail({
                            from: `"HUDI SOFT" <${config.auth.user}>`,
                            to: recipient.email,
                            subject,
                            html: personalHtml,
                            text: textBody || ''
                        });
                        sent++;
                        console.log(`[Campaign] ✅ Sent to ${recipient.email}`);
                    } catch (mailErr) {
                        console.error(`[Campaign] ❌ Failed to send to ${recipient.email}:`, mailErr.message);
                        errors.push({ email: recipient.email, error: mailErr.message });
                        failed++;
                    }
                }));
                // Small delay between batches to avoid rate limiting
                if (i + BATCH_SIZE < recipients.length) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }
        }

        console.log(`[Campaign] "${subject}" — Sent: ${sent}, Failed: ${failed}, Total: ${recipients.length}`);
        res.json({
            message: failed === 0
                ? `✅ Campaign sent successfully to all ${sent} recipients!`
                : `Campaign completed. ${sent} sent, ${failed} failed.`,
            sent,
            failed,
            total: recipients.length,
            errors: errors.slice(0, 10)
        });
    } catch (err) {
        console.error('[Campaign] Error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

// @desc    Unsubscribe email
// @route   PUT /api/admin/emails/:id/unsubscribe
// @access  Private/Admin
router.put('/:id/unsubscribe', protect, admin, async (req, res) => {
    try {
        const record = await CustomerEmail.findByIdAndUpdate(
            req.params.id,
            { unsubscribed: true },
            { new: true }
        );
        if (!record) return res.status(404).json({ message: 'Email not found' });
        res.json({ message: 'Email unsubscribed', record });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Resubscribe email
// @route   PUT /api/admin/emails/:id/resubscribe
// @access  Private/Admin
router.put('/:id/resubscribe', protect, admin, async (req, res) => {
    try {
        const record = await CustomerEmail.findByIdAndUpdate(
            req.params.id,
            { unsubscribed: false },
            { new: true }
        );
        if (!record) return res.status(404).json({ message: 'Email not found' });
        res.json({ message: 'Email resubscribed', record });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
