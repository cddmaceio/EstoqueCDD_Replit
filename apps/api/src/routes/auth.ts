import { Router, type IRouter } from "express";
import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { getAuthenticatedAdmin } from "../lib/admin-auth";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + "cdd-maceio-salt")
    .digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email e senha sao obrigatorios" });
    return;
  }

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email.toLowerCase().trim()));

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }

  if (!req.session) {
    res.status(503).json({ error: "Login legado indisponivel neste ambiente" });
    return;
  }

  req.session.userId = user.id;
  req.session.userEmail = user.email;

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  if (!req.session?.destroy) {
    res.json({ success: true });
    return;
  }

  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getAuthenticatedAdmin(req);

  if (!user) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
});

export default router;
