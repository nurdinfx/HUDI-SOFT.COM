/**
 * cors.js — Production-hardened CORS middleware
 * Supports:
 *   - Specific Vercel deployment URLs (exact + pattern)
 *   - localhost for development
 *   - Preflight OPTIONS with proper 204 response
 *   - Credentials (cookies + Authorization headers)
 *   - Custom X-License-Key header
 */

const DEFAULT_ALLOWED_ORIGINS = [
    // Production custom domain
    'https://hudisoft.online',
    'https://www.hudisoft.online',
    // Production Vercel deployments
    'https://hudi-soft-com.vercel.app',
    'https://hudi-soft-com-sz9e.vercel.app',
    'https://hudisoftdatel.vercel.app',
    'https://hudi-soft-com-m48c.vercel.app',
    'https://hudi-soft-hms.vercel.app',
    'https://hudi-soft-com-hms.vercel.app',
    'https://hudi-soft-hm-gargaar.vercel.app',
    'https://daryeel-hms-com.vercel.app',
    'https://hudi-soft-com.onrender.com',
    'https://hudi-soft-com.onrender.com',
    'https://hudi-hospital.onrender.com',
    // Development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4000',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    // Capacitor Android/iOS WebView (androidScheme: https)
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost',
];

/**
 * Merge env-provided origins (comma-separated CORS_ALLOWED_ORIGINS or CORS_ORIGIN)
 * with the hardcoded defaults at startup — avoids re-parsing on every request.
 */
function buildAllowedSet() {
    const fromEnv = (process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean);
    return new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv]);
}

const ALLOWED_SET = buildAllowedSet();

/**
 * Vercel preview deploy URLs follow the pattern:
 *   https://<project>-<hash>-<team>.vercel.app
 * We only allow *.vercel.app URLs that start with our project name.
 */
const VERCEL_PREVIEW_PATTERN = /^https:\/\/(hudi-soft|hudisoftdatel)[-a-z0-9]*\.vercel\.app$/;
const VERCEL_TEAM_PATTERN = /^https:\/\/hudisoftdatel[-a-z0-9]*-cismaankayse377-5782s-projects\.vercel\.app$/;
const HUDISOFT_DOMAIN_PATTERN = /^https?:\/\/(www\.)?hudisoft\.online$/;

function isOriginAllowed(origin) {
    if (!origin) return true; // server-to-server / non-browser request
    const clean = origin.replace(/\/$/, '');
    if (ALLOWED_SET.has(clean)) return true;
    if (VERCEL_PREVIEW_PATTERN.test(clean)) return true;
    if (VERCEL_TEAM_PATTERN.test(clean)) return true;
    if (HUDISOFT_DOMAIN_PATTERN.test(clean)) return true;
    return false;
}

function applyCorsHeaders(req, res) {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin)) {
        // Echo the exact origin — required when credentials: true
        res.setHeader('Access-Control-Allow-Origin', origin.replace(/\/$/, ''));
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
        // Non-browser (e.g. mobile app, Render health check, curl)
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    // else: unknown browser origin — send no CORS header → browser blocks it (correct)

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-License-Key, X-Machine-Id, X-Machine-ID'
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight 24 h
}

/**
 * Express middleware — must be registered BEFORE body-parser and all routes.
 */
function corsMiddleware(req, res, next) {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        const logOrigin = req.headers.origin || 'none';
        console.log(`[CORS] Preflight ${req.method} ${req.path} origin=${logOrigin} allowed=${isOriginAllowed(req.headers.origin)}`);
        // Use res.status().end() instead of sendStatus() for Express 4/5 compatibility
        res.status(204).end();
        return;
    }

    return next();
}

module.exports = {
    corsMiddleware,
    applyCorsHeaders,
    isOriginAllowed,
    allowedOrigins: [...ALLOWED_SET],
};
