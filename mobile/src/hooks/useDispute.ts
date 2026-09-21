import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { openDispute, getDisputeStatus } from '../api/disputes';
import type { OpenDisputeRequest } from '../types/api';

export function useOpenDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: OpenDisputeRequest) => openDispute(req),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['escrow', variables.transaction_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['dispute', variables.transaction_id],
      });
    },
  });
}

export function useDisputeStatus(transactionId: string) {
  return useQuery({
    queryKey: ['dispute', transactionId],
    queryFn: () => getDisputeStatus(transactionId),
    enabled: !!transactionId,
    staleTime: 30_000,
  });
}
