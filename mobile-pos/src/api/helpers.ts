/** Normalize HUDI POS online API responses (`{ success, data }` wrapper). */
export function unwrapData<T = unknown>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    return payload as T;
  }

  const body = payload as Record<string, unknown>;

  if ('data' in body && body.data !== undefined) {
    return body.data as T;
  }

  return payload as T;
}

export function unwrapList<T>(
  payload: unknown,
  key: string
): T[] {
  const data = unwrapData<Record<string, unknown> | T[]>(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && key in data) {
    const nested = (data as Record<string, unknown>)[key];
    return Array.isArray(nested) ? (nested as T[]) : [];
  }

  return [];
}
