import { pgTable, text, serial, timestamp, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const baseProducaoSnapshotsTable = pgTable(
  "base_producao_snapshots",
  {
    id: serial("id").primaryKey(),
    fileName: text("file_name").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    totalRows: integer("total_rows").notNull().default(0),
  },
  (table) => ({
    uploadedAtIdx: index("base_producao_snapshots_uploaded_at_idx").on(table.uploadedAt),
  }),
);

export const baseProducaoTable = pgTable("base_producao", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").notNull(),
  date: text("date").notNull().default(""),
  descricaoUnidade: text("descricao_unidade").notNull().default(""),
  codSap: text("cod_sap").notNull().default(""),
  descrProdAbreviada: text("descr_prod_abreviada").notNull().default(""),
  embalagem: text("embalagem").notNull().default(""),
  fatorRa24: real("fator_ra24").notNull().default(0),
}, (table) => ({
  snapshotIdx: index("base_producao_snapshot_id_idx").on(table.snapshotId),
  codSapIdx: index("base_producao_cod_sap_idx").on(table.codSap),
  dateIdx: index("base_producao_date_idx").on(table.date),
}));

export const insertBaseProducaoSchema = createInsertSchema(baseProducaoTable).omit({ id: true });
export type InsertBaseProducao = z.infer<typeof insertBaseProducaoSchema>;
export type BaseProducao = typeof baseProducaoTable.$inferSelect;
