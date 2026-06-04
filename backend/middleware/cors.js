const DEFAULT_ALLOWED_ORIGINS = [
    'https://hudi-soft-com-sz9e.vercel.app',
    'https://hudi-soft-com.vercel.app',
    'https://hudi-soft-com-2g8v.vercel.app',
    'https://hudi-soft-com-m48c.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
];

function parseAllowedOrigins() {
    const fromEnv = (process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv])];
}

const allowedOrigins = parseAllowedOrigins();
const allowedOriginPatterns = [
    /^https:\/\/hudi-soft-com[-a-z0-9]*\.vercel\.app$/,
    /^https:\/\/.*\.vercel\.app$/,
];

function isOriginAllowed(origin) {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    return allowedOriginPatterns.some((pattern) => pattern.test(origin));
}

function applyCorsHeaders(req, res) {
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-License-Key'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
}

function corsMiddleware(req, res, next) {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        console.log(`[CORS] Preflight ${req.path} origin=${req.headers.origin || 'none'}`);
        return res.sendStatus(204);
    }

    return next();
}

module.exports = { corsMiddleware, applyCorsHeaders, isOriginAllowed, allowedOrigins };
