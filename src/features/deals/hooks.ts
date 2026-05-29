import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { subscribeToDeals } from "@/lib/realtime";
import {
  createDeal,
  fetchDeal,
  fetchDeals,
  patchDealOwner,
  patchDealStage,
  postDealNote,
} from "./api";
import type { CreateDealInput } from "./types";
import type { DealStage } from "./constants";

export function useDeals(params?: {
  stage?: string;
  ownerId?: string;
  clientId?: string;
  q?: string;
}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["deals", params],
    queryFn: () => fetchDeals(params),
  });

  useEffect(() => {
    const sub = subscribeToDeals(() => {
      void qc.invalidateQueries({ queryKey: ["deals"] });
    });
    return () => sub.unsubscribe();
  }, [qc]);

  return query;
}

export function useDeal(dealId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["deals", "detail", dealId],
    queryFn: () => fetchDeal(dealId!),
    enabled: !!dealId,
  });

  useEffect(() => {
    if (!dealId) return;
    const sub = subscribeToDeals(() => {
      void qc.invalidateQueries({ queryKey: ["deals", "detail", dealId] });
      void qc.invalidateQueries({ queryKey: ["deals"] });
    });
    return () => sub.unsubscribe();
  }, [dealId, qc]);

  return query;
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealInput) => createDeal(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["deals"] });
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function usePatchDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dealId,
      stage,
      lostReason,
    }: {
      dealId: string;
      stage: DealStage;
      lostReason?: string;
    }) => patchDealStage(dealId, stage, lostReason),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["deals"] });
      void qc.invalidateQueries({ queryKey: ["deals", "detail", vars.dealId] });
    },
  });
}

export function usePatchDealOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, ownerId }: { dealId: string; ownerId: string }) =>
      patchDealOwner(dealId, ownerId),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["deals"] });
      void qc.invalidateQueries({ queryKey: ["deals", "detail", vars.dealId] });
    },
  });
}

export function usePostDealNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, body }: { dealId: string; body: string }) => postDealNote(dealId, body),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["deals", "detail", vars.dealId] });
    },
  });
}
