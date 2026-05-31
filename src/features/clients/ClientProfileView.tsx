import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, MessageSquare, Phone } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/AuthContext";
import { StartConversationDialog } from "@/features/conversations/StartConversationDialog";
import { stageLabel } from "@/features/deals/constants";
import type { ClientDetail } from "./types";

const TEAM_LIST_CAP = 5;
const CLIENT_APPLICATIONS_CAP = 10;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type ClientProfileViewProps = {
  client: ClientDetail;
  clientId: string;
  variant: "team" | "client";
  headerActions?: React.ReactNode;
};

function ClientApplicationsList({ deals }: { deals: ClientDetail["deals"] }) {
  const [showAll, setShowAll] = useState(false);
  const capped = deals.length > CLIENT_APPLICATIONS_CAP;
  const visible = showAll || !capped ? deals : deals.slice(0, CLIENT_APPLICATIONS_CAP);

  return (
    <Card className="border-border/80 shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Your applications</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {deals.length === 0 && (
          <p className="text-sm text-muted-foreground">No applications yet.</p>
        )}
        {visible.map((d) => (
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
        {capped && (
          <button
            type="button"
            className="px-2 py-1 text-left text-sm font-medium text-primary hover:underline"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll
              ? "Show less"
              : `Show all ${deals.length} applications`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export function ClientProfileView({
  client,
  clientId,
  variant,
  headerActions,
}: ClientProfileViewProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [showStartDialog, setShowStartDialog] = useState(false);

  const canStartChat = role === "sales" || role === "client";
  const isClientView = variant === "client";

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
          {headerActions}
          {canStartChat && (
            <Button variant="outline" type="button" onClick={() => setShowStartDialog(true)}>
              <MessageSquare className="mr-2 size-4" />
              New conversation
            </Button>
          )}
        </div>
      </div>

      {clientId && (
        <StartConversationDialog
          open={showStartDialog}
          onOpenChange={setShowStartDialog}
          clientId={clientId}
          onCreated={(threadId) => navigate(`/conversations?thread=${threadId}`)}
        />
      )}

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

      {isClientView ? (
        <ClientApplicationsList deals={client.deals} />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/80 shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Conversations</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {client.conversations.length === 0 && (
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                )}
                {client.conversations.slice(0, TEAM_LIST_CAP).map((t) => (
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
                {client.conversations.length > TEAM_LIST_CAP && (
                  <Link
                    to="/conversations"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View all {client.conversations.length} conversations
                  </Link>
                )}
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
                {client.deals.slice(0, TEAM_LIST_CAP).map((d) => (
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
                {client.deals.length > TEAM_LIST_CAP && (
                  <Link to="/pipeline" className="text-sm font-medium text-primary hover:underline">
                    View all {client.deals.length} deals in pipeline
                  </Link>
                )}
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
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                  {i < client.activity.length - 1 && <Separator className="mt-2" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
