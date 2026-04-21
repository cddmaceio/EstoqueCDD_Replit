import { pgTable, text, serial, timestamp, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const base020501SnapshotsTable = pgTable(
  "base_020501_snapshots",
  {
    id: serial("id").primaryKey(),
    fileName: text("file_name").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    totalRows: integer("total_rows").notNull().default(0),
  },
  (table) => ({
    uploadedAtIdx: index("base_020501_snapshots_uploaded_at_idx").on(table.uploadedAt),
  }),
);

export const base020501Table = pgTable("base_020501", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").notNull(),
  data: text("data").notNull().default(""),
  docum: text("docum").notNull().default(""),
  serie: text("serie").notNull().default(""),
  nrBo: text("nr_bo").notNull().default(""),
  armazem: text("armazem").notNull().default(""),
  depositoEntrada: text("deposito_entrada").notNull().default(""),
  depositoSaida: text("deposito_saida").notNull().default(""),
  item: text("item").notNull().default(""),
  descricao: text("descricao").notNull().default(""),
  unidade: text("unidade").notNull().default(""),
  mapa: text("mapa").notNull().default(""),
  codOperacao: text("cod_operacao").notNull().default(""),
  tipoOperacao: text("tipo_operacao").notNull().default(""),
  tipoMov: text("tipo_mov").notNull().default(""),
  entradaInteiras: text("entrada_inteiras").notNull().default(""),
  entradaAvulsas: text("entrada_avulsas").notNull().default(""),
  usuario: text("usuario").notNull().default(""),
  hora: text("hora").notNull().default(""),
  responsabilidade: text("responsabilidade").notNull().default(""),
  numeroDocumentoSap: text("numero_documento_sap").notNull().default(""),
  numeroControle: text("numero_controle").notNull().default(""),
  filialOrigem: text("filial_origem").notNull().default(""),
  transportadora: text("transportadora").notNull().default(""),
  fabrica: text("fabrica").notNull().default(""),
  historicoMotivo: text("historico_motivo").notNull().default(""),
  areaArm: text("area_arm").notNull().default(""),
  turno: text("turno").notNull().default(""),
  conferente: text("conferente").notNull().default(""),
  opEmp: text("op_emp").notNull().default(""),
  ajudante: text("ajudante").notNull().default(""),
  prestServ: text("prest_serv").notNull().default(""),
  precoMedio: real("preco_medio").notNull().default(0),
  precoTotal: real("preco_total").notNull().default(0),
  motivo: text("motivo").notNull().default(""),
  dtValidade: text("dt_validade").notNull().default(""),
  lote: text("lote").notNull().default(""),
}, (table) => ({
  snapshotIdx: index("base_020501_snapshot_id_idx").on(table.snapshotId),
  itemIdx: index("base_020501_item_idx").on(table.item),
  dataIdx: index("base_020501_data_idx").on(table.data),
}));

export const insertBase020501Schema = createInsertSchema(base020501Table).omit({ id: true });
export type InsertBase020501 = z.infer<typeof insertBase020501Schema>;
export type Base020501 = typeof base020501Table.$inferSelect;
