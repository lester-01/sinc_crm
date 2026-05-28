import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/AuthContext";
import { navItemsForRole } from "@/features/auth/nav";
import { cn } from "@/lib/utils";

export function AppShell() {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const navItems = navItemsForRole(role);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          <h1 className="shrink-0 text-lg font-semibold">SINC Sales CRM</h1>
          <nav className="flex flex-1 justify-center gap-4 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "text-muted-foreground hover:text-foreground",
                    isActive && "font-medium text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                {profile?.fullName ?? "Account"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
