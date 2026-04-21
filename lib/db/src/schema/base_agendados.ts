import { pgTable, text, serial, timestamp, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const baseAgendadosSnapshotsTable = pgTable(
  "base_agendados_snapshots",
  {
    id: serial("id").primaryKey(),
    fileName: text("file_name").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    totalRows: integer("total_rows").notNull().default(0),
  },
  (table) => ({
    uploadedAtIdx: index("base_agendados_snapshots_uploaded_at_idx").on(table.uploadedAt),
  }),
);

export const baseAgendadosTable = pgTable("base_agendados", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").notNull(),
  dataEntregaOriginal: text("data_entrega_original").notNull().default(""),
  geoVenda: text("geo_venda").notNull().default(""),
  codUnidadeVenda: text("cod_unidade_venda").notNull().default(""),
  descUnidadeVenda: text("desc_unidade_venda").notNull().default(""),
  numeroPedido: text("numero_pedido").notNull().default(""),
  numeroPedidoCliente: text("numero_pedido_cliente").notNull().default(""),
  dataEntrega: text("data_entrega").notNull().default(""),
  cpfCnpjCliente: text("cpf_cnpj_cliente").notNull().default(""),
  codCliente: text("cod_cliente").notNull().default(""),
  nomeCliente: text("nome_cliente").notNull().default(""),
  nomeFantasia: text("nome_fantasia").notNull().default(""),
  tipoPedido: text("tipo_pedido").notNull().default(""),
  idPedido: text("id_pedido").notNull().default(""),
  situacaoPedido: text("situacao_pedido").notNull().default(""),
  situacaoAtendPedido: text("situacao_atend_pedido").notNull().default(""),
  dataUltimaModificacao: text("data_ultima_modificacao").notNull().default(""),
  dataHoraCancelamento: text("data_hora_cancelamento").notNull().default(""),
  motivoCancelamento: text("motivo_cancelamento").notNull().default(""),
  dataEntrada: text("data_entrada").notNull().default(""),
  canalOrigem: text("canal_origem").notNull().default(""),
  tipoCanalOrigem: text("tipo_canal_origem").notNull().default(""),
  descMunicipio: text("desc_municipio").notNull().default(""),
  codOperacao: text("cod_operacao").notNull().default(""),
  descOperacao: text("desc_operacao").notNull().default(""),
  codTipoMovimento: text("cod_tipo_movimento").notNull().default(""),
  descTipoMovimento: text("desc_tipo_movimento").notNull().default(""),
  valorDescontoTotal: real("valor_desconto_total").notNull().default(0),
  valorTotal: real("valor_total").notNull().default(0),
  formaPagamento: text("forma_pagamento").notNull().default(""),
  prazoPagamento: text("prazo_pagamento").notNull().default(""),
  codSetor: text("cod_setor").notNull().default(""),
  descSetor: text("desc_setor").notNull().default(""),
  codVendedor: text("cod_vendedor").notNull().default(""),
  nomeVendedor: text("nome_vendedor").notNull().default(""),
  codProduto: text("cod_produto").notNull().default(""),
  descProduto: text("desc_produto").notNull().default(""),
  unidadeProduto: text("unidade_produto").notNull().default(""),
  quantVenda: real("quant_venda").notNull().default(0),
  unidadeVenda: text("unidade_venda").notNull().default(""),
  valorUnitarioLiquido: real("valor_unitario_liquido").notNull().default(0),
  valorLiquidoItem: real("valor_liquido_item").notNull().default(0),
  volumeHectolitro: real("volume_hectolitro").notNull().default(0),
  situacaoItem: text("situacao_item").notNull().default(""),
  situacaoAtendItem: text("situacao_atend_item").notNull().default(""),
  numeroNf: text("numero_nf").notNull().default(""),
  dataEmissaoNf: text("data_emissao_nf").notNull().default(""),
  situacaoNf: text("situacao_nf").notNull().default(""),
}, (table) => ({
  snapshotIdx: index("base_agendados_snapshot_id_idx").on(table.snapshotId),
  pedidoIdx: index("base_agendados_numero_pedido_idx").on(table.numeroPedido),
  produtoIdx: index("base_agendados_cod_produto_idx").on(table.codProduto),
}));

export const insertBaseAgendadosSchema = createInsertSchema(baseAgendadosTable).omit({ id: true });
export type InsertBaseAgendados = z.infer<typeof insertBaseAgendadosSchema>;
export type BaseAgendados = typeof baseAgendadosTable.$inferSelect;
