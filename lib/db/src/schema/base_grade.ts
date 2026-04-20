import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const baseGradeSnapshotsTable = pgTable("base_grade_snapshots", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  totalRows: integer("total_rows").notNull().default(0),
});

export const baseGradeTable = pgTable("base_grade", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").notNull(),
  codigoProduto: integer("codigo_produto").notNull(),
  descricaoProduto: text("descricao_produto").notNull().default(""),
  unidadeMedida: text("unidade_medida").notNull().default(""),
  gradeEstoque: integer("grade_estoque").notNull().default(0),
  gradeCadastrada: integer("grade_cadastrada").notNull().default(0),
  reserva: integer("reserva").notNull().default(0),
  saida: integer("saida").notNull().default(0),
  saldoDisponivel: integer("saldo_disponivel").notNull().default(0),
});

export const insertBaseGradeSchema = createInsertSchema(baseGradeTable).omit({ id: true });
export type InsertBaseGrade = z.infer<typeof insertBaseGradeSchema>;
export type BaseGrade = typeof baseGradeTable.$inferSelect;
