import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { useTeamMembers } from "@/features/conversations/hooks";
import { DEAL_STAGES, stageLabel } from "@/features/deals/constants";
import { MarkDealLostDialog } from "@/features/deals/MarkDealLostDialog";
import { allowedNextStages } from "@/lib/stage-transitions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApiError } from "@/features/deals/api";
import {
  useDeal,
  usePatchDealOwner,
  usePatchDealStage,
  usePostDealNote,
} from "@/features/deals/hooks";

export function DealDetailPage() {
  const { dealId } = useParams();
  const { role, profile } = useAuth();
  const { data: deal, isLoading, error } = useDeal(dealId);
  const { data: team } = useTeamMembers(role === "manager");
  const patchStage = usePatchDealStage();
  const patchOwner = usePatchDealOwner();
  const postNote = usePostDealNote();

  const [note, setNote] = useState("");
  const [reassignTo, setReassignTo] = useState("");
  const [stageError, setStageError] = useState<string | null>(null);
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);

  const canEditStage =
    deal &&
    (role === "manager" || (role === "sales" && deal.ownerId === profile?.id));

  const displayStage = pendingStage ?? deal?.stage ?? "";
  const stageOptions = useMemo(
    () => (deal ? allowedNextStages(deal.stage) : DEAL_STAGES),
    [deal],
  );
  const HISTORY_CAP = 12;
  const visibleHistory = deal?.stageHistory.slice(0, HISTORY_CAP) ?? [];
  const hiddenHistoryCount = Math.max(0, (deal?.stageHistory.length ?? 0) - HISTORY_CAP);

  async function handleStageChange(next: string) {
    if (!deal || next === deal.stage) return;
    setStageError(null);
    if (next === "lost" && deal.stage !== "lost") {
      setLostDialogOpen(true);
      return;
    }
    setPendingStage(next);
    try {
      await patchStage.mutateAsync({
        dealId: deal.id,
        stage: next as (typeof DEAL_STAGES)[number],
      });
    } catch (e) {
      setStageError(e instanceof Error ? e.message : "Stage update failed");
    } finally {
      setPendingStage(null);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!dealId || !note.trim()) return;
    await postNote.mutateAsync({ dealId, body: note.trim() });
    setNote("");
  }

  async function handleReassign() {
    if (!dealId || !reassignTo) return;
    await patchOwner.mutateAsync({ dealId, ownerId: reassignTo });
    setReassignTo("");
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Access denied</h2>
        <Button variant="outline" asChild>
          <Link to="/pipeline">Back to pipeline</Link>
        </Button>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error instanceof Error ? error.message : "Deal not found"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {stageLabel(deal.stage)}
            </Badge>
          </div>
          <h2 className="text-2xl font-semibold">{deal.title}</h2>
          <p className="text-sm text-muted-foreground">
            Client:{" "}
            <Link to={`/clients/${deal.clientId}`} className="font-medium text-primary hover:underline">
              {deal.clientName}
            </Link>
          </p>
        </div>
        {canEditStage && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="deal-stage">Stage</Label>
            <Select
              value={displayStage}
              onValueChange={(v) => void handleStageChange(v)}
            >
              <SelectTrigger id="deal-stage" className="min-w-[200px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {stageOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {stageLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {deal.stage === "lost" && deal.lostReason && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Lost reason: </span>
                {deal.lostReason}
              </p>
            )}
            {stageError && (
              <p className="text-sm text-destructive" role="alert">
                {stageError}
              </p>
            )}
          </div>
        )}
      </div>

      {canEditStage && deal.stage !== "lost" && (
        <MarkDealLostDialog
          open={lostDialogOpen}
          onOpenChange={setLostDialogOpen}
          dealId={deal.id}
          dealTitle={deal.title}
          onMarkedLost={() => setLostDialogOpen(false)}
        />
      )}

      <Card className="border-border/80 shadow-card">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Owner: </span>
            <span className="font-medium">{deal.ownerName ?? "Unassigned"}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Value: </span>
            <span className="font-medium">
              {deal.valueCurrency ?? "USD"} {deal.valueAmount ?? "—"}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Intake: </span>
            <span className="font-medium">{deal.expectedIntake ?? "—"}</span>
          </div>
        </CardContent>
      </Card>

      {role === "manager" && (
        <Card className="border-border/80 shadow-card">
          <CardContent className="flex flex-wrap items-end gap-3 pt-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reassign-owner">Reassign owner</Label>
              <Select value={reassignTo || undefined} onValueChange={setReassignTo}>
                <SelectTrigger id="reassign-owner" className="min-w-[200px]">
                  <SelectValue placeholder="Select team member…" />
                </SelectTrigger>
                <SelectContent>
                  {(team ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!reassignTo || patchOwner.isPending}
              onClick={() => void handleReassign()}
            >
              Reassign owner
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(role === "manager" || role === "sales") && (
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleAddNote}>
                <Input
                  placeholder="Add note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  aria-label="Add note"
                  className="sm:flex-1"
                />
                <Button type="submit" disabled={postNote.isPending || !note.trim()}>
                  Add
                </Button>
              </form>
            )}
            {deal.notes.length === 0 && (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
            {deal.notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <p>{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Stage history</CardTitle>
          </CardHeader>
          <ScrollArea className="max-h-72">
            <CardContent className="flex flex-col gap-2">
              {deal.stageHistory.length === 0 && (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              )}
              {visibleHistory.map((h, i) => (
                <div key={h.id}>
                  <p className="text-sm">
                    {h.fromStage ? `${stageLabel(h.fromStage)} → ` : ""}
                    <span className="font-medium">{stageLabel(h.toStage)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.changedByName} · {new Date(h.createdAt).toLocaleString()}
                  </p>
                  {i < visibleHistory.length - 1 && <Separator className="mt-2" />}
                </div>
              ))}
              {hiddenHistoryCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  + {hiddenHistoryCount} older entries not shown
                </p>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
