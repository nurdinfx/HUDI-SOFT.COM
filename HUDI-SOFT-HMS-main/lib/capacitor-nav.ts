import { isNativeCapacitor } from './capacitor-platform';

function buildHref(path: string): string {
    const raw = path.startsWith('/') ? path : `/${path}`;
    const qIndex = raw.indexOf('?');
    const pathname = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    const search = qIndex >= 0 ? raw.slice(qIndex) : '';
    const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;
    return isNativeCapacitor() ? `${withSlash}${search}` : `${pathname}${search}`;
}

/** Navigate without adding history entries (no back-button loops on APK). */
export function navigateTo(path: string, replace = true) {
    if (typeof window === 'undefined') return;
    const href = buildHref(path);
    if (replace) {
        window.location.replace(href);
    } else {
        window.location.href = href;
    }
}

export function goToLoginPage() {
    navigateTo('/login?redirect=/dashboard');
}

export function goToDashboard() {
    navigateTo('/dashboard');
}
