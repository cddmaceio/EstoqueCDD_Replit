import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const baseGradeSnapshotsTable = pgTable(
  "base_grade_snapshots",
  {
    id: serial("id").primaryKey(),
    fileName: text("file_name").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    totalRows: integer("total_rows").notNull().default(0),
  },
  (table) => ({
    uploadedAtIdx: index("base_grade_snapshots_uploaded_at_idx").on(table.uploadedAt),
  }),
);

export const baseGradeTable = pgTable(
  "base_grade",
  {
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
  },
  (table) => ({
    snapshotIdx: index("base_grade_snapshot_id_idx").on(table.snapshotId),
    codigoProdutoIdx: index("base_grade_codigo_produto_idx").on(table.codigoProduto),
  }),
);

export const insertBaseGradeSchema = createInsertSchema(baseGradeTable).omit({ id: true });
export type InsertBaseGrade = z.infer<typeof insertBaseGradeSchema>;
export type BaseGrade = typeof baseGradeTable.$inferSelect;
