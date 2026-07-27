/**
 * KYC API — submit documents, check status
 * See for_agents/09-KYC-and-AML.md, 18-API-Reference.md §2 KYC
 */
import { api } from './client';
import type { KycIdType, SubmitKycResponse, KycStatusResponse } from '../types/api';

export async function submitKyc(
  idType: KycIdType,
  imageUri: string,
): Promise<SubmitKycResponse> {
  const formData = new FormData();

  const filename = imageUri.split('/').pop() ?? 'id.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('id_image', {
    uri: imageUri,
    name: filename,
    type,
  } as unknown as Blob);
  formData.append('id_type', idType);

  const { data } = await api.post<SubmitKycResponse>('/kyc/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

export async function getKycStatus(): Promise<KycStatusResponse> {
  const { data } = await api.get<KycStatusResponse>('/kyc/status');
  return data;
}
