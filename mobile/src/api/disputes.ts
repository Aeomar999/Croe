/**
 * Disputes API — open dispute, check status
 * See for_agents/13-Disputes-and-AI-Triage.md, 18-API-Reference.md §2 Disputes
 */
import { api } from './client';
import type {
  OpenDisputeRequest,
  OpenDisputeResponse,
  DisputeStatusResponse,
} from '../types/api';

export async function openDispute(body: OpenDisputeRequest): Promise<OpenDisputeResponse> {
  const { data } = await api.post<OpenDisputeResponse>('/disputes', body);
  return data;
}

export async function getDisputeStatus(id: string): Promise<DisputeStatusResponse> {
  const { data } = await api.get<DisputeStatusResponse>(`/disputes/${id}/status`);
  return data;
}
