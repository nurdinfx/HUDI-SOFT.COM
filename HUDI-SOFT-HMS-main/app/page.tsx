"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isCapacitor = !!(
      (window as any).Capacitor?.isNativePlatform?.()
    );

    if (isCapacitor) {
      const stored = localStorage.getItem("hms_activation_info");
      if (!stored) {
        // Not activated yet
        router.replace("/activate");
      } else {
        // Activated — check if already logged in
        const token = localStorage.getItem("hms_token");
        const user = localStorage.getItem("hms_user");
        if (token && user) {
          // Already logged in — go straight to dashboard
          router.replace("/dashboard");
        } else {
          // Activated but not logged in — go to login
          router.replace("/login");
        }
      }
    } else {
      // Web/PWA — go to dashboard (auth-context handles the rest)
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/logo.png"
          alt="HUDI SOFT"
          className="w-20 h-20 object-contain rounded-full"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <Loader2 className="size-8 animate-spin text-blue-400" />
      </div>
    </div>
  );
}
