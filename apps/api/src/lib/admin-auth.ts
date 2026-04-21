import type { Request, Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AuthenticatedAdmin = {
  id: number;
  email: string;
  name: string;
  authUserId: string | null;
};

type SupabaseUser = {
  id: string;
  email?: string | null;
};

let supabaseAdminClient: SupabaseClient | null = null;

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) sao obrigatorios para autenticar administradores.",
    );
  }

  supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
}

function mapAdminRow(row: Record<string, unknown> | null): AuthenticatedAdmin | null {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
    authUserId: row.auth_user_id == null ? null : String(row.auth_user_id),
  };
}

async function getAdminById(id: number): Promise<AuthenticatedAdmin | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("admin_users")
    .select("id, email, name, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapAdminRow((data as Record<string, unknown> | null) ?? null);
}

async function getAdminByEmail(
  email: string,
): Promise<AuthenticatedAdmin | null> {
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await getSupabaseAdminClient()
    .from("admin_users")
    .select("id, email, name, auth_user_id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapAdminRow((data as Record<string, unknown> | null) ?? null);
}

async function getAdminByAuthUserId(
  authUserId: string,
): Promise<AuthenticatedAdmin | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("admin_users")
    .select("id, email, name, auth_user_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapAdminRow((data as Record<string, unknown> | null) ?? null);
}

async function getSupabaseUser(token: string): Promise<SupabaseUser | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SupabaseUser;
}

export async function getAuthenticatedAdmin(
  req: Request,
): Promise<AuthenticatedAdmin | null> {
  if (req.session?.userId) {
    return getAdminById(req.session.userId);
  }

  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const supabaseUser = await getSupabaseUser(token);
  if (supabaseUser?.id) {
    const userByAuthId = await getAdminByAuthUserId(supabaseUser.id);
    if (userByAuthId) {
      return userByAuthId;
    }
  }

  const email = supabaseUser?.email?.toLowerCase().trim();

  if (!email) {
    return null;
  }

  return getAdminByEmail(email);
}

export async function requireAdmin(
  req: Request,
  res: Response,
): Promise<AuthenticatedAdmin | null> {
  try {
    const user = await getAuthenticatedAdmin(req);

    if (!user) {
      res.status(401).json({ error: "Nao autenticado" });
      return null;
    }

    return user;
  } catch (error) {
    req.log.error({ error }, "admin auth failed");
    res.status(500).json({ error: "Falha ao validar autenticacao administrativa" });
    return null;
  }
}
