import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search } from "lucide-react";
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
import { ClientProfileView } from "@/features/clients/ClientProfileView";
import { useClient, useClients, useCreateClient } from "@/features/clients/hooks";
import type { ClientListItem, ClientListFilter } from "@/features/clients/types";

const PAGE_SIZE = 25;
type SortKey = "fullName" | "email" | "targetCountry" | "activeDealTitle" | "createdAt";
type SalesFilter = ClientListFilter;

function sortClients(
  rows: ClientListItem[],
  key: SortKey,
  dir: "asc" | "desc",
): ClientListItem[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = (a[key] ?? "") as string;
    const bv = (b[key] ?? "") as string;
    return av.localeCompare(bv) * mul;
  });
}

export function ClientsPage() {
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [salesFilter, setSalesFilter] = useState<SalesFilter>("mine");

  const clientFilter =
    role === "sales"
      ? salesFilter
      : undefined;
  const ownerId =
    role === "sales" && salesFilter === "mine" ? profile?.id : undefined;

  const { data: clients, isLoading, error } = useClients(search, { ownerId, clientFilter });
  const ownClientId = role === "client" ? clients?.[0]?.id : undefined;
  const {
    data: ownClientDetail,
    isLoading: ownDetailLoading,
    error: ownDetailError,
  } = useClient(ownClientId);
  const createMutation = useCreateClient();

  const canCreate = role === "manager" || role === "sales";

  const description =
    role === "client"
      ? "View and update your student profile."
      : role === "sales"
        ? "Search and manage student profiles you work with."
        : "Search and manage student profiles across your sales team.";

  const sorted = useMemo(
    () => sortClients(clients ?? [], sortKey, sortDir),
    [clients, sortKey, sortDir],
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="ml-1 inline size-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline size-3" />
    ) : (
      <ArrowDown className="ml-1 inline size-3" />
    );
  }

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
      const msg = err instanceof Error ? err.message : "Failed to create client";
      setFormError(
        msg.toLowerCase().includes("already exists")
          ? "A client with this email already exists."
          : msg,
      );
    }
  }

  if (role === "client") {
    const profileLoading = isLoading || ownDetailLoading;
    const profileError = error ?? ownDetailError;

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Profile"
          description="Your student profile and applications."
        />
        {profileLoading && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        )}
        {profileError && (
          <p className="text-sm text-destructive" role="alert">
            {profileError instanceof Error ? profileError.message : "Failed to load profile"}
          </p>
        )}
        {!profileLoading && !profileError && ownClientDetail && ownClientId && (
          <ClientProfileView
            client={ownClientDetail}
            clientId={ownClientId}
            variant="client"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description={description}
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 size-4" />
              New Client
            </Button>
          ) : undefined
        }
      />

      {role === "sales" && (
        <div className="flex gap-2 rounded-lg bg-muted/60 p-1 w-fit">
          {(
            [
              { id: "mine" as const, label: "Mine" },
              { id: "unassigned" as const, label: "Unassigned" },
              { id: "all" as const, label: "All" },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={salesFilter === tab.id ? "default" : "outline"}
              onClick={() => {
                setSalesFilter(tab.id);
                setPage(0);
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      )}

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setFormError(null);
        }}
      >
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
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
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
        <>
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>
                    <button type="button" className="font-medium" onClick={() => toggleSort("fullName")}>
                      Name
                      <SortIcon column="fullName" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" className="font-medium" onClick={() => toggleSort("email")}>
                      Email
                      <SortIcon column="email" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="font-medium"
                      onClick={() => toggleSort("targetCountry")}
                    >
                      Target country
                      <SortIcon column="targetCountry" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="font-medium"
                      onClick={() => toggleSort("createdAt")}
                    >
                      Created
                      <SortIcon column="createdAt" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="font-medium"
                      onClick={() => toggleSort("activeDealTitle")}
                    >
                      Active deal
                      <SortIcon column="activeDealTitle" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/clients/${c.id}`)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-primary">{c.fullName}</span>
                        <span className="text-xs text-muted-foreground">{c.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell>{c.targetCountry ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
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
            {sorted.length === 0 && (
              <p className="px-4 py-8 text-center text-muted-foreground">No clients found.</p>
            )}
          </div>
          {sorted.length > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {pageSafe + 1} of {pageCount} ({sorted.length} clients)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pageSafe <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pageSafe >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
