import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const produtoSegmentoTable = pgTable("produto_segmento", {
  id: serial("id").primaryKey(),
  codigoProduto: integer("codigo_produto").notNull().unique(),
  segmento: text("segmento").notNull(),
});

export const insertProdutoSegmentoSchema = createInsertSchema(produtoSegmentoTable).omit({ id: true });
export type InsertProdutoSegmento = z.infer<typeof insertProdutoSegmentoSchema>;
export type ProdutoSegmento = typeof produtoSegmentoTable.$inferSelect;
