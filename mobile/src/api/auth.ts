/**
 * Auth API — phone → OTP → session
 * See for_agents/08-Identity-Auth.md, 18-API-Reference.md §2 Auth
 */
import { api } from './client';
import type { OTPRequestResponse, TokenPair, MeResponse } from '../types/api';

export async function requestOTP(phoneNumber: string): Promise<OTPRequestResponse> {
  const { data } = await api.post<OTPRequestResponse>('/auth/otp/request', {
    phone_number: phoneNumber,
  });
  return data;
}

export async function verifyOTP(
  phoneNumber: string,
  code: string,
): Promise<TokenPair> {
  const { data } = await api.post<TokenPair>('/auth/otp/verify', {
    phone_number: phoneNumber,
    code,
  });
  return data;
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const { data } = await api.post<TokenPair>('/auth/refresh', {
    refresh_token: refreshToken,
  });
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/auth/me');
  return data;
}
