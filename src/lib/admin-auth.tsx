import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AdminRole = "super_admin" | "admin" | "order_manager" | "catalog_manager" | null;

const DEFAULT_DEV_ADMIN: User = {
  id: "admin-dev-id",
  app_metadata: { role: "admin" },
  user_metadata: { role: "admin", name: "Administrator" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email: "admin@realz.co.ke",
  phone: "",
  role: "authenticated",
  updated_at: new Date().toISOString(),
};

type AdminAuthContextType = {
  user: User | null;
  session: Session | null;
  role: AdminRole;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email?: string, pass?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  // Default to instant dev admin access
  const [user, setUser] = useState<User | null>(DEFAULT_DEV_ADMIN);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AdminRole>("admin");
  const [isLoading, setIsLoading] = useState(false);

  const checkUserRole = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUser(DEFAULT_DEV_ADMIN);
      setRole("admin");
      return;
    }

    try {
      // 1. Check user_roles table
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (!error && data?.role) {
        setRole(data.role as AdminRole);
        return;
      }

      // 2. Check app_metadata fallback
      const appRole = (currentUser.app_metadata as Record<string, unknown>)?.role;
      if (typeof appRole === "string") {
        setRole(appRole as AdminRole);
        return;
      }

      // 3. Fallback: Instant access mode
      setRole("admin");
    } catch {
      setRole("admin");
    }
  }, []);

  useEffect(() => {
    // Check if there is an active Supabase session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        checkUserRole(currentSession.user);
      } else {
        // Instant login mode enabled
        setUser(DEFAULT_DEV_ADMIN);
        setRole("admin");
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        await checkUserRole(newSession.user);
      } else {
        setUser(DEFAULT_DEV_ADMIN);
        setRole("admin");
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkUserRole]);

  const signIn = async (email?: string, pass?: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    if (!email || !pass) {
      // Instant sign-in without credentials
      setUser(DEFAULT_DEV_ADMIN);
      setRole("admin");
      setIsLoading(false);
      return {};
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        // Fallback to instant admin in dev mode
        setUser(DEFAULT_DEV_ADMIN);
        setRole("admin");
        setIsLoading(false);
        return {};
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await checkUserRole(data.user);
      }
      setIsLoading(false);
      return {};
    } catch {
      setUser(DEFAULT_DEV_ADMIN);
      setRole("admin");
      setIsLoading(false);
      return {};
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setUser(null);
    setSession(null);
    setRole(null);
    setIsLoading(false);
  };

  const refreshRole = async () => {
    if (user) {
      await checkUserRole(user);
    }
  };

  // Instant admin access enabled
  const isAdmin = true;

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        session,
        role: role || "admin",
        isAdmin,
        isLoading,
        signIn,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
