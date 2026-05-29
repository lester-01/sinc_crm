import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useClients, useCreateClient } from "@/features/clients/hooks";

export function ClientsPage() {
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { data: clients, isLoading, error } = useClients(search);
  const createMutation = useCreateClient();

  const canCreate = role === "manager" || role === "sales";

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const country = String(fd.get("country") ?? "").trim();
    const targetCountry = String(fd.get("targetCountry") ?? "").trim();

    try {
      await createMutation.mutateAsync({
        fullName,
        email,
        phone: phone || undefined,
        country: country || undefined,
        targetCountry: targetCountry || undefined,
      });
      form.reset();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create client");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Search and manage student profiles across your sales team."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 size-4" />
              New Client
            </Button>
          ) : undefined
        }
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New client</DialogTitle>
            <DialogDescription>Add a new student profile to the CRM.</DialogDescription>
          </DialogHeader>
          <form id="new-client-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="targetCountry">Target country</Label>
              <Input id="targetCountry" name="targetCountry" />
            </div>
            {formError && (
              <p className="text-sm text-destructive sm:col-span-2" role="alert">
                {formError}
              </p>
            )}
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" form="new-client-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="client-search"
          placeholder="Name or email"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "Failed to load clients"}
        </p>
      )}

      {!isLoading && !error && (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Target country</TableHead>
                <TableHead>Active deal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(clients ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      to={`/clients/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell>{c.targetCountry ?? "—"}</TableCell>
                  <TableCell>
                    {c.activeDealTitle ? (
                      <Badge variant="secondary">{c.activeDealTitle}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">No active deal</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(clients ?? []).length === 0 && (
            <p className="px-4 py-8 text-center text-muted-foreground">No clients found.</p>
          )}
        </div>
      )}
    </div>
  );
}
