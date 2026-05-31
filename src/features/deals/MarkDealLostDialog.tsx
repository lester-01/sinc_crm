import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOST_REASON_PRESETS } from "./constants";
import { usePatchDealStage } from "./hooks";

type MarkDealLostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealTitle?: string;
  onMarkedLost?: () => void;
};

export function MarkDealLostDialog({
  open,
  onOpenChange,
  dealId,
  dealTitle,
  onMarkedLost,
}: MarkDealLostDialogProps) {
  const formId = useId();
  const patchStage = usePatchDealStage();
  const [lostReason, setLostReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setLostReason("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const reason = lostReason.trim();
    if (!reason) {
      setError("Lost reason is required when marking a deal as lost.");
      return;
    }
    setError(null);
    try {
      await patchStage.mutateAsync({
        dealId,
        stage: "lost",
        lostReason: reason,
      });
      handleOpenChange(false);
      onMarkedLost?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark deal as lost");
    }
  }

  const presetValue = LOST_REASON_PRESETS.includes(
    lostReason as (typeof LOST_REASON_PRESETS)[number],
  )
    ? lostReason
    : lostReason.trim()
      ? "Other"
      : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark deal as lost</DialogTitle>
          {dealTitle && (
            <p className="text-sm text-muted-foreground">{dealTitle}</p>
          )}
        </DialogHeader>
        <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-lost-reason-preset`}>Lost reason</Label>
            <Select
              value={presetValue}
              onValueChange={(v) => setLostReason(v === "Other" ? "" : v)}
            >
              <SelectTrigger id={`${formId}-lost-reason-preset`}>
                <SelectValue placeholder="Select reason…" />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASON_PRESETS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(lostReason === "" ||
            !LOST_REASON_PRESETS.slice(0, -1).includes(
              lostReason as (typeof LOST_REASON_PRESETS)[number],
            )) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${formId}-lost-reason`}>Details</Label>
              <Input
                id={`${formId}-lost-reason`}
                placeholder="Describe why the deal was lost"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
              />
            </div>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={patchStage.isPending}>
            Mark as lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
