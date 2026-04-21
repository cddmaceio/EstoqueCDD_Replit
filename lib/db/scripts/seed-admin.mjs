import crypto from "node:crypto";
import pg from "pg";

const { Client } = pg;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password + "cdd-maceio-salt")
    .digest("hex");
}

async function main() {
  const databaseUrl = requiredEnv("DATABASE_URL");
  const email = requiredEnv("ADMIN_EMAIL").toLowerCase();
  const password = requiredEnv("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME?.trim() || "Administrador";
  const authUserId = process.env.ADMIN_AUTH_USER_ID?.trim() || null;

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const passwordHash = hashPassword(password);

    const result = await client.query(
      `
        insert into admin_users (email, auth_user_id, name, password_hash)
        values ($1, $2, $3, $4)
        on conflict (email) do update
        set
          auth_user_id = excluded.auth_user_id,
          name = excluded.name,
          password_hash = excluded.password_hash
        returning id, email, auth_user_id, name, created_at
      `,
      [email, authUserId, name, passwordHash],
    );

    console.log(
      JSON.stringify(
        {
          success: true,
          admin: result.rows[0],
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
