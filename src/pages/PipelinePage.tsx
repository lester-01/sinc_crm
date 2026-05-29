import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthContext";
import { DEAL_STAGES, stageLabel } from "@/features/deals/constants";
import { useDeals, usePatchDealStage } from "@/features/deals/hooks";
import type { DealListItem } from "@/features/deals/types";
import { cn } from "@/lib/utils";

export function PipelinePage() {
  const { role, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [pendingStage, setPendingStage] = useState<Record<string, string>>({});
  const { data: deals, isLoading } = useDeals({ q: search, ownerId: ownerFilter || undefined });
  const patchStage = usePatchDealStage();

  const byStage = useMemo(() => {
    const map = new Map<string, DealListItem[]>();
    for (const stage of DEAL_STAGES) map.set(stage, []);
    for (const deal of deals ?? []) {
      const list = map.get(deal.stage) ?? [];
      list.push(deal);
      map.set(deal.stage, list);
    }
    return map;
  }, [deals]);

  function canChangeStage(deal: DealListItem): boolean {
    if (role === "manager") return true;
    if (role === "sales") return deal.ownerId === profile?.id;
    return false;
  }

  async function onStageSelect(deal: DealListItem, next: string) {
    if (next === deal.stage || !canChangeStage(deal)) return;
    setPendingStage((m) => ({ ...m, [deal.id]: next }));
    try {
      await patchStage.mutateAsync({
        dealId: deal.id,
        stage: next as (typeof DEAL_STAGES)[number],
      });
    } finally {
      setPendingStage((m) => {
        const { [deal.id]: _, ...rest } = m;
        return rest;
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold">Pipeline</h2>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label htmlFor="pipeline-search">Search</Label>
            <Input
              id="pipeline-search"
              className="w-48"
              placeholder="Deal title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {role === "manager" && (
            <div className="space-y-2">
              <Label htmlFor="owner-filter">Owner ID (optional)</Label>
              <Input
                id="owner-filter"
                className="w-48"
                placeholder="Filter by owner UUID"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading pipeline…</p>}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {DEAL_STAGES.map((stage) => (
          <div
            key={stage}
            className="flex w-52 shrink-0 flex-col rounded-lg border border-border bg-muted/30"
          >
            <div className="border-b border-border px-3 py-2 text-sm font-medium capitalize">
              {stageLabel(stage)}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {(byStage.get(stage) ?? []).map((deal) => (
                <div
                  key={deal.id}
                  className="rounded-md border border-border bg-background p-2 text-sm shadow-sm"
                >
                  <Link to={`/deals/${deal.id}`} className="font-medium hover:underline">
                    {deal.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{deal.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {deal.ownerName ?? "Unassigned"}
                  </p>
                  {canChangeStage(deal) ? (
                    <select
                      className="mt-2 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                      value={pendingStage[deal.id] ?? deal.stage}
                      aria-label={`Stage for ${deal.title}`}
                      onChange={(e) => void onStageSelect(deal, e.target.value)}
                    >
                      {DEAL_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {stageLabel(s)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className={cn("mt-2 text-xs capitalize text-muted-foreground")}>
                      {stageLabel(deal.stage)}
                    </p>
                  )}
                </div>
              ))}
              {(byStage.get(stage) ?? []).length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">Empty</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
