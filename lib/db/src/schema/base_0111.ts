import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const base0111SnapshotsTable = pgTable("base_0111_snapshots", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  totalRows: integer("total_rows").notNull().default(0),
});

export const base0111Table = pgTable("base_0111", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").notNull(),
  codigo: text("codigo").notNull().default(""),
  descricao: text("descricao").notNull().default(""),
  pgv: text("pgv").notNull().default(""),
  empresa: text("empresa").notNull().default(""),
  tipoMarca: text("tipo_marca").notNull().default(""),
  linhaMarca: text("linha_marca").notNull().default(""),
  embalagem: text("embalagem").notNull().default(""),
  marca: text("marca").notNull().default(""),
  vasilhame: text("vasilhame").notNull().default(""),
  garrafeira: text("garrafeira").notNull().default(""),
  icms: text("icms").notNull().default(""),
  tipoRoadshow: text("tipo_roadshow").notNull().default(""),
  pesoBrutoKg: real("peso_bruto_kg").notNull().default(0),
  fator: real("fator").notNull().default(0),
  fatorHecto: real("fator_hecto").notNull().default(0),
  fatorHectoComercial: real("fator_hecto_comercial").notNull().default(0),
  indPalmtop: text("ind_palmtop").notNull().default(""),
  grupo: text("grupo").notNull().default(""),
  grupoRemuneracao: text("grupo_remuneracao").notNull().default(""),
  ean: text("ean").notNull().default(""),
  tabelaIcms: text("tabela_icms").notNull().default(""),
  caixasPallet: integer("caixas_pallet").notNull().default(0),
  nrFatorConversao: real("nr_fator_conversao").notNull().default(0),
  lastro: text("lastro").notNull().default(""),
  famEmbalagemSiv: text("fam_embalagem_siv").notNull().default(""),
  pautaPisLitro: real("pauta_pis_litro").notNull().default(0),
  pautaCofinsLitro: real("pauta_cofins_litro").notNull().default(0),
  produtoPremium: text("produto_premium").notNull().default(""),
  ncm: text("ncm").notNull().default(""),
  cest: text("cest").notNull().default(""),
  ean1: text("ean_trib").notNull().default(""),
  codigoUnitario: text("codigo_unitario").notNull().default(""),
  descricaoUnitaria: text("descricao_unitaria").notNull().default(""),
  codigoProdutoSap: text("codigo_produto_sap").notNull().default(""),
});

export const insertBase0111Schema = createInsertSchema(base0111Table).omit({ id: true });
export type InsertBase0111 = z.infer<typeof insertBase0111Schema>;
export type Base0111 = typeof base0111Table.$inferSelect;
