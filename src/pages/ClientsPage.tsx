import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    const fd = new FormData(e.currentTarget);
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
      e.currentTarget.reset();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create client");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Clients</h2>
        {canCreate && (
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "New Client"}
          </Button>
        )}
      </div>

      {showForm && canCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New client</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="targetCountry">Target country</Label>
                <Input id="targetCountry" name="targetCountry" />
              </div>
              {formError && (
                <p className="text-sm text-destructive sm:col-span-2" role="alert">
                  {formError}
                </p>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating…" : "Create client"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="max-w-md space-y-2">
        <Label htmlFor="client-search">Search</Label>
        <Input
          id="client-search"
          placeholder="Name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading clients…</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "Failed to load clients"}
        </p>
      )}

      {!isLoading && !error && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Target country</th>
                  <th className="px-4 py-3 font-medium">Active deal</th>
                </tr>
              </thead>
              <tbody>
                {(clients ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to={`/clients/${c.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {c.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c.email}</td>
                    <td className="px-4 py-3">{c.targetCountry ?? "—"}</td>
                    <td className="px-4 py-3">{c.activeDealTitle ?? "No active deal"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(clients ?? []).length === 0 && (
              <p className="px-4 py-6 text-muted-foreground">No clients found.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
