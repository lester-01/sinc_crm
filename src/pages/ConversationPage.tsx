import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import { fetchClients } from "@/features/clients/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/features/auth/AuthContext";
import type { ConversationQueue } from "@/features/conversations/types";
import {
  useAssignConversation,
  useConversation,
  useConversations,
  useCreateConversation,
  useSendMessage,
  useTeamMembers,
} from "@/features/conversations/hooks";
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
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [reassignTo, setReassignTo] = useState("");

  const isClient = role === "client";
  const isManager = role === "manager";
  const isSales = role === "sales";

  const { data: threads, isLoading: listLoading } = useConversations(isClient ? undefined : queue);
  const { data: thread, isLoading: threadLoading } = useConversation(selectedId);
  const { data: team } = useTeamMembers(isManager);
  const assignMutation = useAssignConversation();
  const sendMutation = useSendMessage();
  const createMutation = useCreateConversation();

  const { data: myClients } = useQuery({
    queryKey: ["clients", "self"],
    queryFn: () => fetchClients(),
    enabled: isClient,
  });
  const ownClientId = myClients?.[0]?.id;

  function selectThread(id: string) {
    setSearchParams({ thread: id });
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
    await sendMutation.mutateAsync({ threadId: selectedId, body: reply.trim() });
    setReply("");
  }

  async function handleNewConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!ownClientId) return;
    const result = await createMutation.mutateAsync({
      clientId: ownClientId,
      subject: newSubject,
      message: newMessage,
    });
    setShowNew(false);
    setNewSubject("");
    setNewMessage("");
    selectThread(result.id);
  }

  const canReply =
    thread &&
    (isManager ||
      (isSales && thread.assignedTo === profile?.id) ||
      (isClient && thread.clientId === ownClientId));

  const showAssignSelf = isSales && thread && thread.assignedTo === null && selectedId;
  const showReassign = isManager && thread && selectedId;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Conversations"
        description="Respond to student inquiries and manage assignment queues."
        actions={
          isClient ? (
            <Button type="button" onClick={() => setShowNew((v) => !v)}>
              {showNew ? "Cancel" : "New conversation"}
            </Button>
          ) : undefined
        }
      />

      {showNew && isClient && ownClientId && (
        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Start a conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={handleNewConversation}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="message">Message</Label>
                <Input
                  id="message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                Start conversation
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!isClient && (
        <div className="flex gap-2 rounded-lg bg-muted/60 p-1 w-fit">
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
        <Card className="min-h-[480px] border-border/80 shadow-card">
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
                )}
              >
                <div className="font-medium">{t.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {isClient ? t.status : t.assignedToName ?? "Unassigned"}
                </div>
              </button>
            ))}
            {!listLoading && (threads ?? []).length === 0 && (
              <p className="px-4 py-8 text-sm text-muted-foreground">No conversations.</p>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex min-h-[480px] flex-col border-border/80 shadow-card">
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
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={reassignTo}
                          onChange={(e) => setReassignTo(e.target.value)}
                          aria-label="Reassign to"
                        >
                          <option value="">Reassign to…</option>
                          {(team ?? []).map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.fullName}
                            </option>
                          ))}
                        </select>
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
                  {thread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-xl px-4 py-2.5 text-sm",
                        m.senderType === "client"
                          ? "mr-auto bg-muted"
                          : "ml-auto bg-primary text-primary-foreground",
                      )}
                    >
                      <div
                        className={cn(
                          "mb-1 text-xs font-medium",
                          m.senderType === "client"
                            ? "text-muted-foreground"
                            : "text-primary-foreground/80",
                        )}
                      >
                        {m.senderType === "client" ? "Client" : "Team"}: {m.senderName}
                      </div>
                      <div>{m.body}</div>
                    </div>
                  ))}
                </div>
                {canReply && (
                  <form
                    className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row"
                    onSubmit={handleSend}
                  >
                    <Textarea
                      placeholder="Reply…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      aria-label="Reply"
                      className="min-h-[44px] resize-none sm:flex-1"
                      rows={1}
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
