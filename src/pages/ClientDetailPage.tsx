import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapPin, MessageSquare, Phone, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/features/clients/api";
import { useClient } from "@/features/clients/hooks";
import { useCreateConversation } from "@/features/conversations/hooks";
import { useCreateDeal } from "@/features/deals/hooks";
import { stageLabel } from "@/features/deals/constants";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { clientId } = useParams();
  const { data: client, isLoading, error } = useClient(clientId);
  const createChat = useCreateConversation();
  const createDeal = useCreateDeal();
  const [showChat, setShowChat] = useState(false);
  const [showDeal, setShowDeal] = useState(false);
  const [chatSubject, setChatSubject] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [dealTitle, setDealTitle] = useState("");
  const [dealIntake, setDealIntake] = useState("Fall 2026");

  const canStartChat = role === "manager" || role === "sales" || role === "client";
  const canCreateDeal = role === "manager" || role === "sales";
  const activeDeal = client?.deals?.find((d) => d.stage !== "lost" && d.stage !== "won");

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

  async function handleNewDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !dealTitle.trim()) return;
    const deal = await createDeal.mutateAsync({
      clientId,
      title: dealTitle.trim(),
      expectedIntake: dealIntake.trim() || undefined,
      valueAmount: 1200,
      valueCurrency: "USD",
    });
    setShowDeal(false);
    setDealTitle("");
    navigate(`/deals/${deal.id}`);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return (
      <div className="flex flex-col gap-4">
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar className="size-14 border-2 border-primary/20">
            <AvatarFallback className="bg-secondary text-lg font-semibold text-secondary-foreground">
              {initials(client.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-semibold">{client.fullName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canCreateDeal && (
            <Button variant="outline" type="button" onClick={() => setShowDeal(true)}>
              <Plus className="mr-2 size-4" />
              New Deal
            </Button>
          )}
          {canStartChat && (
            <Button variant="outline" type="button" onClick={() => setShowChat(true)}>
              <MessageSquare className="mr-2 size-4" />
              New Chat
            </Button>
          )}
        </div>
      </div>

      {role === "client" && activeDeal && (
        <Card className="border-primary/20 bg-primary/5 shadow-card">
          <CardContent className="flex items-center gap-2 pt-6 text-sm">
            <span className="text-muted-foreground">Active deal:</span>
            <Link to={`/deals/${activeDeal.id}`} className="font-medium text-primary hover:underline">
              {activeDeal.title}
            </Link>
            <Badge variant="secondary">{stageLabel(String(activeDeal.stage))}</Badge>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDeal} onOpenChange={setShowDeal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New deal</DialogTitle>
          </DialogHeader>
          <form id="new-deal-form" className="flex flex-col gap-3" onSubmit={handleNewDeal}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="deal-title">Title</Label>
              <Input
                id="deal-title"
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="deal-intake">Expected intake</Label>
              <Input
                id="deal-intake"
                value={dealIntake}
                onChange={(e) => setDealIntake(e.target.value)}
              />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDeal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="new-deal-form" disabled={createDeal.isPending}>
              Create deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New conversation</DialogTitle>
          </DialogHeader>
          <form id="new-chat-form" className="flex flex-col gap-3" onSubmit={handleNewChat}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="chat-subject">Subject</Label>
              <Input
                id="chat-subject"
                value={chatSubject}
                onChange={(e) => setChatSubject(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="chat-message">First message</Label>
              <Input
                id="chat-message"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                required
              />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowChat(false)}>
              Cancel
            </Button>
            <Button type="submit" form="new-chat-form" disabled={createChat.isPending}>
              Start chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border/80 shadow-card">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Phone:</span>
            {client.phone ?? "—"}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Target:</span>
            {client.targetCountry ?? "—"}
          </div>
          {client.country && (
            <div className="flex items-center gap-2 text-sm sm:col-span-2">
              <MapPin className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Country:</span>
              {client.country}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {client.conversations.length === 0 && (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            )}
            {client.conversations.map((t) => (
              <Link
                key={t.id}
                to={`/conversations?thread=${t.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <span className="font-medium">{t.subject}</span>
                <Badge variant="outline" className="capitalize">
                  {t.status}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Deals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {client.deals.length === 0 && (
              <p className="text-sm text-muted-foreground">No deals yet.</p>
            )}
            {client.deals.map((d) => (
              <Link
                key={d.id}
                to={`/deals/${d.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <span className="font-medium">{d.title}</span>
                <Badge variant="secondary" className="capitalize">
                  {stageLabel(String(d.stage))}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {client.activity.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          )}
          {client.activity.map((a, i) => (
            <div key={`${a.createdAt}-${i}`}>
              <p className="text-sm">{a.description}</p>
              {i < client.activity.length - 1 && <Separator className="mt-2" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
