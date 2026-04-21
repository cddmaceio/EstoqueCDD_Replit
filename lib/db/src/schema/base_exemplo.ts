import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const baseExemploSnapshotsTable = pgTable(
  "base_exemplo_snapshots",
  {
    id: serial("id").primaryKey(),
    fileName: text("file_name").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    totalRows: integer("total_rows").notNull().default(0),
  },
  (table) => ({
    uploadedAtIdx: index("base_exemplo_snapshots_uploaded_at_idx").on(table.uploadedAt),
  }),
);

export const baseExemploTable = pgTable("base_exemplo", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").notNull(),
  idPromax: text("id_promax").notNull().default(""),
  nomeAjudante: text("nome_ajudante").notNull().default(""),
  cpf: text("cpf").notNull().default(""),
  cracha: text("cracha").notNull().default(""),
  tipo: text("tipo").notNull().default(""),
  setor: text("setor").notNull().default(""),
  prestador: text("prestador").notNull().default(""),
  turno: text("turno").notNull().default(""),
  status: text("status").notNull().default(""),
  cdSupervisor: text("cd_supervisor").notNull().default(""),
  cdConferenteLider: text("cd_conferente_lider").notNull().default(""),
  inicioVigencia: text("inicio_vigencia").notNull().default(""),
  metaPalletDia: integer("meta_pallet_dia").notNull().default(0),
  metaPalletHora: integer("meta_pallet_hora").notNull().default(0),
}, (table) => ({
  snapshotIdx: index("base_exemplo_snapshot_id_idx").on(table.snapshotId),
  cpfIdx: index("base_exemplo_cpf_idx").on(table.cpf),
}));

export const insertBaseExemploSchema = createInsertSchema(baseExemploTable).omit({ id: true });
export type InsertBaseExemplo = z.infer<typeof insertBaseExemploSchema>;
export type BaseExemplo = typeof baseExemploTable.$inferSelect;
