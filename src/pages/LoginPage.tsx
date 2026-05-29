import { useState } from "react";
import { Navigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/AuthContext";
import { defaultPathForRole } from "@/features/auth/nav";

export function LoginPage() {
  const { session, role, loading, signIn, signUpClient } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session && role) {
    return <Navigate to={defaultPathForRole(role)} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else {
        await signUpClient({
          email: email.trim(),
          password,
          fullName: fullName.trim() || (email.split("@")[0] ?? "Client"),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(14_90%_58%/0.35),transparent_50%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm">
            <GraduationCap className="size-6" />
          </div>
          <span className="font-display text-xl font-semibold">SINC Sales CRM</span>
        </div>
        <div className="relative space-y-4">
          <h2 className="font-display text-4xl font-semibold leading-tight text-balance">
            Guide students from first inquiry to enrollment.
          </h2>
          <p className="max-w-md text-primary-foreground/80">
            Manage conversations, track deals through every stage, and keep your education sales
            team aligned — all in one place.
          </p>
        </div>
        <p className="relative text-sm text-primary-foreground/60">
          Demo accounts available · Password: demo1234
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm border-border/80 shadow-elevated">
          <CardHeader className="space-y-1">
            <CardTitle className="font-display text-2xl">
              {mode === "signin" ? "Sign in" : "Create client account"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Use your demo or registered email."
                : "Self-register as a client (demo)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "signup" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
              </Button>
            </form>
            <Separator className="my-4" />
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
            >
              {mode === "signin"
                ? "Need an account? Sign up as client"
                : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
