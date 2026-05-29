import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthContext";
import { useTeamMembers } from "@/features/conversations/hooks";
import { DEAL_STAGES, stageLabel } from "@/features/deals/constants";
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
  const [lostReason, setLostReason] = useState("");
  const [reassignTo, setReassignTo] = useState("");
  const [stageError, setStageError] = useState<string | null>(null);
  const [pendingStage, setPendingStage] = useState<string | null>(null);

  const canEditStage =
    deal &&
    (role === "manager" || (role === "sales" && deal.ownerId === profile?.id));

  async function handleStageChange(next: string) {
    if (!deal || next === deal.stage) return;
    setStageError(null);
    if (next === "lost" && !lostReason.trim()) {
      setStageError("Lost reason is required when marking a deal as lost.");
      return;
    }
    setPendingStage(next);
    try {
      await patchStage.mutateAsync({
        dealId: deal.id,
        stage: next as (typeof DEAL_STAGES)[number],
        lostReason: next === "lost" ? lostReason : undefined,
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
    return <p className="text-sm text-muted-foreground">Loading deal…</p>;
  }

  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return (
      <div className="space-y-4">
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{deal.title}</h2>
          <p className="text-sm text-muted-foreground">
            Client:{" "}
            <Link to={`/clients/${deal.clientId}`} className="hover:underline">
              {deal.clientName}
            </Link>
          </p>
        </div>
        {canEditStage && (
          <div className="space-y-2">
            <Label htmlFor="deal-stage">Stage</Label>
            <select
              id="deal-stage"
              className="h-9 min-w-[200px] rounded-md border border-input bg-background px-2 text-sm"
              value={pendingStage ?? deal.stage}
              onChange={(e) => void handleStageChange(e.target.value)}
            >
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {stageLabel(s)}
                </option>
              ))}
            </select>
            {deal.stage !== "lost" && (
              <Input
                placeholder="Lost reason (required if stage is lost)"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
              />
            )}
            {stageError && (
              <p className="text-sm text-destructive" role="alert">
                {stageError}
              </p>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-2 pt-6 text-sm sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Owner: </span>
            {deal.ownerName ?? "Unassigned"}
          </div>
          <div>
            <span className="text-muted-foreground">Value: </span>
            {deal.valueCurrency ?? "USD"} {deal.valueAmount ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Intake: </span>
            {deal.expectedIntake ?? "—"}
          </div>
        </CardContent>
      </Card>

      {role === "manager" && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="reassign-owner">Reassign owner</Label>
            <select
              id="reassign-owner"
              className="h-9 min-w-[200px] rounded-md border border-input bg-background px-2 text-sm"
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
            >
              <option value="">Select team member…</option>
              {(team ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!reassignTo || patchOwner.isPending}
            onClick={() => void handleReassign()}
          >
            Reassign owner
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(role === "manager" || role === "sales") && (
              <form className="flex gap-2" onSubmit={handleAddNote}>
                <Input
                  placeholder="Add note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  aria-label="Add note"
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
              <div key={n.id} className="border-b border-border py-2 text-sm last:border-0">
                <p>{n.body}</p>
                <p className="text-xs text-muted-foreground">
                  {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stage history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {deal.stageHistory.length === 0 && (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            )}
            {deal.stageHistory.map((h) => (
              <p key={h.id} className="border-b border-border py-2 text-sm last:border-0">
                {h.fromStage ? `${stageLabel(h.fromStage)} → ` : ""}
                {stageLabel(h.toStage)}
                <span className="block text-xs text-muted-foreground">
                  {h.changedByName} · {new Date(h.createdAt).toLocaleString()}
                </span>
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
