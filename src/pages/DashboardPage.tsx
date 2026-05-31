import { Navigate, Link } from "react-router-dom";
import {
  MessageSquare,
  TrendingUp,
  Trophy,
  UserX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/features/auth/AuthContext";
import { defaultPathForRole } from "@/features/auth/nav";
import { DEAL_STAGES, stageLabel } from "@/features/deals/constants";
import { useDashboard } from "@/features/dashboard/hooks";
import { cn } from "@/lib/utils";

const METRICS = [
  {
    key: "openChats" as const,
    label: "Open Chats",
    icon: MessageSquare,
    accent: "text-primary",
    href: "/conversations?queue=unassigned",
  },
  {
    key: "unassignedConversations" as const,
    label: "Unassigned",
    icon: UserX,
    accent: "text-accent",
    href: "/conversations?queue=unassigned",
  },
  {
    key: "activeDeals" as const,
    label: "Active Deals",
    icon: TrendingUp,
    accent: "text-chart-4",
    href: "/pipeline",
  },
  {
    key: "wonDeals" as const,
    label: "Won Deals",
    icon: Trophy,
    accent: "text-primary",
    href: "/pipeline",
  },
];

const ACTIVITY_CAP = 10;

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: number;
  icon: typeof MessageSquare;
  accent: string;
  href: string;
}) {
  return (
    <Link to={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="border-border/80 shadow-card transition-shadow hover:shadow-elevated">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <div className={cn("rounded-lg bg-muted p-2", accent)}>
            <Icon className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-display text-3xl font-semibold tabular-nums">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { role } = useAuth();
  const { data, isLoading, error } = useDashboard();

  if (role && role !== "manager") {
    return <Navigate to={defaultPathForRole(role)} replace />;
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error instanceof Error ? error.message : "Failed to load dashboard"}
      </p>
    );
  }

  const recent = data.recentActivity.slice(0, ACTIVITY_CAP);
  const hiddenActivity = data.recentActivity.length - recent.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Overview of conversations, pipeline health, and team workload."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map(({ key, label, icon, accent, href }) => (
          <MetricCard
            key={key}
            label={label}
            value={data[key]}
            icon={icon}
            accent={accent}
            href={href}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEAL_STAGES.map((stage) => (
                  <TableRow key={stage}>
                    <TableCell className="capitalize">{stageLabel(stage)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {data.dealsByStage[stage] ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Deals by Owner</CardTitle>
          </CardHeader>
          <ScrollArea className="max-h-64">
            <CardContent>
              {data.dealsByOwner.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deals yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Deals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dealsByOwner.map((row) => (
                      <TableRow key={row.ownerId ?? "unassigned"}>
                        <TableCell>{row.ownerName}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {row.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>

      {data.recentActivity.length > 0 && (
        <Card className="border-border/80 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <ScrollArea className="max-h-64">
            <CardContent className="flex flex-col gap-3">
              {recent.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <p className="text-sm">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {hiddenActivity > 0 && (
                <p className="text-xs text-muted-foreground">
                  + {hiddenActivity} older activities not shown
                </p>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
