import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, createClient, fetchClient, fetchClients } from "./api";
import type { CreateClientInput } from "./types";

export function useClients(search: string) {
  return useQuery({
    queryKey: ["clients", search],
    queryFn: () => fetchClients(search),
  });
}

export function useClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ["clients", clientId],
    queryFn: () => fetchClient(clientId!),
    enabled: !!clientId,
    retry: (count, error) => {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return false;
      return count < 1;
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => createClient(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
