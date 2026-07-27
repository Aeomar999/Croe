/**
 * Evidence API — upload files for disputes
 * See for_agents/14-Evidence-and-Forensics.md, 18-API-Reference.md §2 Evidence
 */
import * as FileSystem from 'expo-file-system';
import { api } from './client';
import type { UploadEvidenceResponse, ArtifactType } from '../types/api';

export async function uploadEvidence(
  transactionId: string,
  fileUri: string,
  artifactType: ArtifactType,
): Promise<UploadEvidenceResponse> {
  const formData = new FormData();

  const filename = fileUri.split('/').pop() ?? 'upload.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: fileUri,
    name: filename,
    type,
  } as unknown as Blob);
  formData.append('transaction_id', transactionId);
  formData.append('artifact_type', artifactType);

  const { data } = await api.post<UploadEvidenceResponse>('/evidence/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000, // longer for uploads
  });

  return data;
}
