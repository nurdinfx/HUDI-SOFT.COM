"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Loader2, KeyRound } from "lucide-react"
import { db } from "@/lib/db-store"

function getMachineId() {
  if (typeof window === "undefined") return "server";
  let machineId = localStorage.getItem("dc_machine_id");
  if (!machineId) {
    machineId = "DEV-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("dc_machine_id", machineId);
  }
  return machineId;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // License activation states
  const [isActivated, setIsActivated] = useState(false);
  const [activationKey, setActivationKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState("");

  const licenseKey = searchParams?.get("key");

  // Verify activation status and validate clock on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Clock Rollback Protection
    const now = new Date();
    const lastActiveStr = localStorage.getItem("dc_last_active_date");
    if (lastActiveStr) {
      const lastActive = new Date(lastActiveStr);
      if (now < lastActive) {
        setError("Device clock rollback detected. Please restore your system to the correct current time.");
        return;
      }
    }
    localStorage.setItem("dc_last_active_date", now.toISOString());

    // 2. Check Expiration of stored license key
    const storedKey = localStorage.getItem("dc_license_key");
    const storedExpiry = localStorage.getItem("dc_license_expiry");
    if (storedKey) {
      if (storedExpiry) {
        const expiryDate = new Date(storedExpiry);
        if (expiryDate < now) {
          setError("Your trial license has expired. Please contact support or purchase a license key.");
          localStorage.removeItem("dc_license_key");
          setIsActivated(false);
          return;
        }
      }
      setIsActivated(true);
    }
  }, []);

  // Handle URL license key parameter auto-activation
  useEffect(() => {
    if (licenseKey) {
      autoActivateUrlKey(licenseKey);
    }
  }, [licenseKey]);

  async function autoActivateUrlKey(key: string) {
    setActivating(true);
    setActivationError("");
    try {
      const machineID = getMachineId();
      const response = await fetch("/api/licenses/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: key, machineID })
      });
      const result = await response.json();

      if (result.valid) {
        localStorage.setItem("dc_license_key", key);
        localStorage.setItem("dc_license_expiry", result.expiryDate);
        setIsActivated(true);
        setEmail("detailcare@demo.com");
        setPassword("detailcare123");
        
        // Clear mock data if it was auto-generated from landing page trial
        localStorage.setItem("dc_patients", JSON.stringify([]));
        localStorage.setItem("dc_appointments", JSON.stringify([]));
        localStorage.setItem("dc_ehr", JSON.stringify([]));
        localStorage.setItem("dc_medications", JSON.stringify([]));
        localStorage.setItem("dc_invoices", JSON.stringify([]));
        localStorage.setItem("dc_labs", JSON.stringify([]));
        localStorage.setItem("dc_customers", JSON.stringify([]));
        localStorage.setItem("dc_loans", JSON.stringify([]));
        localStorage.setItem("dc_users", JSON.stringify([]));
      } else {
        setActivationError(result.message || "Failed to validate license key.");
      }
    } catch (err) {
      setActivationError("Network error. Please check your internet connection.");
    } finally {
      setActivating(false);
    }
  }

  async function handleActivateLicense(e: React.FormEvent) {
    e.preventDefault();
    if (!activationKey.trim()) return;

    setActivating(true);
    setActivationError("");
    setError("");

    try {
      const machineID = getMachineId();
      const response = await fetch("/api/licenses/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: activationKey.trim(), machineID })
      });
      const result = await response.json();

      if (result.valid) {
        localStorage.setItem("dc_license_key", activationKey.trim());
        localStorage.setItem("dc_license_expiry", result.expiryDate);
        setIsActivated(true);
        
        // Start zero-data for brand new active key
        localStorage.setItem("dc_patients", JSON.stringify([]));
        localStorage.setItem("dc_appointments", JSON.stringify([]));
        localStorage.setItem("dc_ehr", JSON.stringify([]));
        localStorage.setItem("dc_medications", JSON.stringify([]));
        localStorage.setItem("dc_invoices", JSON.stringify([]));
        localStorage.setItem("dc_labs", JSON.stringify([]));
        localStorage.setItem("dc_customers", JSON.stringify([]));
        localStorage.setItem("dc_loans", JSON.stringify([]));
        localStorage.setItem("dc_users", JSON.stringify([]));
      } else {
        setActivationError(result.message || "Failed to validate license key.");
      }
    } catch (err) {
      setActivationError("Network error. Please check your internet connection and try again.");
    } finally {
      setActivating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    
    try {
      // Simulate authentication check
      await new Promise(resolve => setTimeout(resolve, 800));

      // 1. Check if user is the standard demo user
      if (email === "detailcare@demo.com" && password === "detailcare123") {
        localStorage.setItem("dc_auth", "true");
        localStorage.setItem("dc_current_user", JSON.stringify({
          name: "Dr. Sarah Jenkins",
          role: "Chief Medical Officer (Doctor)"
        }));
        router.push("/dashboard");
        return;
      }

      // 2. Check dynamically created users in db-store
      const users = db.getUsers();
      const foundUser = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        (u.password === password || (!u.password && password === "password123"))
      );

      if (foundUser) {
        if (foundUser.status !== "Active") {
          setError("This account is currently inactive. Please contact the administrator.");
          return;
        }
        // Success
        localStorage.setItem("dc_auth", "true");
        localStorage.setItem("dc_current_user", JSON.stringify({
          name: foundUser.name,
          role: foundUser.role
        }));
        router.push("/dashboard");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch (err) {
      setError("An error occurred during login.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-clinical-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[1000px] grid md:grid-cols-2 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 mx-6 border border-slate-100 dark:border-slate-700">
        
        {/* Branding Side */}
        <div className="bg-clinical-900 text-white p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="relative z-10">
            <div className="mb-8">
              <Image
                src="/logo.png"
                alt="Hudi Datel Care Logo"
                width={180}
                height={180}
                className="rounded-2xl shadow-2xl shadow-black/30 drop-shadow-2xl"
                priority
              />
            </div>
            <h1 className="text-4xl font-black mb-4">Hudi Datel Care</h1>
            <p className="text-clinical-200 text-lg leading-relaxed">Enterprise Progressive Web App for specialized clinical operations, electronic health records, and telehealth.</p>
          </div>

          <div className="relative z-10 mt-12">
            <div className="glass-panel p-6 rounded-2xl border-white/20">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <KeyRound size={16} className="text-clinical-300" />
                {isActivated ? "System Active" : "Activation Required"}
              </h3>
              {isActivated ? (
                <p className="text-sm text-clinical-100 opacity-90 leading-relaxed font-mono tracking-tight break-all">
                  Key: {localStorage.getItem("dc_license_key")}
                </p>
              ) : (
                <p className="text-sm text-clinical-100 opacity-90 leading-relaxed">
                  Please activate this device with your license key or trial key to access clinical features.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="p-12 lg:p-16 flex flex-col justify-center">
          {!isActivated ? (
            /* License Activation Screen */
            <div>
              <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Activate System</h2>
                <p className="text-slate-500 dark:text-slate-400">Enter your license key or trial key to activate Hudi Datel Care on this device.</p>
              </div>

              <form onSubmit={handleActivateLicense} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">License Key</label>
                  <input
                    type="text"
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-clinical-500 transition-all outline-none font-mono"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    required
                    disabled={activating}
                  />
                </div>

                {activationError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center">
                    {activationError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={activating}
                  className="w-full py-4 bg-clinical-600 hover:bg-clinical-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-clinical-500/20 flex items-center justify-center disabled:opacity-70 active:scale-[0.98]"
                >
                  {activating ? <Loader2 className="animate-spin size-5" /> : "Verify & Activate"}
                </button>
              </form>
              
              <div className="mt-8 text-center">
                <a 
                  href="https://hudi-soft-com.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-clinical-600 hover:underline"
                >
                  Need a license key? Get trial demo
                </a>
              </div>
            </div>
          ) : (
            /* Login Form Screen */
            <div>
              <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Welcome back</h2>
                <p className="text-slate-500 dark:text-slate-400">Please enter your details to sign in.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-clinical-500 transition-all outline-none"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-clinical-500 focus:border-clinical-500 transition-all outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-clinical-600 hover:bg-clinical-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-clinical-500/20 flex items-center justify-center disabled:opacity-70 active:scale-[0.98]"
                >
                  {submitting ? <Loader2 className="animate-spin size-5" /> : "Sign In to Hudi Datel Care"}
                </button>
              </form>
              
              <div className="mt-8 text-center flex flex-col gap-2">
                <button 
                  onClick={() => {
                    localStorage.removeItem("dc_license_key");
                    setIsActivated(false);
                  }}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Deactivate this Device / Change License Key
                </button>
              </div>
            </div>
          )}
          
          <p className="mt-8 text-center text-xs text-slate-400 font-medium">
            © 2026 HUDI SOFT SYSTEMS
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="animate-spin size-8 text-clinical-600" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
