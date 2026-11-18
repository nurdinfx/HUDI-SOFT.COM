import React, { useState, useEffect, useCallback, memo } from 'react';
import { X, Download } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   iOS Safari Share icon — exact SVG replica of the iOS share button
───────────────────────────────────────────────────────────────────────── */
const IOSShareIcon = ({ size = 28, color = '#007AFF' }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2L14 18" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M9 7L14 2L19 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 12H5C4.44772 12 4 12.4477 4 13V24C4 24.5523 4.44772 25 5 25H23C23.5523 25 24 24.5523 24 24V13C24 12.4477 23.5523 12 23 12H22" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────
   AddToHomeScreen icon
───────────────────────────────────────────────────────────────────────── */
const AddHomeIcon = ({ size = 28, color = '#007AFF' }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="22" height="22" rx="5" stroke={color} strokeWidth="2"/>
    <path d="M14 9V19M9 14H19" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────
   Step illustrations — inline SVG scenes (no external assets needed)
───────────────────────────────────────────────────────────────────────── */
const StepIllustration = memo(({ step, isDark }) => {
  const bg      = isDark ? '#1c1c1e' : '#f2f2f7';
  const border  = isDark ? '#3a3a3c' : '#d1d1d6';
  const accent  = '#007AFF';
  const text    = isDark ? '#fff'    : '#000';
  const subtext = isDark ? '#8e8e93' : '#6b7280';

  if (step === 1) {
    // Phone with Safari toolbar + Share button highlighted
    return (
      <svg width="220" height="160" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Phone body */}
        <rect x="30" y="8" width="160" height="144" rx="16" fill={bg} stroke={border} strokeWidth="1.5"/>
        {/* Status bar */}
        <rect x="30" y="8" width="160" height="24" rx="16" fill={isDark ? '#2c2c2e' : '#e5e5ea'}/>
        <rect x="30" y="20" width="160" height="12" fill={isDark ? '#2c2c2e' : '#e5e5ea'}/>
        {/* Address bar */}
        <rect x="44" y="36" width="110" height="18" rx="9" fill={isDark ? '#3a3a3c' : '#e5e5ea'}/>
        <text x="64" y="49" fontSize="8" fill={subtext} fontFamily="system-ui">hudi-soft-pos.online</text>
        {/* Web content area */}
        <rect x="44" y="62" width="132" height="60" rx="6" fill={isDark ? '#2c2c2e' : '#fff'}/>
        <rect x="52" y="70" width="60" height="8" rx="4" fill={isDark ? '#48484a' : '#d1d1d6'}/>
        <rect x="52" y="84" width="90" height="5" rx="2.5" fill={isDark ? '#3a3a3c' : '#e5e5ea'}/>
        <rect x="52" y="94" width="70" height="5" rx="2.5" fill={isDark ? '#3a3a3c' : '#e5e5ea'}/>
        {/* Safari bottom toolbar */}
        <rect x="30" y="126" width="160" height="26" rx="0" fill={isDark ? '#1c1c1e' : '#f9f9f9'} stroke={border} strokeWidth="0.75"/>
        <rect x="30" y="124" width="160" height="2" fill={border}/>
        {/* Share button — highlighted */}
        <rect x="96" y="128" width="28" height="22" rx="6" fill={accent} opacity="0.15"/>
        <g transform="translate(102, 131)">
          <IOSShareIcon size={16} color={accent}/>
        </g>
        {/* Tap hint pulse ring */}
        <circle cx="110" cy="139" r="14" stroke={accent} strokeWidth="1.5" opacity="0.5" strokeDasharray="4 2"/>
        <text x="100" y="155" fontSize="7.5" fill={accent} fontFamily="system-ui" fontWeight="600" textAnchor="middle">Tap Share</text>
      </svg>
    );
  }

  if (step === 2) {
    // Share sheet sliding up with "Add to Home Screen" row highlighted
    return (
      <svg width="220" height="160" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Phone body */}
        <rect x="30" y="8" width="160" height="144" rx="16" fill={bg} stroke={border} strokeWidth="1.5"/>
        {/* Dimmed content */}
        <rect x="30" y="8" width="160" height="144" rx="16" fill="rgba(0,0,0,0.35)"/>
        {/* Share sheet */}
        <rect x="30" y="60" width="160" height="92" rx="16" fill={isDark ? '#2c2c2e' : '#fff'}/>
        {/* AirDrop / row icons */}
        <rect x="44" y="70" width="30" height="30" rx="10" fill={isDark ? '#3a3a3c' : '#e5e5ea'}/>
        <rect x="80" y="70" width="30" height="30" rx="10" fill={isDark ? '#3a3a3c' : '#e5e5ea'}/>
        <rect x="116" y="70" width="30" height="30" rx="10" fill={isDark ? '#3a3a3c' : '#e5e5ea'}/>
        <rect x="152" y="70" width="30" height="30" rx="10" fill={isDark ? '#3a3a3c' : '#e5e5ea'}/>
        {/* Divider */}
        <rect x="44" y="107" width="132" height="0.75" fill={border}/>
        {/* Add to Home Screen row — highlighted */}
        <rect x="36" y="110" width="148" height="26" rx="8" fill={accent} opacity="0.12"/>
        <g transform="translate(44, 117)">
          <AddHomeIcon size={14} color={accent}/>
        </g>
        <text x="64" y="127" fontSize="10" fill={accent} fontFamily="system-ui" fontWeight="700">Add to Home Screen</text>
        {/* Arrow indicator */}
        <path d="M178 123L185 123" stroke={accent} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M182 120L185 123L182 126" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Divider */}
        <rect x="44" y="138" width="132" height="0.75" fill={border}/>
        <rect x="44" y="142" width="90" height="6" rx="3" fill={isDark ? '#3a3a3c' : '#e5e5ea'}/>
      </svg>
    );
  }

  // Step 3 — Add dialog top-right
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Phone body */}
      <rect x="30" y="8" width="160" height="144" rx="16" fill={bg} stroke={border} strokeWidth="1.5"/>
      {/* Status bar */}
      <rect x="30" y="8" width="160" height="24" rx="16" fill={isDark ? '#2c2c2e' : '#e5e5ea'}/>
      <rect x="30" y="20" width="160" height="12" fill={isDark ? '#2c2c2e' : '#e5e5ea'}/>
      {/* Cancel / Add bar */}
      <rect x="30" y="32" width="160" height="28" fill={isDark ? '#1c1c1e' : '#f9f9f9'} stroke={border} strokeWidth="0.5"/>
      <text x="48" y="50" fontSize="10" fill={accent} fontFamily="system-ui">Cancel</text>
      <text x="110" y="50" fontSize="11" fill={text} fontFamily="system-ui" fontWeight="700" textAnchor="middle">Add to Home Screen</text>
      {/* Add button — highlighted */}
      <rect x="158" y="38" width="28" height="18" rx="6" fill={accent}/>
      <text x="172" y="50" fontSize="10" fill="#fff" fontFamily="system-ui" fontWeight="700" textAnchor="middle">Add</text>
      {/* App icon preview */}
      <rect x="80" y="72" width="60" height="60" rx="14" fill={accent}/>
      <text x="110" y="107" fontSize="22" textAnchor="middle">🏪</text>
      <text x="110" y="148" fontSize="9" fill={subtext} fontFamily="system-ui" textAnchor="middle">HUDI POS</text>
      {/* Tap hint on Add */}
      <circle cx="172" cy="47" r="14" stroke={accent} strokeWidth="1.5" opacity="0.5" strokeDasharray="4 2"/>
    </svg>
  );
});
StepIllustration.displayName = 'StepIllustration';

/* ─────────────────────────────────────────────────────────────────────────
   Step dot indicator
───────────────────────────────────────────────────────────────────────── */
const StepDots = memo(({ current, total, isDark }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: i === current ? 20 : 7,
          height: 7,
          borderRadius: 999,
          background: i === current ? '#007AFF' : (isDark ? '#48484a' : '#d1d1d6'),
          transition: 'all 0.3s ease',
        }}
      />
    ))}
  </div>
));
StepDots.displayName = 'StepDots';

/* ─────────────────────────────────────────────────────────────────────────
   Main component — PwaInstallPrompt
───────────────────────────────────────────────────────────────────────── */
const PwaInstallPrompt = () => {
  const [visible, setVisible]         = useState(false);
  const [isIOS, setIsIOS]             = useState(false);
  const [isDark, setIsDark]           = useState(false);
  const [step, setStep]               = useState(0);           // 0-2 for iOS steps
  const [deferredPrompt, setDeferred] = useState(null);         // Android prompt
  const [androidVisible, setAndroid]  = useState(false);

  useEffect(() => {
    /* ── Dark mode detection ── */
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const onDark = (e) => setIsDark(e.matches);
    mq.addEventListener('change', onDark);

    /* ── Already installed? ── */
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    /* ── Already completed? ── */
    const done = localStorage.getItem('ios_pwa_installed');
    if (done === 'true') return;

    const dismissed = localStorage.getItem('ios_pwa_dismissed');
    if (dismissed) {
      const days = (Date.now() - parseInt(dismissed, 10)) / 86400000;
      if (days < 3) return; // re-show after 3 days
    }

    /* ── iOS detection ── */
    const ua = navigator.userAgent.toLowerCase();
    const ios =
      /iphone|ipad|ipod/.test(ua) ||
      (ua.includes('mac') && 'ontouchend' in document);

    if (ios) {
      setIsIOS(true);
      // Small delay so the page is fully loaded before showing modal
      const t = setTimeout(() => setVisible(true), 1500);
      return () => {
        clearTimeout(t);
        mq.removeEventListener('change', onDark);
      };
    }

    /* ── Android / Chrome native prompt ── */
    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      mq.removeEventListener('change', onDark);
    };
  }, []);

  /* ── iOS: next / done ── */
  const handleNext = useCallback(() => {
    if (step < 2) {
      setStep(s => s + 1);
    } else {
      handleDone();
    }
  }, [step]);

  const handleDone = useCallback(() => {
    localStorage.setItem('ios_pwa_installed', 'true');
    setVisible(false);
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem('ios_pwa_dismissed', Date.now().toString());
    setVisible(false);
    setAndroid(false);
  }, []);

  /* ── Android: trigger install ── */
  const handleAndroidInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('ios_pwa_installed', 'true');
    }
    setDeferred(null);
    setAndroid(false);
  }, [deferredPrompt]);

  /* ── Theming ── */
  const bg      = isDark ? '#1c1c1e' : '#ffffff';
  const surface = isDark ? '#2c2c2e' : '#f2f2f7';
  const text     = isDark ? '#ffffff' : '#000000';
  const subtext  = isDark ? '#aeaeb2' : '#6b7280';
  const border   = isDark ? '#3a3a3c' : '#e5e7eb';
  const accent   = '#007AFF';

  const steps = [
    {
      number: '1',
      title: 'Tap the Share button',
      description: 'Open this page in Safari and tap the Share icon at the bottom of your screen.',
      icon: <IOSShareIcon size={20} color={accent} />,
    },
    {
      number: '2',
      title: 'Select "Add to Home Screen"',
      description: 'Scroll down in the share sheet and tap "Add to Home Screen".',
      icon: <AddHomeIcon size={20} color={accent} />,
    },
    {
      number: '3',
      title: 'Tap "Add" to confirm',
      description: 'Tap the "Add" button in the top-right corner. HUDI POS will appear on your home screen.',
      icon: <span style={{ fontSize: 20 }}>✓</span>,
    },
  ];

  /* ════════════════════════════════════════════════
     iOS Full-Screen Modal
  ════════════════════════════════════════════════ */
  if (isIOS && visible) {
    return (
      <>
        <style>{`
          @keyframes ios-slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          @keyframes ios-fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes ios-step-in {
            from { opacity: 0; transform: translateX(24px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          .ios-btn-primary {
            background: #007AFF;
            color: #fff;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 700;
            padding: 15px 0;
            width: 100%;
            cursor: pointer;
            transition: opacity 0.15s;
          }
          .ios-btn-primary:active { opacity: 0.75; }
          .ios-btn-ghost {
            background: none;
            border: none;
            color: #007AFF;
            font-size: 15px;
            font-weight: 600;
            padding: 12px 0;
            cursor: pointer;
            width: 100%;
          }
        `}</style>

        {/* Backdrop */}
        <div
          onClick={handleDismiss}
          style={{
            position: 'fixed', inset: 0, zIndex: 99998,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            animation: 'ios-fade-in 0.25s ease',
          }}
        />

        {/* Bottom sheet modal */}
        <div
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            zIndex: 99999,
            background: bg,
            borderRadius: '24px 24px 0 0',
            padding: '0 0 env(safe-area-inset-bottom, 20px)',
            boxShadow: '0 -8px 48px rgba(0,0,0,0.25)',
            animation: 'ios-slide-up 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
            maxHeight: '92vh',
            overflowY: 'auto',
          }}
        >
          {/* Handle bar */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: isDark ? '#48484a' : '#d1d1d6' }} />
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute', top: 14, right: 16,
              background: isDark ? '#3a3a3c' : '#e5e7eb',
              border: 'none', borderRadius: '50%',
              width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} color={subtext} />
          </button>

          {/* Header */}
          <div style={{ textAlign: 'center', padding: '16px 24px 0' }}>
            {/* App icon */}
            <div style={{
              width: 72, height: 72, borderRadius: 16,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
              fontSize: 36,
            }}>
              🏪
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: text, margin: '0 0 4px', fontFamily: 'system-ui' }}>
              Install HUDI POS
            </h2>
            <p style={{ fontSize: 14, color: subtext, margin: '0 0 20px', fontFamily: 'system-ui', lineHeight: 1.5 }}>
              Add to your Home Screen for the best experience — full screen, offline-ready, no browser.
            </p>

            {/* Step indicator pills */}
            <div style={{
              display: 'inline-flex', gap: 6,
              background: surface,
              borderRadius: 999,
              padding: '4px 12px',
              marginBottom: 20,
            }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%',
                    background: i === step ? accent : 'transparent',
                    color: i === step ? '#fff' : (i < step ? accent : subtext),
                    fontSize: 12, fontWeight: 800,
                    border: i < step ? `2px solid ${accent}` : '2px solid transparent',
                    transition: 'all 0.25s ease',
                    fontFamily: 'system-ui',
                  }}
                >
                  {i < step ? '✓' : i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div
            key={step}
            style={{
              padding: '0 24px',
              animation: 'ios-step-in 0.3s ease both',
            }}
          >
            {/* Illustration */}
            <div style={{
              background: surface,
              borderRadius: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px 0',
              marginBottom: 20,
              border: `1px solid ${border}`,
              overflow: 'hidden',
            }}>
              <StepIllustration step={step + 1} isDark={isDark} />
            </div>

            {/* Step label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0,
                fontFamily: 'system-ui',
              }}>
                {steps[step].number}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: text, margin: 0, fontFamily: 'system-ui' }}>
                {steps[step].title}
              </h3>
            </div>
            <p style={{ fontSize: 14, color: subtext, lineHeight: 1.6, margin: '0 0 20px', fontFamily: 'system-ui' }}>
              {steps[step].description}
            </p>

            {/* Share icon callout on step 1 */}
            {step === 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.08)',
                border: `1px solid rgba(0,122,255,0.25)`,
                borderRadius: 12, padding: '10px 14px', marginBottom: 20,
              }}>
                <IOSShareIcon size={22} color={accent} />
                <span style={{ fontSize: 13, color: accent, fontWeight: 600, fontFamily: 'system-ui' }}>
                  This is the Share button — look for it in the Safari toolbar at the bottom of your screen.
                </span>
              </div>
            )}

            {/* Add to Home Screen callout on step 2 */}
            {step === 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.08)',
                border: `1px solid rgba(0,122,255,0.25)`,
                borderRadius: 12, padding: '10px 14px', marginBottom: 20,
              }}>
                <AddHomeIcon size={22} color={accent} />
                <span style={{ fontSize: 13, color: accent, fontWeight: 600, fontFamily: 'system-ui' }}>
                  "Add to Home Screen" is in the share sheet — you may need to scroll down to find it.
                </span>
              </div>
            )}

            {/* Dot progress */}
            <div style={{ marginBottom: 16 }}>
              <StepDots current={step} total={3} isDark={isDark} />
            </div>

            {/* Actions */}
            <button className="ios-btn-primary" onClick={handleNext}>
              {step < 2 ? 'Next →' : "I've Added It — Done!"}
            </button>
            <button className="ios-btn-ghost" onClick={handleDismiss}>
              Remind me later
            </button>
          </div>
          {/* Bottom safe area spacer */}
          <div style={{ height: 12 }} />
        </div>
      </>
    );
  }

  /* ════════════════════════════════════════════════
     Android / Desktop: small bottom-right banner
  ════════════════════════════════════════════════ */
  if (!isIOS && androidVisible) {
    return (
      <>
        <style>{`
          @keyframes and-slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          .and-install-btn {
            background: #007AFF; color: #fff;
            border: none; border-radius: 12px;
            font-size: 14px; font-weight: 700;
            padding: 10px 18px; cursor: pointer;
            transition: opacity 0.15s;
            white-space: nowrap;
          }
          .and-install-btn:active { opacity: 0.75; }
        `}</style>
        <div style={{
          position: 'fixed', bottom: 24, right: 16,
          zIndex: 99999,
          background: isDark ? '#1c1c1e' : '#fff',
          border: `1px solid ${border}`,
          borderRadius: 20,
          padding: 16,
          width: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          animation: 'and-slide-up 0.3s ease',
          fontFamily: 'system-ui',
        }}>
          <button
            onClick={handleDismiss}
            style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} color={subtext} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingRight: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>🏪</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: text }}>Install HUDI POS</div>
              <div style={{ fontSize: 12, color: subtext, marginTop: 2 }}>
                Add to home screen for the full experience
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDismiss}
              style={{
                flex: 1, background: surface, border: `1px solid ${border}`,
                borderRadius: 12, fontSize: 14, fontWeight: 600, color: subtext,
                padding: '10px 0', cursor: 'pointer',
              }}
            >
              Later
            </button>
            <button className="and-install-btn" onClick={handleAndroidInstall}>
              <Download size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Install
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
};

export default PwaInstallPrompt;
