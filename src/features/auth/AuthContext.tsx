import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { fetchMe } from "./api";
import type { AppRole, MeProfile } from "./types";

interface AuthContextValue {
  session: Session | null;
  profile: MeProfile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUpClient: (params: {
    email: string;
    password: string;
    fullName: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: authReady && !!session,
    retry: false,
  });

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpClient = useCallback(
    async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: "client", full_name: fullName },
        },
      });
      if (error) throw error;
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile: meQuery.data ?? null,
      role: meQuery.data?.role ?? null,
      loading: !authReady || (!!session && meQuery.isLoading),
      signIn,
      signUpClient,
      signOut,
    }),
    [session, meQuery.data, meQuery.isLoading, authReady, signIn, signUpClient, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
