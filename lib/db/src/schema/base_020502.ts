import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const base020502SnapshotsTable = pgTable("base_020502_snapshots", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  totalRows: integer("total_rows").notNull().default(0),
});

export const base020502Table = pgTable("base_020502", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").notNull(),
  armazem: text("armazem").notNull().default(""),
  deposito: text("deposito").notNull().default(""),
  produto: text("produto").notNull().default(""),
  descricao: text("descricao").notNull().default(""),
  unidade: text("unidade").notNull().default(""),
  saldoAnterior: text("saldo_anterior").notNull().default(""),
  entradas: text("entradas").notNull().default(""),
  saidas: text("saidas").notNull().default(""),
  saldoAtual: text("saldo_atual").notNull().default(""),
  transito: text("transito").notNull().default(""),
  disponivel: text("disponivel").notNull().default(""),
  inventario: text("inventario").notNull().default(""),
  diferenca: text("diferenca").notNull().default(""),
  diferencaCongelamento: text("diferenca_congelamento").notNull().default(""),
  transAnt: text("trans_ant").notNull().default(""),
  transAntNaoCarregado: text("trans_ant_nao_carregado").notNull().default(""),
  transDiaNaoCarregado: text("trans_dia_nao_carregado").notNull().default(""),
  comodatoOp03: text("comodato_op03").notNull().default(""),
  vendaVasOp85: text("venda_vas_op85").notNull().default(""),
  valorizacao: text("valorizacao").notNull().default(""),
  saldoUnitario: text("saldo_unitario").notNull().default(""),
  saldoAtualReal: text("saldo_atual_real").notNull().default(""),
  saldoGradeReal: text("saldo_grade_real").notNull().default(""),
});

export const insertBase020502Schema = createInsertSchema(base020502Table).omit({ id: true });
export type InsertBase020502 = z.infer<typeof insertBase020502Schema>;
export type Base020502 = typeof base020502Table.$inferSelect;
