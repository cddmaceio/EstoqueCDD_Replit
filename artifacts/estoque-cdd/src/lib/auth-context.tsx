import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import {
  adminLogin,
  adminLogout,
  getAuthMe,
  setAuthTokenGetter,
} from "@workspace/api-client-react";
import { getSupabaseClient, hasSupabaseConfig } from "./supabase";

const AUTH_SOURCE_KEY = "estoque-cdd-auth-source";

function getAuthMode(): "hybrid" | "legacy" | "supabase" {
  const mode = import.meta.env.VITE_AUTH_MODE;
  if (mode === "legacy" || mode === "supabase") {
    return mode;
  }
  if (import.meta.env.DEV) {
    return "legacy";
  }
  return "hybrid";
}

type AuthUser = {
  email: string;
  displayName: string;
  source: "supabase" | "legacy";
  rawSupabaseUser?: User | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAuthSource(): "supabase" | "legacy" | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(AUTH_SOURCE_KEY);
  return value === "supabase" || value === "legacy" ? value : null;
}

function storeAuthSource(source: "supabase" | "legacy" | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!source) {
    window.localStorage.removeItem(AUTH_SOURCE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_SOURCE_KEY, source);
}

function mapSupabaseUser(user: User): AuthUser {
  return {
    email: user.email ?? "",
    displayName:
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : user.email ?? "",
    source: "supabase",
    rawSupabaseUser: user,
  };
}

async function fetchLegacyUser(): Promise<AuthUser | null> {
  try {
    const user = await getAuthMe();
    return {
      email: user.email,
      displayName: user.name,
      source: "legacy",
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const authMode = getAuthMode();

    async function hydrateAuthState() {
      if (authMode === "legacy" && getStoredAuthSource() !== "legacy") {
        setAuthTokenGetter(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (authMode !== "legacy" && hasSupabaseConfig()) {
        const supabase = getSupabaseClient();

        setAuthTokenGetter(async () => {
          const { data } = await supabase.auth.getSession();
          return data.session?.access_token ?? null;
        });

        const { data } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (data.user) {
          storeAuthSource("supabase");
          setUser(mapSupabaseUser(data.user));
          setIsLoading(false);
          return;
        }

        if (authMode === "supabase" || getStoredAuthSource() !== "legacy") {
          setUser(null);
          setIsLoading(false);
          return;
        }
      }

      if (authMode === "legacy" || !hasSupabaseConfig()) {
        setAuthTokenGetter(null);
      }

      const legacyUser = await fetchLegacyUser();
      if (!isMounted) return;

      if (legacyUser) {
        storeAuthSource("legacy");
      } else {
        storeAuthSource(null);
      }

      setUser(legacyUser);
      setIsLoading(false);
    }

    void hydrateAuthState();

    if (authMode === "legacy" || !hasSupabaseConfig()) {
      return () => {
        isMounted = false;
        setAuthTokenGetter(null);
      };
    }

    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        storeAuthSource("supabase");
        setUser(mapSupabaseUser(session.user));
      } else if (getStoredAuthSource() === "legacy") {
        const legacyUser = await fetchLegacyUser();
        if (legacyUser) {
          storeAuthSource("legacy");
          setUser(legacyUser);
        } else {
          storeAuthSource(null);
          setUser(null);
        }
      } else {
        storeAuthSource(null);
        setUser(null);
      }

      void queryClient.invalidateQueries();
    });

    return () => {
      isMounted = false;
      setAuthTokenGetter(null);
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signInWithPassword = async (email: string, password: string) => {
    const authMode = getAuthMode();

    if (authMode !== "legacy" && hasSupabaseConfig()) {
      try {
        const { error } = await getSupabaseClient().auth.signInWithPassword({
          email,
          password,
        });

        if (!error) {
          storeAuthSource("supabase");
          return;
        }

        if (authMode === "supabase") {
          throw error;
        }
      } catch {
        if (authMode === "supabase") {
          throw new Error("Não foi possível autenticar com o Supabase.");
        }
      }
    }

    const response = await adminLogin({ email, password });
    storeAuthSource("legacy");
    setUser({
      email: response.user.email,
      displayName: response.user.name,
      source: "legacy",
    });
    void queryClient.invalidateQueries();
  };

  const signOut = async () => {
    if (user?.source === "supabase" && hasSupabaseConfig()) {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) {
        throw error;
      }
    } else {
      await adminLogout();
      setUser(null);
    }

    storeAuthSource(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signInWithPassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }

  return context;
}
