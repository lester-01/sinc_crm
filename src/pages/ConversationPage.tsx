import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { fetchClients } from "@/features/clients/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/features/auth/AuthContext";
import type { ConversationQueue } from "@/features/conversations/types";
import {
  useAssignConversation,
  useConversation,
  useConversations,
  useMarkConversationRead,
  useSendMessage,
  useTeamMembers,
} from "@/features/conversations/hooks";
import { StartConversationDialog } from "@/features/conversations/StartConversationDialog";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

const QUEUE_TABS: { id: ConversationQueue; label: string }[] = [
  { id: "unassigned", label: "Unassigned" },
  { id: "mine", label: "Mine" },
  { id: "all", label: "All" },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ConversationPage() {
  const { role, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("thread") ?? undefined;

  const [queue, setQueue] = useState<ConversationQueue>("unassigned");
  const [reply, setReply] = useState("");
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const isClient = role === "client";
  const isManager = role === "manager";
  const isSales = role === "sales";

  const { data: threads, isLoading: listLoading } = useConversations(isClient ? undefined : queue);
  const { data: thread, isLoading: threadLoading } = useConversation(selectedId);
  const { data: team } = useTeamMembers(isManager);
  const assignMutation = useAssignConversation();
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkConversationRead();

  const { data: myClients } = useQuery({
    queryKey: ["clients", "self"],
    queryFn: () => fetchClients(),
    enabled: isClient,
  });
  const ownClientId = myClients?.[0]?.id;
  const markedReadForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isClient || !selectedId) {
      markedReadForRef.current = null;
      return;
    }
    const openThread = threads?.find((t) => t.id === selectedId);
    if (openThread?.hasUnread) {
      markedReadForRef.current = null;
    }
    if (markedReadForRef.current === selectedId) return;
    markedReadForRef.current = selectedId;
    markReadMutation.mutate(selectedId);
    // Intentionally omit markReadMutation — its identity changes after each mutate and re-triggers this effect.
  }, [isClient, selectedId, threads]);

  function selectThread(id: string) {
    setSearchParams({ thread: id });
    setReply("");
  }

  function clearThread() {
    setSearchParams({});
    setReply("");
  }

  async function handleAssignSelf() {
    if (!selectedId || !profile?.id) return;
    await assignMutation.mutateAsync({ threadId: selectedId, assignedTo: profile.id });
  }

  async function handleReassign() {
    if (!selectedId || !reassignTo) return;
    await assignMutation.mutateAsync({ threadId: selectedId, assignedTo: reassignTo });
    setReassignTo("");
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setSendError(null);
    try {
      await sendMutation.mutateAsync({ threadId: selectedId, body: reply.trim() });
      setReply("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message");
    }
  }

  const canReply =
    thread &&
    (isManager ||
      (isSales && thread.assignedTo === profile?.id) ||
      (isClient && thread.clientId === ownClientId));

  const showAssignSelf = isSales && thread && thread.assignedTo === null && selectedId;
  const showReassign = isManager && thread && selectedId;
  const showQueueOnMobile = !selectedId;
  const showThreadOnMobile = !!selectedId;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Conversations"
        description="Respond to student inquiries and manage assignment queues."
        actions={
          isClient && ownClientId ? (
            <Button type="button" onClick={() => setShowStartDialog(true)}>
              New conversation
            </Button>
          ) : undefined
        }
      />

      {isClient && ownClientId && (
        <StartConversationDialog
          open={showStartDialog}
          onOpenChange={setShowStartDialog}
          clientId={ownClientId}
          onCreated={(threadId) => selectThread(threadId)}
        />
      )}

      {!isClient && (
        <div className="flex w-fit gap-2 rounded-lg bg-muted/60 p-1">
          {QUEUE_TABS.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={queue === tab.id ? "default" : "outline"}
              onClick={() => setQueue(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_2fr]">
        <Card
          className={cn(
            "min-h-[480px] border-border/80 shadow-card",
            !showQueueOnMobile && "hidden lg:flex lg:flex-col",
          )}
        >
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">
              {isClient ? "Your conversations" : "Queue"}
            </CardTitle>
          </CardHeader>
          <ScrollArea className="h-[400px]">
            {listLoading && (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            )}
            {(threads ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectThread(t.id)}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50",
                  selectedId === t.id && "border-l-2 border-l-primary bg-primary/5",
                  t.hasUnread && "font-semibold",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.subject}</span>
                  {t.hasUnread && (
                    <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                      New
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isClient
                    ? `${t.status} · ${formatRelativeTime(t.lastMessageAt)}`
                    : `${t.assignedToName ?? "Unassigned"} · ${formatRelativeTime(t.lastMessageAt)}`}
                </div>
                {!isClient && t.createdAt && (
                  <div className="text-xs text-muted-foreground/80">
                    Started {formatRelativeTime(t.createdAt)}
                  </div>
                )}
              </button>
            ))}
            {!listLoading && (threads ?? []).length === 0 && (
              <p className="px-4 py-8 text-sm text-muted-foreground">No conversations.</p>
            )}
          </ScrollArea>
        </Card>

        <Card
          className={cn(
            "flex min-h-[480px] flex-col border-border/80 shadow-card",
            !showThreadOnMobile && "hidden lg:flex",
          )}
        >
          {!selectedId && (
            <CardContent className="flex flex-1 items-center justify-center text-muted-foreground">
              Select a conversation
            </CardContent>
          )}
          {selectedId && threadLoading && (
            <CardContent className="flex flex-col gap-3 p-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          )}
          {selectedId && thread && (
            <>
              <CardHeader className="border-b border-border/60">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="size-9 p-0 lg:hidden"
                      onClick={clearThread}
                      aria-label="Back to queue"
                    >
                      <ArrowLeft className="size-4" />
                    </Button>
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-secondary text-xs">
                        {initials(thread.subject)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{thread.subject}</CardTitle>
                      <p className="text-xs capitalize text-muted-foreground">
                        {thread.status}
                        {!isClient && ` · Owner: ${thread.assignedToName ?? "Unassigned"}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {showAssignSelf && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleAssignSelf()}
                        disabled={assignMutation.isPending}
                      >
                        Assign to me
                      </Button>
                    )}
                    {showReassign && (
                      <>
                        <Select value={reassignTo || undefined} onValueChange={setReassignTo}>
                          <SelectTrigger className="h-9 w-[180px]" aria-label="Reassign to">
                            <SelectValue placeholder="Reassign to…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(team ?? []).map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!reassignTo || assignMutation.isPending}
                          onClick={() => void handleReassign()}
                        >
                          Reassign
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
                <div className="flex flex-col gap-3">
                  {thread.messages.map((m) => {
                    const isMine = m.senderId === profile?.id;
                    const isClientMsg = m.senderType === "client";
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[85%] rounded-xl border px-4 py-2.5 text-sm shadow-sm",
                          isClientMsg
                            ? "mr-auto border-border/80 bg-muted"
                            : "ml-auto border-primary/30 bg-primary text-primary-foreground",
                        )}
                      >
                        <div
                          className={cn(
                            "mb-1 flex flex-wrap items-center gap-2 text-xs font-medium",
                            isClientMsg
                              ? "text-muted-foreground"
                              : "text-primary-foreground/90",
                          )}
                        >
                          <span>{isMine ? "You" : isClientMsg ? "Client" : "Team"}</span>
                          {!isMine && !isClientMsg && (
                            <span className="opacity-80">· {m.senderName}</span>
                          )}
                          <span className="font-normal opacity-70">
                            {formatRelativeTime(m.createdAt)}
                          </span>
                        </div>
                        <div>{m.body}</div>
                      </div>
                    );
                  })}
                </div>
                {canReply && (
                  <form
                    className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row"
                    onSubmit={handleSend}
                  >
                    {sendError && (
                      <p className="w-full text-sm text-destructive" role="alert">
                        {sendError}
                      </p>
                    )}
                    <Textarea
                      placeholder="Reply…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      aria-label="Reply"
                      className="min-h-[44px] resize-none sm:flex-1"
                      rows={2}
                    />
                    <Button
                      type="submit"
                      disabled={sendMutation.isPending || !reply.trim()}
                      className="shrink-0"
                    >
                      <Send className="mr-2 size-4" />
                      Send
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
