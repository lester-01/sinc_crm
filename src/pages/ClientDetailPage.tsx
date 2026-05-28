import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/features/clients/api";
import { useClient } from "@/features/clients/hooks";
import { useCreateConversation } from "@/features/conversations/hooks";

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { clientId } = useParams();
  const { data: client, isLoading, error } = useClient(clientId);
  const createChat = useCreateConversation();
  const [showChat, setShowChat] = useState(false);
  const [chatSubject, setChatSubject] = useState("");
  const [chatMessage, setChatMessage] = useState("");

  const canStartChat = role === "manager" || role === "sales" || role === "client";

  async function handleNewChat(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    const thread = await createChat.mutateAsync({
      clientId,
      subject: chatSubject,
      message: chatMessage,
    });
    setShowChat(false);
    setChatSubject("");
    setChatMessage("");
    navigate(`/conversations?thread=${thread.id}`);
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading client…</p>;
  }

  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Access denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this client.</p>
        <Button variant="outline" asChild>
          <Link to="/clients">Back to clients</Link>
        </Button>
      </div>
    );
  }

  if (error || !client) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error instanceof Error ? error.message : "Client not found"}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{client.fullName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled title="Phase 9">
            New Deal
          </Button>
          {canStartChat && (
            <Button variant="outline" type="button" onClick={() => setShowChat((v) => !v)}>
              {showChat ? "Cancel" : "New Chat"}
            </Button>
          )}
        </div>
      </div>

      {showChat && canStartChat && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleNewChat}>
              <div className="space-y-2">
                <Label htmlFor="chat-subject">Subject</Label>
                <Input
                  id="chat-subject"
                  value={chatSubject}
                  onChange={(e) => setChatSubject(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chat-message">First message</Label>
                <Input
                  id="chat-message"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={createChat.isPending}>
                Start chat
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-2 pt-6 text-sm sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Phone: </span>
            {client.phone ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Country: </span>
            {client.country ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Target: </span>
            {client.targetCountry ?? "—"}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.conversations.length === 0 && (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            )}
            {client.conversations.map((t) => (
              <Link
                key={t.id}
                to={`/conversations?thread=${t.id}`}
                className="flex items-center justify-between border-b border-border py-2 last:border-0 hover:underline"
              >
                <span>{t.subject}</span>
                <span className="text-xs capitalize text-muted-foreground">{t.status}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.deals.length === 0 && (
              <p className="text-sm text-muted-foreground">No deals yet.</p>
            )}
            {client.deals.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between border-b border-border py-2 last:border-0"
              >
                <span>{d.title}</span>
                <span className="text-xs capitalize text-muted-foreground">
                  {String(d.stage).replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {client.activity.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          )}
          {client.activity.map((a, i) => (
            <p key={`${a.createdAt}-${i}`} className="border-b border-border py-2 text-sm last:border-0">
              {a.description}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
