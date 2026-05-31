import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/features/auth/AuthContext";
import { defaultPathForRole } from "@/features/auth/nav";
import { useTeamMembers } from "@/features/conversations/hooks";
import { allowedNextStages } from "@/lib/stage-transitions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEAL_STAGES, stageLabel } from "@/features/deals/constants";
import { useDeals, usePatchDealStage } from "@/features/deals/hooks";
import type { DealListItem } from "@/features/deals/types";
import { stageColumnClass } from "@/lib/stage-styles";
import { cn } from "@/lib/utils";

export function PipelinePage() {
  const { role, profile } = useAuth();
  const { data: team } = useTeamMembers(role === "manager");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [pendingStage, setPendingStage] = useState<Record<string, string>>({});
  const { data: deals, isLoading, error } = useDeals({
    q: search,
    ownerId: ownerFilter === "all" || !ownerFilter ? undefined : ownerFilter,
  });
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

  if (role === "client") {
    return <Navigate to={defaultPathForRole("client")} replace />;
  }

  async function onStageSelect(deal: DealListItem, next: string) {
    if (!next || next === deal.stage || !canChangeStage(deal)) return;
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
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pipeline"
        description="Track deals through every stage from lead to enrollment."
        actions={
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pipeline-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pipeline-search"
                  className="w-48 pl-9"
                  placeholder="Deal title"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            {role === "manager" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="owner-filter">Owner</Label>
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger id="owner-filter" className="w-48">
                    <SelectValue placeholder="All owners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All owners</SelectItem>
                    {(team ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        }
      />

      {isLoading && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-52 shrink-0 rounded-xl" />
          ))}
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "Failed to load pipeline"}
        </p>
      )}

      {!isLoading && !error && (
        <div className="max-h-[calc(100vh-11rem)] overflow-x-auto pb-4">
          <div className="flex h-full min-h-0 gap-3">
          {DEAL_STAGES.map((stage) => (
            <div
              key={stage}
              className={cn(
                "flex h-full max-h-[calc(100vh-11rem)] w-52 shrink-0 flex-col rounded-xl border border-border/80 border-t-4 shadow-card",
                stageColumnClass(stage),
              )}
            >
              <div className="shrink-0 border-b border-border/60 px-3 py-2.5 text-sm font-medium capitalize">
                {stageLabel(stage)}
                <Badge variant="secondary" className="ml-2 font-normal">
                  {(byStage.get(stage) ?? []).length}
                </Badge>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                {(byStage.get(stage) ?? []).map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-md border border-border/80 bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-card"
                  >
                    <Link
                      to={`/deals/${deal.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{deal.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {deal.ownerName ?? "Unassigned"}
                    </p>
                    {canChangeStage(deal) &&
                    allowedNextStages(deal.stage).filter((s) => s !== deal.stage).length > 0 ? (
                      <div className="mt-2 flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">Move to</Label>
                        <Select
                          value={pendingStage[deal.id] ?? ""}
                          onValueChange={(v) => void onStageSelect(deal, v)}
                        >
                          <SelectTrigger
                            className="h-8 text-xs"
                            aria-label={`Move ${deal.title} to stage`}
                          >
                            <SelectValue placeholder={stageLabel(deal.stage)} />
                          </SelectTrigger>
                          <SelectContent>
                            {allowedNextStages(deal.stage)
                              .filter((s) => s !== deal.stage)
                              .map((s) => (
                                <SelectItem key={s} value={s}>
                                  {stageLabel(s)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <p className={cn("mt-2 text-xs capitalize text-muted-foreground")}>
                        {stageLabel(deal.stage)}
                      </p>
                    )}
                  </div>
                ))}
                {(byStage.get(stage) ?? []).length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">Empty</p>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
