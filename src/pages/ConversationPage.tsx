import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchClients } from "@/features/clients/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    queryKey: ["my-client"],
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

  const showAssignSelf =
    isSales && thread && thread.assignedTo === null && selectedId;
  const showReassign = isManager && thread && selectedId;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Conversations</h2>
        {isClient && (
          <Button type="button" onClick={() => setShowNew((v) => !v)}>
            {showNew ? "Cancel" : "New conversation"}
          </Button>
        )}
      </div>

      {showNew && isClient && ownClientId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start a conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleNewConversation}>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
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
        <div className="flex gap-2">
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

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_2fr]">
        <Card className="min-h-[420px]">
          <CardHeader>
            <CardTitle className="text-base">Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {listLoading && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Loading…</p>
            )}
            {(threads ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectThread(t.id)}
                className={cn(
                  "w-full border-b border-border px-4 py-3 text-left text-sm hover:bg-muted/50",
                  selectedId === t.id && "bg-muted",
                )}
              >
                <div className="font-medium">{t.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {isClient ? t.status : t.assignedToName ?? "Unassigned"}
                </div>
              </button>
            ))}
            {!listLoading && (threads ?? []).length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground">No conversations.</p>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[420px] flex-col">
          {!selectedId && (
            <CardContent className="flex flex-1 items-center justify-center text-muted-foreground">
              Select a conversation
            </CardContent>
          )}
          {selectedId && threadLoading && (
            <CardContent className="p-6 text-sm text-muted-foreground">Loading thread…</CardContent>
          )}
          {selectedId && thread && (
            <>
              <CardHeader className="border-b border-border">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{thread.subject}</CardTitle>
                    <p className="text-xs capitalize text-muted-foreground">
                      {thread.status}
                      {!isClient && ` · Owner: ${thread.assignedToName ?? "Unassigned"}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                <div className="space-y-3">
                  {thread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        m.senderType === "client"
                          ? "bg-muted"
                          : "bg-primary/10",
                      )}
                    >
                      <div className="text-xs font-medium text-muted-foreground">
                        {m.senderType === "client" ? "Client" : "Team"}: {m.senderName}
                      </div>
                      <div>{m.body}</div>
                    </div>
                  ))}
                </div>
                {canReply && (
                  <form className="mt-auto flex gap-2 border-t border-border pt-4" onSubmit={handleSend}>
                    <Input
                      placeholder="Reply…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      aria-label="Reply"
                    />
                    <Button type="submit" disabled={sendMutation.isPending || !reply.trim()}>
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
