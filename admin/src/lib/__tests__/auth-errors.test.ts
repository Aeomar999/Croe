import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { loginErrorMessage } from '../auth-errors';

function httpError(status: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: '', headers: {}, config, data: {} } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, response);
}

describe('loginErrorMessage', () => {
  it('explains a credentials mismatch without backend codes', () => {
    const message = loginErrorMessage(httpError(401));
    expect(message).toMatch(/don't match our records/);
    expect(message).not.toMatch(/401|INVALID|status code/);
  });

  it('asks the user to wait when rate limited', () => {
    expect(loginErrorMessage(httpError(429))).toMatch(/wait a few minutes/);
  });

  it('reports a network failure when the backend is unreachable', () => {
    const offline = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(loginErrorMessage(offline)).toMatch(/couldn't reach/);
  });

  it('falls back to a generic message for server errors and unknown errors', () => {
    expect(loginErrorMessage(httpError(500))).toMatch(/unavailable right now/);
    expect(loginErrorMessage(new Error('boom'))).toMatch(/unavailable right now/);
  });
});
