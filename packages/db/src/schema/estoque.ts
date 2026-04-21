import {
  pgTable,
  text,
  serial,
  timestamp,
  real,
  integer,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminUsersTable = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    authUserId: uuid("auth_user_id").unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("admin_users_created_at_idx").on(table.createdAt),
  }),
);

export const insertAdminUserSchema = createInsertSchema(adminUsersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsersTable.$inferSelect;

export const uploadSnapshotsTable = pgTable(
  "upload_snapshots",
  {
    id: serial("id").primaryKey(),
    fileName: text("file_name").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    totalRows: integer("total_rows").notNull().default(0),
  },
  (table) => ({
    uploadedAtIdx: index("upload_snapshots_uploaded_at_idx").on(table.uploadedAt),
  }),
);

export const estoqueItemsTable = pgTable(
  "estoque_items",
  {
    id: serial("id").primaryKey(),
    snapshotId: integer("snapshot_id").notNull(),
    produto: text("produto").notNull(),
    marca: text("marca").notNull(),
    embalagem: text("embalagem").notNull().default(""),
    doi: real("doi").notNull().default(0),
    status: text("status").notNull().default("OK"),
    demanda: real("demanda").notNull().default(0),
    min: real("min").notNull().default(0),
    max: real("max").notNull().default(0),
    curva: text("curva").notNull().default("C"),
  },
  (table) => ({
    snapshotIdx: index("estoque_items_snapshot_id_idx").on(table.snapshotId),
    marcaIdx: index("estoque_items_marca_idx").on(table.marca),
    statusIdx: index("estoque_items_status_idx").on(table.status),
    curvaIdx: index("estoque_items_curva_idx").on(table.curva),
  }),
);

export const insertEstoqueItemSchema = createInsertSchema(
  estoqueItemsTable,
).omit({ id: true });
export type InsertEstoqueItem = z.infer<typeof insertEstoqueItemSchema>;
export type EstoqueItem = typeof estoqueItemsTable.$inferSelect;
