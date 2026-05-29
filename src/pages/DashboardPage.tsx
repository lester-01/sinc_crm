import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthContext";
import { defaultPathForRole } from "@/features/auth/nav";
import { DEAL_STAGES, stageLabel } from "@/features/deals/constants";
import { useDashboard } from "@/features/dashboard/hooks";

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { role } = useAuth();
  const { data, isLoading, error } = useDashboard();

  if (role && role !== "manager") {
    return <Navigate to={defaultPathForRole(role)} replace />;
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error instanceof Error ? error.message : "Failed to load dashboard"}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Open Chats" value={data.openChats} />
        <MetricCard label="Unassigned" value={data.unassignedConversations} />
        <MetricCard label="Active Deals" value={data.activeDeals} />
        <MetricCard label="Won Deals" value={data.wonDeals} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DEAL_STAGES.map((stage) => (
              <div key={stage} className="flex justify-between text-sm">
                <span className="capitalize">{stageLabel(stage)}</span>
                <span className="font-medium tabular-nums">{data.dealsByStage[stage] ?? 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deals by Owner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.dealsByOwner.length === 0 && (
              <p className="text-sm text-muted-foreground">No deals yet.</p>
            )}
            {data.dealsByOwner.map((row) => (
              <div key={row.ownerId ?? "unassigned"} className="flex justify-between text-sm">
                <span>{row.ownerName}</span>
                <span className="font-medium tabular-nums">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {data.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentActivity.map((item) => (
              <p key={item.id} className="border-b border-border py-2 text-sm last:border-0">
                {item.description}
                <span className="block text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
