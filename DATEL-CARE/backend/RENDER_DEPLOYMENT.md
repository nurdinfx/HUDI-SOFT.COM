# Render Deployment Guide — HUDI-SOFT HMS Backend

## Quick Deploy

This repository includes a `render.yaml` at the root that auto-configures the service.

1. **Fork or push this repo to GitHub**
2. Go to [Render Dashboard](https://dashboard.render.com)
3. **New → Web Service → Connect Repository** → select `HUDI-SOFT.COM`
4. Render will auto-detect `render.yaml` and pre-fill settings
5. **Add Environment Variables** (see below)
6. Click **Create Web Service**

---

## Environment Variables (Required)

Set these in **Render Dashboard → your service → Environment**:

```
DATABASE_URL = postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-YOUR_REGION.pooler.supabase.com:6543/postgres
JWT_SECRET = your_random_secret_here_min_32_chars
FRONTEND_URL = https://hudi-soft-com-sz9e.vercel.app
NODE_ENV = production
PORT = 4000
```

### Getting `DATABASE_URL` from Supabase

1. Go to your [Supabase project](https://supabase.com/dashboard)
2. **Settings → Database → Connection String**
3. Select **Transaction pooler** (NOT Session pooler, NOT Direct)
4. Copy the string — it looks like:
   ```
   postgresql://postgres.pfythhjtdvavhpjnrzdk:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. Paste the full string into `DATABASE_URL` on Render

⚠️ **IMPORTANT:** Use port **6543** (Transaction pooler), not 5432. The 5432 Direct connection will fail on Render free tier.

---

## Manual Configuration (if `render.yaml` is not detected)

If Render doesn't auto-detect the config:

- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Root Directory:** `DATEL-CARE/backend`
- **Health Check Path:** `/api/health`

---

## Troubleshooting

### Error: `ENOTFOUND tenant/user postgres.pfythhjtdvavhpjnrzdk not found`
- **Cause:** Wrong Supabase connection string format
- **Fix:** Use the **Transaction pooler** URL (port 6543), not Session or Direct

### Error: `No open ports detected`
- **Cause:** Server crashed before opening port 4000
- **Fix:** Check logs for database connection errors — usually means `DATABASE_URL` is missing or wrong

### Error: `Migration failed`
- **Expected:** Migrations can fail gracefully if DB is unreachable
- **Effect:** The HTTP server stays up, `/api/health` returns 200, but DB-dependent routes return 503
- **Fix:** Set `DATABASE_URL` correctly and redeploy

---

## Keep-Alive (prevents cold starts)

The server pings itself every 10 minutes in production to prevent Render free-tier sleep. No external service needed.

For extra reliability, you can also add a free [UptimeRobot](https://uptimerobot.com) monitor pointing to:
```
https://YOUR-SERVICE-NAME.onrender.com/api/health
```
Set interval to **5 minutes**.

---

## License Validation Flow

The frontend at `https://hudi-soft-com-sz9e.vercel.app` has a local Next.js API route at `/api/licenses/validate` that handles demo keys instantly (no backend needed). For real customer keys, it proxies to this Render backend with an 8-second timeout, so the frontend never hangs even during Render cold starts.

---

## Logs

View live logs in **Render Dashboard → your service → Logs**.

Successful startup looks like:
```
🔌 DB config: { host: 'aws-0-eu-west-1.pooler.supabase.com', ... }
🏥 Hospital Management API listening on port 4000
✅ Database connected
📦 Running database migrations...
✅ All migrations complete
[KeepAlive] Scheduled ping every 10 min
```

---

## Production Checklist

- [ ] `DATABASE_URL` set with Transaction pooler (port 6543)
- [ ] `JWT_SECRET` set (min 32 random characters)
- [ ] `FRONTEND_URL` set to your Vercel domain
- [ ] Health check returns `{"status":"ok"}` at `/api/health`
- [ ] License validation works: `POST /api/licenses/validate`
- [ ] No crashes in logs for 5+ minutes after deploy

---

**Need help?** Check [Render Docs](https://render.com/docs) or open an issue.
