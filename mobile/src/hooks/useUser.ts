import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export interface UserProfile {
  user_id: string;
  phone_number: string;
  kyc_tier: number;
  trust_score: number;
}

export interface KycStatus {
  tier: number;
  status: 'VERIFIED' | 'PENDING';
  kyc_id: string | null;
}

export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const response = await api.get<UserProfile>('/auth/me');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useKycStatus() {
  return useQuery({
    queryKey: ['user', 'kyc'],
    queryFn: async () => {
      const response = await api.get<KycStatus>('/kyc/status');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
