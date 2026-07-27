/**
 * Escrow API — create, get, deposit, ship, confirm, cancel
 * See for_agents/07-Escrow-Lifecycle.md, 18-API-Reference.md §2 Escrow
 */
import { api } from './client';
import type {
  CreateEscrowRequest,
  CreateEscrowResponse,
  EscrowTransaction,
  DepositRequest,
  DepositResponse,
  ShipResponse,
} from '../types/api';

export async function createEscrow(body: CreateEscrowRequest): Promise<CreateEscrowResponse> {
  const { data } = await api.post<CreateEscrowResponse>('/escrow', body);
  return data;
}

export async function listEscrows(): Promise<EscrowTransaction[]> {
  const { data } = await api.get<EscrowTransaction[]>('/escrow');
  return data;
}

export async function getEscrow(id: string): Promise<EscrowTransaction> {
  const { data } = await api.get<EscrowTransaction>(`/escrow/${id}`);
  return data;
}

export async function deposit(
  id: string,
  body: DepositRequest,
): Promise<DepositResponse> {
  const { data } = await api.post<DepositResponse>(`/escrow/${id}/deposit`, body);
  return data;
}

export async function shipEscrow(id: string): Promise<ShipResponse> {
  const { data } = await api.post<ShipResponse>(`/escrow/${id}/ship`);
  return data;
}

export async function confirmDelivery(id: string): Promise<ShipResponse> {
  const { data } = await api.post<ShipResponse>(`/escrow/${id}/confirm-delivery`);
  return data;
}

export async function cancelEscrow(id: string): Promise<ShipResponse> {
  const { data } = await api.post<ShipResponse>(`/escrow/${id}/cancel`);
  return data;
}
