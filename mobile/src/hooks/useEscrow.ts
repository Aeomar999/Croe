import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createEscrow,
  listEscrows,
  getEscrow,
  deposit,
  shipEscrow,
  confirmDelivery,
  cancelEscrow,
} from '../api/escrow';
import type { CreateEscrowRequest, DepositRequest } from '../types/api';

export function useEscrow(transactionId: string) {
  return useQuery({
    queryKey: ['escrow', transactionId],
    queryFn: () => getEscrow(transactionId),
    enabled: !!transactionId,
    staleTime: 30_000,
  });
}

export function useEscrowList() {
  return useQuery({
    queryKey: ['escrow', 'list'],
    queryFn: listEscrows,
    staleTime: 30_000,
  });
}

export function useCreateEscrow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateEscrowRequest) => createEscrow(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow', 'list'] });
    },
  });
}

export function useDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      req,
    }: {
      transactionId: string;
      req: DepositRequest;
    }) => deposit(transactionId, req),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['escrow', variables.transactionId],
      });
    },
  });
}

export function useShip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) => shipEscrow(transactionId),
    onSuccess: (_, transactionId) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', transactionId] });
    },
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) => confirmDelivery(transactionId),
    onSuccess: (_, transactionId) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', transactionId] });
    },
  });
}

export function useCancelEscrow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) => cancelEscrow(transactionId),
    onSuccess: (_, transactionId) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['escrow', 'list'] });
    },
  });
}
