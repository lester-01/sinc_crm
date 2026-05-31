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
import { Textarea } from "@/components/ui/textarea";
import { useCreateConversation } from "./hooks";

type StartConversationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onCreated?: (threadId: string) => void;
};

export function StartConversationDialog({
  open,
  onOpenChange,
  clientId,
  onCreated,
}: StartConversationDialogProps) {
  const formId = useId();
  const createMutation = useCreateConversation();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSubject("");
    setMessage("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const thread = await createMutation.mutateAsync({
        clientId,
        subject: subject.trim(),
        message: message.trim(),
      });
      handleOpenChange(false);
      onCreated?.(thread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
        </DialogHeader>
        <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-subject`}>Subject</Label>
            <Input
              id={`${formId}-subject`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-message`}>Message</Label>
            <Textarea
              id={`${formId}-message`}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={createMutation.isPending}>
            Start conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
