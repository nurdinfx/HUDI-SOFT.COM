const DEFAULT_ORIGINS = [
  'https://datel-clinic.vercel.app',
  'https://www.datel-clinic.com',
  'https://datel-clinic.com',
  'https://hudisoft.online',
  'https://hudi-soft-com.vercel.app',
  'https://hudi-soft-com.onrender.com',
  'https://hudi-soft-com.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  // Capacitor mobile
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
];

function buildAllowedSet() {
  const fromEnv = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...fromEnv]);
}

const ALLOWED_SET = buildAllowedSet();
const VERCEL_PATTERN = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/;

function isAllowed(origin) {
  if (!origin) return true;
  const clean = origin.replace(/\/$/, '');
  return ALLOWED_SET.has(clean) || VERCEL_PATTERN.test(clean);
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && isAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin.replace(/\/$/, ''));
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,X-License-Key,x-license-key');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  next();
}

module.exports = { corsMiddleware };
