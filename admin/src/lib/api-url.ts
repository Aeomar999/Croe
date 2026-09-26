/**
 * Normalizes NEXT_PUBLIC_API_URL to the API origin (scheme + host, no path).
 * The client appends `/v1` itself, so a configured `/v1` suffix or trailing
 * slash is stripped instead of producing `/v1/v1/...` 404s (task.md T3.4).
 */
export function resolveApiOrigin(raw: string | undefined): string {
  const value = (raw ?? '').trim() || 'http://localhost:8080';
  return value.replace(/\/+$/, '').replace(/\/v1$/, '');
}
