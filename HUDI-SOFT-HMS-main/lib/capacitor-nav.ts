import { isNativeCapacitor } from './capacitor-platform';

function buildHref(path: string): string {
    const raw = path.startsWith('/') ? path : `/${path}`;
    const qIndex = raw.indexOf('?');
    const pathname = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    const search = qIndex >= 0 ? raw.slice(qIndex) : '';

    if (isNativeCapacitor()) {
        // Static export: each route is a folder with index.html
        const clean = pathname.replace(/\/$/, '') || '/';
        return clean === '/' ? `/index.html${search}` : `${clean}/index.html${search}`;
    }

    const withSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;
    return `${withSlash}${search}`;
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
