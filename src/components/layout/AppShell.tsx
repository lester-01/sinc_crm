import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/clients", label: "Clients" },
  { to: "/conversations", label: "Conversations" },
  { to: "/pipeline", label: "Pipeline" },
];

export function AppShell() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-lg font-semibold">SINC Sales CRM</h1>
          <nav className="flex gap-4 text-sm">
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
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
