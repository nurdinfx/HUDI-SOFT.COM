/**
 * HMS API HTTP layer — Capacitor uses Render backend (not https://localhost/api).
 */

import { isNativeCapacitor } from './capacitor-platform';

const DEFAULT_HMS_ORIGIN = 'https://hudi-soft-hms.onrender.com';
const TIMEOUT_MS = 20000;

export function getHmsApiBase(): string {
    const fromEnv = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
    if (fromEnv) return `${fromEnv}/api`;
    if (typeof window !== 'undefined' && isNativeCapacitor()) {
        return `${DEFAULT_HMS_ORIGIN}/api`;
    }
    return '/api';
}

type HmsRequestOptions = {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Hospital server timed out')), ms);
        promise
            .then((v) => {
                clearTimeout(timer);
                resolve(v);
            })
            .catch((e) => {
                clearTimeout(timer);
                reject(e);
            });
    });
}

async function requestViaCapacitorHttp<T>(
    url: string,
    options: HmsRequestOptions
): Promise<{ status: number; data: T }> {
    const { CapacitorHttp } = await import('@capacitor/core');
    const response = await CapacitorHttp.request({
        method: options.method || 'GET',
        url,
        headers: {
            Accept: 'application/json',
            ...options.headers,
        },
        data: options.body,
        connectTimeout: TIMEOUT_MS,
        readTimeout: TIMEOUT_MS,
    });

    let data: T;
    if (typeof response.data === 'string') {
        try {
            data = JSON.parse(response.data) as T;
        } catch {
            throw new Error('Invalid response from hospital server');
        }
    } else {
        data = response.data as T;
    }

    return { status: response.status, data };
}

async function requestViaFetch<T>(
    url: string,
    options: HmsRequestOptions
): Promise<{ status: number; data: T }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            method: options.method || 'GET',
            headers: options.headers,
            body:
                options.body !== undefined && options.body !== null
                    ? typeof options.body === 'string'
                        ? options.body
                        : JSON.stringify(options.body)
                    : undefined,
            signal: controller.signal,
        });

        const data = (await res.json().catch(() => ({}))) as T;
        return { status: res.status, data };
    } finally {
        clearTimeout(timer);
    }
}

export class HmsApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

async function sendRequest<T>(url: string, options: HmsRequestOptions): Promise<{ status: number; data: T }> {
    if (isNativeCapacitor()) {
        try {
            return await requestViaFetch<T>(url, options);
        } catch {
            return requestViaCapacitorHttp<T>(url, options);
        }
    }
    return requestViaFetch<T>(url, options);
}

export async function hmsRequest<T>(path: string, options: HmsRequestOptions = {}): Promise<T> {
    const url = `${getHmsApiBase()}${path}`;

    const { status, data } = await withTimeout(sendRequest<T>(url, options), TIMEOUT_MS + 2000);

    if (status < 200 || status >= 300) {
        const err = data as { error?: string; message?: string };
        throw new HmsApiError(err.error || err.message || `Request failed: ${status}`, status);
    }

    return data;
}
