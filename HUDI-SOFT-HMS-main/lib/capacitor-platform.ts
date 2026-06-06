export function isNativeCapacitor(): boolean {
    if (typeof window === 'undefined') return false;
    const cap = (window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    }).Capacitor;
    if (!cap) return false;
    if (cap.isNativePlatform?.()) return true;
    const platform = cap.getPlatform?.();
    return platform === 'android' || platform === 'ios';
}
