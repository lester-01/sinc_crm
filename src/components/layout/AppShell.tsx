import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ChevronDown, GraduationCap, LogOut, Menu, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/AuthContext";
import { navItemsForRole } from "@/features/auth/nav";
import { cn } from "@/lib/utils";

function initials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell() {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const navItems = navItemsForRole(role);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 shadow-sm backdrop-blur-md">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:gap-4">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="size-9 shrink-0 p-0 md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">SINC Sales CRM</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card">
              <GraduationCap className="size-5" />
            </div>
            <h1 className="hidden text-lg font-semibold tracking-tight sm:block">
              SINC Sales CRM
            </h1>
          </div>

          <nav className="hidden min-w-0 flex-1 justify-center gap-0.5 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors lg:px-4",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <span className="hidden xl:inline">{item.label}</span>
                <span className="xl:hidden">
                  {item.label === "Conversations" ? "Chats" : item.label}
                </span>
              </NavLink>
            ))}
          </nav>

          <div
            className="relative ml-auto hidden max-w-xs flex-1 lg:block"
            title="Global search (coming soon)"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search…"
              className="border-border/80 bg-background/80 pl-9"
              aria-label="Search"
              aria-describedby="search-hint"
              disabled
            />
            <span id="search-hint" className="sr-only">
              Global search is coming soon
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-2 border-border/80"
                aria-haspopup="menu"
              >
                <Avatar className="size-6">
                  <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                    {initials(profile?.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[100px] truncate">{profile?.fullName ?? "Account"}</span>
                <ChevronDown className="size-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[100] w-56">
              <DropdownMenuLabel>
                <div className="text-sm font-medium">{profile?.fullName}</div>
                <div className="text-xs font-normal capitalize text-muted-foreground">
                  {role ?? "…"}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void signOut().then(() => navigate("/login"));
                }}
              >
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-7xl animate-fade-up px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
