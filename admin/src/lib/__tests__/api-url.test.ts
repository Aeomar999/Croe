import { describe, it, expect } from 'vitest';
import { resolveApiOrigin } from '../api-url';

describe('resolveApiOrigin', () => {
  it('keeps a host-only URL as is', () => {
    expect(resolveApiOrigin('https://api.croe.co')).toBe('https://api.croe.co');
  });

  it('strips a trailing /v1 so requests never go to /v1/v1', () => {
    expect(resolveApiOrigin('https://api.croe.co/v1')).toBe('https://api.croe.co');
    expect(resolveApiOrigin('https://api.croe.co/v1/')).toBe('https://api.croe.co');
  });

  it('strips trailing slashes', () => {
    expect(resolveApiOrigin('http://localhost:8080/')).toBe('http://localhost:8080');
  });

  it('defaults to the local backend on port 8080', () => {
    expect(resolveApiOrigin(undefined)).toBe('http://localhost:8080');
    expect(resolveApiOrigin('  ')).toBe('http://localhost:8080');
  });
});
