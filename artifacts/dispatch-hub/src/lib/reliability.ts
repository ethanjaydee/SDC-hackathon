import type { QueryClientConfig } from '@tanstack/react-query';

type HttpError = { status?: number; headers?: Headers };
export function retryAfterMs(error: unknown, now = Date.now()): number {
  const value = (error as HttpError | null)?.headers?.get('retry-after');
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}
export function retryDelay(attempt: number, error: unknown): number {
  return Math.max(retryAfterMs(error), Math.min(60_000, 1000 * 2 ** Math.min(attempt, 6)));
}
export function shouldRetry(failures: number, error: unknown): boolean {
  const status = (error as HttpError | null)?.status;
  return failures < 3 && (!status || status === 429 || status >= 500);
}
export function canAutoRefresh(query: { state: { error: unknown; errorUpdatedAt: number } }, now = Date.now()): boolean {
  if ((query.state.error as HttpError | null)?.status !== 429) return true;
  return now >= query.state.errorUpdatedAt + retryAfterMs(query.state.error, query.state.errorUpdatedAt);
}
export function pollInterval(base = 10_000) {
  return (query: { state: { fetchStatus: string; error: unknown; fetchFailureCount: number } }): number | false => {
    // Never let polling bypass a pending retry/Retry-After delay.
    if (query.state.fetchStatus === 'fetching') return false;
    if (!query.state.error) return base;
    return Math.max(base, retryDelay(query.state.fetchFailureCount, query.state.error));
  };
}
export function isOfferStale(checkedAt: string, flagged = false, now = Date.now()): boolean {
  const timestamp = Date.parse(checkedAt);
  return flagged || !Number.isFinite(timestamp) || timestamp > now + 60_000 || now - timestamp > 86_400_000;
}
export const queryDefaults: NonNullable<QueryClientConfig['defaultOptions']> = {
  queries: {
    retry: shouldRetry,
    retryDelay,
    staleTime: 5000,
    refetchOnReconnect: canAutoRefresh,
    refetchOnWindowFocus: canAutoRefresh,
  },
  // Retrying a write can repeat an action whose response was lost.
  mutations: { retry: false },
};
