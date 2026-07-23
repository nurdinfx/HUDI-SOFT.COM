import React, { useState, useEffect, useCallback, memo } from 'react';
import { useParams } from 'react-router-dom';
import { realApi } from '../api/realApi';
import { toast } from 'react-hot-toast';
import {
  Fingerprint,
  Calendar,
  MapPin,
  CheckCircle,
  User,
  ShieldAlert,
  LogOut,
  ArrowRight,
  Loader2,
  Lock,
  Wifi,
  WifiOff
} from 'lucide-react';

/* ─── WebAuthn Buffer Helpers ─────────────────────────────────────────── */
function bufferToBase64URL(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function base64URLToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

const SCREEN = {
  LOADING:  'LOADING',
  ERROR:    'ERROR',
  IDENTIFY: 'IDENTIFY',
  READY:    'READY',
  REGISTER: 'REGISTER',
  PIN:      'PIN',
  SUCCESS:  'SUCCESS',
};

/* ─────────────────────────────────────────────────────────────────────────
   LiveClock — isolated component so ONLY the clock text re-renders.
   The rest of the page is completely unaffected by the 1-second tick.
───────────────────────────────────────────────────────────────────────── */
const LiveClock = memo(() => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="text-center py-5 border-b border-white/5" style={{ background: '#0d1117' }}>
      {/* tabular-nums prevents digit-width changes from shifting layout */}
      <div
        className="text-3xl font-black font-mono text-white"
        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.12em' }}
      >
        {fmtTime(time)}
      </div>
      <div className="text-slate-500 font-bold uppercase mt-1 flex items-center justify-center gap-1.5"
        style={{ fontSize: '10px', letterSpacing: '0.18em' }}>
        <Calendar size={10} color="#6366f1" />
        {fmtDate(time)}
      </div>
    </div>
  );
});
LiveClock.displayName = 'LiveClock';

/* ─────────────────────────────────────────────────────────────────────────
   PageShell — DEFINED OUTSIDE the main component so its reference is
   stable across renders. If it were inside, React would treat it as a NEW
   component on every tick, unmount + remount it, causing the shake.
───────────────────────────────────────────────────────────────────────── */
const PageShell = memo(({ station, online, children }) => (
  <div
    style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      flexDirection: 'column',
      color: '#fff',
      /* Lock the viewport so nothing shifts on mobile keyboard/popup */
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      overflowY: 'auto',
    }}
  >
    {/* ── Top bar ── */}
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: '#161b22', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {station?.logoUrl
          ? <img src={station.logoUrl} alt="Logo" style={{ height: 36, width: 36, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 2 }} />
          : <div style={{ height: 36, width: 36, background: '#4f46e5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff' }}>
              {station?.restaurantName?.charAt(0) || 'H'}
            </div>
        }
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{station?.restaurantName}</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{station?.branchName} · {station?.stationName}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {online
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#34d399' }}><Wifi size={13} /><span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live</span></div>
          : <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f87171' }}><WifiOff size={13} /><span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Offline</span></div>
        }
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#21262d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 999, padding: '4px 10px' }}>
          <MapPin size={10} color="#6366f1" />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#d1d5db', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{station?.stationName}</span>
        </div>
      </div>
    </div>

    {/* ── Isolated clock — only THIS subtree re-renders every second ── */}
    <LiveClock />

    {/* ── Page content — never re-renders due to clock ── */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      {children}
    </div>

    {/* ── Footer ── */}
    <div style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.12)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', paddingBottom: 20, flexShrink: 0 }}>
      Hudi Soft Attendance System · Secure v1
    </div>
  </div>
));
PageShell.displayName = 'PageShell';

/* ─────────────────────────────────────────────────────────────────────────
   EmployeeAttendance — main state machine
───────────────────────────────────────────────────────────────────────── */
const EmployeeAttendance = () => {
  const { id: stationToken } = useParams();

  const [screen, setScreen]           = useState(SCREEN.LOADING);
  const [station, setStation]         = useState(null);
  const [employee, setEmployee]       = useState(null);
  const [identifier, setIdentifier]   = useState('');
  const [idLoading, setIdLoading]     = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [successData, setSuccessData] = useState(null);
  const [location, setLocation]       = useState(null);
  const [pinCode, setPinCode]         = useState('');
  const [pinLoading, setPinLoading]   = useState(false);
  const [online, setOnline]           = useState(navigator.onLine);

  /* Online status */
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  /* Geo location — once only */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  /* ── Load station — runs once ── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await realApi.attendance.getPublicStation(stationToken);
        if (!res.success) {
          setErrorMsg(res.message || 'QR Station is invalid or has been deactivated.');
          setScreen(SCREEN.ERROR);
          return;
        }
        setStation(res.data);
        const cached = localStorage.getItem(`att_emp_${res.data.branchId}`);
        if (cached) {
          try {
            const empObj = JSON.parse(cached);
            await refreshEmployee(empObj.id, res.data.branchId);
          } catch { setScreen(SCREEN.IDENTIFY); }
        } else {
          setScreen(SCREEN.IDENTIFY);
        }
      } catch {
        setErrorMsg('Unable to connect to attendance server. Check your internet connection.');
        setScreen(SCREEN.ERROR);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationToken]);

  /* Stable callback — no dependency on changing state */
  const refreshEmployee = useCallback(async (empId, branchId, options = {}) => {
    const { preserveScreen = false } = options;
    try {
      const res = await realApi.attendance.identifyEmployee({ identifier: empId, branchId });
      if (res.success) {
        setEmployee(res.data);
        localStorage.setItem(`att_emp_${branchId}`, JSON.stringify(res.data));
        if (!preserveScreen) {
          setScreen(res.data.hasRegisteredPasskey ? SCREEN.READY : SCREEN.REGISTER);
        }
      } else {
        localStorage.removeItem(`att_emp_${branchId}`);
        if (!preserveScreen) {
          setScreen(SCREEN.IDENTIFY);
        }
      }
    } catch {
      if (!preserveScreen) setScreen(SCREEN.IDENTIFY);
    }
  }, []);

  const handleIdentify = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setIdLoading(true);
    try {
      const res = await realApi.attendance.identifyEmployee({ identifier: identifier.trim(), branchId: station.branchId });
      if (res.success) {
        setEmployee(res.data);
        localStorage.setItem(`att_emp_${station.branchId}`, JSON.stringify(res.data));
        setScreen(res.data.hasRegisteredPasskey ? SCREEN.READY : SCREEN.REGISTER);
        toast.success(`Welcome, ${res.data.name}!`);
      } else {
        toast.error(res.message || 'Employee not found.');
      }
    } catch (err) { toast.error(err.message || 'Verification failed.'); }
    finally { setIdLoading(false); }
  };

  const handleRegisterBiometrics = async () => {
    setAuthLoading(true);
    toast.loading('Preparing biometrics...', { id: 'bio' });
    try {
      const res = await realApi.attendance.registerOptions({ employeeId: employee.id });
      if (!res.success) throw new Error(res.message);
      const { registrationSession, publicKeyOptions } = res.data;
      publicKeyOptions.challenge = base64URLToBuffer(publicKeyOptions.challenge);
      publicKeyOptions.user.id   = base64URLToBuffer(publicKeyOptions.user.id);
      const credential = await navigator.credentials.create({ publicKey: publicKeyOptions });
      if (!credential) throw new Error('Registration cancelled.');
      const payload = {
        id: credential.id, rawId: bufferToBase64URL(credential.rawId), type: credential.type,
        response: { clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON), attestationObject: bufferToBase64URL(credential.response.attestationObject) },
      };
      toast.loading('Linking with server...', { id: 'bio' });
      const verifyRes = await realApi.attendance.registerVerify({ registrationSession, credentialPayload: payload, deviceName: navigator.platform || 'Mobile Device', browser: 'Browser', os: 'Device OS' });
      if (verifyRes.success) {
        toast.success('Biometrics linked!', { id: 'bio' });
        await refreshEmployee(employee.id, station.branchId);
      } else throw new Error(verifyRes.message);
    } catch (err) { toast.error(err.message || 'Biometric setup failed.', { id: 'bio', duration: 5000 }); }
    finally { setAuthLoading(false); }
  };

  const handleBiometricCheck = async () => {
    setAuthLoading(true);
    toast.loading('Verifying biometrics...', { id: 'bio' });
    try {
      const res = await realApi.attendance.loginOptions({ employeeId: employee.id });
      if (!res.success) throw new Error(res.message);
      const { loginSession, publicKeyOptions } = res.data;
      publicKeyOptions.challenge = base64URLToBuffer(publicKeyOptions.challenge);
      if (publicKeyOptions.allowCredentials) {
        publicKeyOptions.allowCredentials = publicKeyOptions.allowCredentials.map(c => ({ ...c, id: base64URLToBuffer(c.id) }));
      }
      const assertion = await navigator.credentials.get({ publicKey: publicKeyOptions });
      if (!assertion) throw new Error('Authentication cancelled.');
      const payload = {
        id: assertion.id, rawId: bufferToBase64URL(assertion.rawId), type: assertion.type,
        response: {
          clientDataJSON:    bufferToBase64URL(assertion.response.clientDataJSON),
          authenticatorData: bufferToBase64URL(assertion.response.authenticatorData),
          signature:         bufferToBase64URL(assertion.response.signature),
          userHandle:        assertion.response.userHandle ? bufferToBase64URL(assertion.response.userHandle) : null,
        },
      };
      toast.loading('Recording attendance...', { id: 'bio' });
      const verifyRes = await realApi.attendance.loginVerify({ loginSession, assertionPayload: payload, location, deviceName: 'Device', browser: 'Browser', os: 'OS' });
      if (verifyRes.success) {
        toast.dismiss('bio');
        setSuccessData(verifyRes.data);
        setScreen(SCREEN.SUCCESS);
        await refreshEmployee(employee.id, station.branchId, { preserveScreen: true });
      } else throw new Error(verifyRes.message);
    } catch (err) { toast.error(err.message || 'Biometric check failed.', { id: 'bio' }); }
    finally { setAuthLoading(false); }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!pinCode.trim()) return;
    setPinLoading(true);
    try {
      const res = await realApi.attendance.pinFallback({ employeeId: employee.id, pin: pinCode.trim(), location, browser: 'Browser', os: 'OS' });
      if (res.success) {
        setSuccessData(res.data);
        setPinCode('');
        setScreen(SCREEN.SUCCESS);
        await refreshEmployee(employee.id, station.branchId, { preserveScreen: true });
      } else { toast.error(res.message || 'Incorrect PIN.'); }
    } catch (err) { toast.error(err.message || 'PIN verification failed.'); }
    finally { setPinLoading(false); }
  };

  const handleForgetEmployee = () => {
    if (window.confirm('Remove your profile from this device?')) {
      localStorage.removeItem(`att_emp_${station.branchId}`);
      setEmployee(null);
      setIdentifier('');
      setScreen(SCREEN.IDENTIFY);
    }
  };

  /* ════════ LOADING ════════ */
  if (screen === SCREEN.LOADING) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', border: '4px solid #1e2a4a', borderTopColor: '#6366f1', animation: 'att-spin 1s linear infinite' }} />
        <p style={{ color: '#6366f1', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Connecting to Station…</p>
        <style>{`@keyframes att-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ════════ ERROR ════════ */
  if (screen === SCREEN.ERROR) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, color: '#fff' }}>
        <div style={{ maxWidth: 360, width: '100%', background: '#161b22', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 24, padding: 32, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ShieldAlert size={36} color="#f87171" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Station Unavailable</h2>
          <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6 }}>{errorMsg}</p>
          <p style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 24 }}>Hudi Soft Attendance</p>
        </div>
      </div>
    );
  }

  /* ════════ SUCCESS ════════ */
  if (screen === SCREEN.SUCCESS && successData) {
    const isCheckIn = successData.action === 'CHECK_IN';
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, color: '#fff' }}>
        <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
            {station?.logoUrl
              ? <img src={station.logoUrl} alt="Logo" style={{ height: 32, width: 32, borderRadius: 8, objectFit: 'contain', background: '#fff', padding: 2 }} />
              : <div style={{ height: 32, width: 32, background: '#4f46e5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>{station?.restaurantName?.charAt(0) || 'H'}</div>
            }
            <span style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', opacity: 0.7 }}>{station?.restaurantName}</span>
          </div>

          {/* Icon */}
          <div style={{
            width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            background: isCheckIn ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${isCheckIn ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
          }}>
            {isCheckIn ? <CheckCircle size={50} color="#34d399" /> : <LogOut size={44} color="#fbbf24" />}
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>{isCheckIn ? 'Checked In!' : 'Checked Out!'}</h1>
          <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>
            {isCheckIn ? `Welcome back, ${employee?.name?.split(' ')[0]}.` : `See you soon, ${employee?.name?.split(' ')[0]}.`}
          </p>

          {/* Time card */}
          <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 38, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>{successData.timestamp}</div>
            <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>Recorded Time</div>
            {successData.hoursWorked !== undefined && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'left' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>Hours Today</div>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', marginTop: 2 }}>{successData.hoursWorked} hrs</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>Status</div>
                  <span style={{ display: 'inline-flex', fontSize: 11, fontWeight: 900, marginTop: 4, padding: '2px 10px', borderRadius: 999, background: successData.status === 'Overtime' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', color: successData.status === 'Overtime' ? '#34d399' : '#a5b4fc' }}>{successData.status}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setScreen(SCREEN.READY)}
            style={{ width: '100%', padding: '14px 0', background: '#21262d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  /* ════════ IDENTIFY ════════ */
  if (screen === SCREEN.IDENTIFY) {
    return (
      <PageShell station={station} online={online}>
        <div style={{ width: '100%', maxWidth: 360, animation: 'att-fadein 0.35s ease-out both' }}>
          <style>{`@keyframes att-fadein { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 72, height: 72, background: '#161b22', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <User size={34} color="#818cf8" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Verify Your Attendance</h1>
            <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6 }}>Enter your Employee ID or phone number</p>
          </div>

          <form onSubmit={handleIdentify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>Employee ID or Phone</label>
              <input
                type="text" required autoFocus
                placeholder="e.g. EMP1004 or +252…"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                style={{ width: '100%', background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit" disabled={idLoading || !identifier.trim()}
              style={{ width: '100%', padding: '14px 0', background: '#4f46e5', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: idLoading ? 'not-allowed' : 'pointer', opacity: (!identifier.trim() || idLoading) ? 0.55 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {idLoading ? <><Loader2 size={18} style={{ animation: 'att-spin 1s linear infinite' }} /> Searching…</> : <>Continue <ArrowRight size={18} /></>}
            </button>
          </form>
          <style>{`@keyframes att-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageShell>
    );
  }

  /* ════════ REGISTER ════════ */
  if (screen === SCREEN.REGISTER) {
    return (
      <PageShell station={station} online={online}>
        <div style={{ width: '100%', maxWidth: 360, textAlign: 'center', animation: 'att-fadein 0.35s ease-out both' }}>
          <style>{`@keyframes att-fadein { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } } @keyframes att-spin { to { transform: rotate(360deg); } }`}</style>

          {/* Employee card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#161b22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 14, marginBottom: 28, textAlign: 'left' }}>
            <div style={{ width: 44, height: 44, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#a5b4fc', fontSize: 18, flexShrink: 0 }}>
              {employee?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee?.name}</div>
              <div style={{ color: '#9ca3af', fontSize: 12 }}>{employee?.position}</div>
            </div>
            <button onClick={handleForgetEmployee} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><LogOut size={14} color="#6b7280" /></button>
          </div>

          <div style={{ width: 72, height: 72, background: '#161b22', border: '1px solid rgba(217,119,6,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Fingerprint size={36} color="#fbbf24" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Link Biometrics</h2>
          <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>Register your Face ID or Fingerprint once to enable fast attendance verification.</p>

          <button
            onClick={handleRegisterBiometrics} disabled={authLoading}
            style={{ width: '100%', padding: '14px 0', background: '#d97706', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: authLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}
          >
            {authLoading ? <><Loader2 size={18} style={{ animation: 'att-spin 1s linear infinite' }} /> Setting Up…</> : <><Fingerprint size={18} /> Set Up Biometrics</>}
          </button>
          <button onClick={() => setScreen(SCREEN.PIN)} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 13, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
            Skip — Use Passcode Instead
          </button>
        </div>
      </PageShell>
    );
  }

  /* ════════ READY — main fingerprint screen ════════ */
  if (screen === SCREEN.READY) {
    const isCheckOut  = employee?.currentStatus === 'Checked In';
    const accentColor = isCheckOut ? '#d97706' : '#4f46e5';
    const accentLight = isCheckOut ? '#fbbf24' : '#818cf8';
    const accentBg    = isCheckOut ? 'rgba(217,119,6,0.1)'  : 'rgba(79,70,229,0.1)';
    const accentBdr   = isCheckOut ? 'rgba(217,119,6,0.35)' : 'rgba(79,70,229,0.35)';

    return (
      <PageShell station={station} online={online}>
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'att-fadein 0.35s ease-out both' }}>
          <style>{`
            @keyframes att-fadein { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
            @keyframes att-spin   { to { transform: rotate(360deg); } }
            .att-fp-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
            .att-fp-btn:hover:not(:disabled) { transform: scale(1.04); }
            .att-fp-btn:active:not(:disabled) { transform: scale(0.94); }
          `}</style>

          {/* Employee card — static */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#161b22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 14, marginBottom: 32, width: '100%', boxSizing: 'border-box' }}>
            {employee?.photoUrl
              ? <img src={employee.photoUrl} alt={employee.name} style={{ width: 46, height: 46, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 46, height: 46, background: accentBg, border: `1px solid ${accentBdr}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: accentLight, fontSize: 18, flexShrink: 0 }}>
                  {employee?.name?.charAt(0).toUpperCase()}
                </div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee?.name}</div>
              <div style={{ color: '#9ca3af', fontSize: 12 }}>{employee?.position} · {employee?.department}</div>
              {employee?.shift && (
                <div style={{ fontSize: 10, color: accentLight, fontWeight: 700, marginTop: 2 }}>
                  Shift: {employee.shift.startTime} – {employee.shift.endTime}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: isCheckOut ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.15)', border: `1px solid ${isCheckOut ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.2)'}`, color: isCheckOut ? '#34d399' : '#9ca3af' }}>
                {employee?.currentStatus || 'Not Checked In'}
              </span>
              <button onClick={handleForgetEmployee} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                <LogOut size={12} color="#4b5563" />
              </button>
            </div>
          </div>

          {/* Heading */}
          <h1 style={{ fontSize: 24, fontWeight: 900, textAlign: 'center', marginBottom: 6 }}>
            {isCheckOut ? 'Check Out' : 'Check In'}
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginBottom: 36 }}>
            Tap the button below to verify your attendance
          </p>

          {/* ── FINGERPRINT BUTTON — stable, no infinite animations ── */}
          <button
            className="att-fp-btn"
            onClick={handleBiometricCheck}
            disabled={authLoading}
            style={{
              width: 140, height: 140, borderRadius: '50%',
              background: accentBg,
              border: `2px solid ${accentBdr}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: authLoading ? 'not-allowed' : 'pointer',
              opacity: authLoading ? 0.7 : 1,
              boxShadow: `0 0 40px ${accentColor}22, 0 8px 32px rgba(0,0,0,0.5)`,
            }}
          >
            {authLoading
              ? <Loader2 size={60} color={accentLight} style={{ animation: 'att-spin 1s linear infinite' }} />
              : <Fingerprint size={68} color={accentLight} />
            }
          </button>

          <p style={{ marginTop: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: accentLight, opacity: 0.8 }}>
            {authLoading ? 'Verifying…' : isCheckOut ? 'Tap to Check Out' : 'Tap to Check In'}
          </p>

          {/* PIN fallback */}
          <button
            onClick={() => setScreen(SCREEN.PIN)}
            style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#4b5563', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <Lock size={12} color="#4b5563" />
            Use Passcode Instead
          </button>
        </div>
      </PageShell>
    );
  }

  /* ════════ PIN FALLBACK ════════ */
  if (screen === SCREEN.PIN) {
    return (
      <PageShell station={station} online={online}>
        <div style={{ width: '100%', maxWidth: 360, animation: 'att-fadein 0.35s ease-out both' }}>
          <style>{`@keyframes att-fadein { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } } @keyframes att-spin { to { transform: rotate(360deg); } }`}</style>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 60, height: 60, background: '#161b22', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Lock size={26} color="#818cf8" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900 }}>Enter Passcode</h2>
            <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, marginTop: 6 }}>Enter your 4-digit PIN or the last 4 digits of your phone number.</p>
          </div>

          <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password" maxLength="6" required autoFocus
              placeholder="• • • •"
              value={pinCode}
              onChange={e => setPinCode(e.target.value)}
              style={{ width: '100%', textAlign: 'center', background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 0', fontFamily: 'monospace', fontWeight: 900, fontSize: 28, letterSpacing: '0.5em', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
            />
            <button
              type="submit" disabled={pinLoading || !pinCode.trim()}
              style={{ width: '100%', padding: '14px 0', background: '#4f46e5', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: (pinLoading || !pinCode.trim()) ? 0.55 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {pinLoading ? <><Loader2 size={18} style={{ animation: 'att-spin 1s linear infinite' }} /> Verifying…</> : 'Verify Attendance'}
            </button>
            <button
              type="button"
              onClick={() => setScreen(employee?.hasRegisteredPasskey ? SCREEN.READY : SCREEN.REGISTER)}
              style={{ width: '100%', padding: '12px 0', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, color: '#6b7280', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              ← Back
            </button>
          </form>
        </div>
      </PageShell>
    );
  }

  return null;
};

export default EmployeeAttendance;
