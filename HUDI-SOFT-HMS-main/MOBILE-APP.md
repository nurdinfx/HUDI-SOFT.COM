# HUDI SOFT HMS — Android (Capacitor)

## Requirements

- Node.js 18+
- Android Studio with JDK 17+
- Set `JAVA_HOME` to your JDK path if Gradle sync fails

## Build steps

```bash
npm install
npm run phone-build
```

Open in Android Studio:

```bash
npm run cap:open
```

Then **File → Sync Project with Gradle Files**, then **Build → Build APK(s)**.

## Configuration

Copy `.env.example` to `.env.local` for web builds. The mobile app uses these defaults:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | HMS backend (`https://hudi-soft-hms.onrender.com`) |
| `NEXT_PUBLIC_LICENSE_API_URL` | License server (`https://hudi-soft-com.onrender.com/api`) |

## License activation

On first launch, enter your HUDI SOFT license key (same as desktop HMS). Keys are validated on the central licensing server and bound to this device.

Trial keys: https://hudisoft.online/request-demo
