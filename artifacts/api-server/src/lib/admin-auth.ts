import type { Request, Response } from "express";
import { db, adminUsersTable, type AdminUser } from "@workspace/db";
import { eq } from "drizzle-orm";

type AuthenticatedAdmin = Pick<
  AdminUser,
  "id" | "email" | "name" | "authUserId"
>;

type SupabaseUser = {
  id: string;
  email?: string | null;
};

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

async function getAdminById(id: number): Promise<AuthenticatedAdmin | null> {
  const [user] = await db
    .select({
      id: adminUsersTable.id,
      email: adminUsersTable.email,
      name: adminUsersTable.name,
      authUserId: adminUsersTable.authUserId,
    })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, id));

  return user ?? null;
}

async function getAdminByEmail(
  email: string,
): Promise<AuthenticatedAdmin | null> {
  const [user] = await db
    .select({
      id: adminUsersTable.id,
      email: adminUsersTable.email,
      name: adminUsersTable.name,
      authUserId: adminUsersTable.authUserId,
    })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email.toLowerCase().trim()));

  return user ?? null;
}

async function getAdminByAuthUserId(
  authUserId: string,
): Promise<AuthenticatedAdmin | null> {
  const [user] = await db
    .select({
      id: adminUsersTable.id,
      email: adminUsersTable.email,
      name: adminUsersTable.name,
      authUserId: adminUsersTable.authUserId,
    })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.authUserId, authUserId));

  return user ?? null;
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
  const user = await getAuthenticatedAdmin(req);

  if (!user) {
    res.status(401).json({ error: "Nao autenticado" });
    return null;
  }

  return user;
}
