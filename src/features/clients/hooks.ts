import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, createClient, fetchClient, fetchClients } from "./api";
import type { ClientListFilter, CreateClientInput } from "./types";

export function useClients(
  search: string,
  opts?: { ownerId?: string; clientFilter?: ClientListFilter },
) {
  return useQuery({
    queryKey: ["clients", search, opts?.ownerId ?? "", opts?.clientFilter ?? ""],
    queryFn: () => fetchClients(search, opts),
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
