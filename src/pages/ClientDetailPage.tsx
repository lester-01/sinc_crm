import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/features/clients/api";
import { ClientProfileView } from "@/features/clients/ClientProfileView";
import { useClient } from "@/features/clients/hooks";
import { useCreateDeal } from "@/features/deals/hooks";

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { clientId } = useParams();
  const { data: client, isLoading, error } = useClient(clientId);
  const createDeal = useCreateDeal();
  const [showDeal, setShowDeal] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealIntake, setDealIntake] = useState("Fall 2026");

  const canCreateDeal = role === "sales";
  const variant = role === "client" ? "client" : "team";

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
          <Link to="/clients">{role === "client" ? "Back to profile" : "Back to clients"}</Link>
        </Button>
      </div>
    );
  }

  if (error || !client || !clientId) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error instanceof Error ? error.message : "Client not found"}
      </p>
    );
  }

  return (
    <>
      <ClientProfileView
        client={client}
        clientId={clientId}
        variant={variant}
        headerActions={
          canCreateDeal ? (
            <Button variant="outline" type="button" onClick={() => setShowDeal(true)}>
              <Plus className="mr-2 size-4" />
              New Deal
            </Button>
          ) : undefined
        }
      />

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
    </>
  );
}
