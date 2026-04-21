CREATE TABLE "base_0111_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_0111" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"codigo" text DEFAULT '' NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"pgv" text DEFAULT '' NOT NULL,
	"empresa" text DEFAULT '' NOT NULL,
	"tipo_marca" text DEFAULT '' NOT NULL,
	"linha_marca" text DEFAULT '' NOT NULL,
	"embalagem" text DEFAULT '' NOT NULL,
	"marca" text DEFAULT '' NOT NULL,
	"vasilhame" text DEFAULT '' NOT NULL,
	"garrafeira" text DEFAULT '' NOT NULL,
	"icms" text DEFAULT '' NOT NULL,
	"tipo_roadshow" text DEFAULT '' NOT NULL,
	"peso_bruto_kg" real DEFAULT 0 NOT NULL,
	"fator" real DEFAULT 0 NOT NULL,
	"fator_hecto" real DEFAULT 0 NOT NULL,
	"fator_hecto_comercial" real DEFAULT 0 NOT NULL,
	"ind_palmtop" text DEFAULT '' NOT NULL,
	"grupo" text DEFAULT '' NOT NULL,
	"grupo_remuneracao" text DEFAULT '' NOT NULL,
	"ean" text DEFAULT '' NOT NULL,
	"tabela_icms" text DEFAULT '' NOT NULL,
	"caixas_pallet" integer DEFAULT 0 NOT NULL,
	"nr_fator_conversao" real DEFAULT 0 NOT NULL,
	"lastro" text DEFAULT '' NOT NULL,
	"fam_embalagem_siv" text DEFAULT '' NOT NULL,
	"pauta_pis_litro" real DEFAULT 0 NOT NULL,
	"pauta_cofins_litro" real DEFAULT 0 NOT NULL,
	"produto_premium" text DEFAULT '' NOT NULL,
	"ncm" text DEFAULT '' NOT NULL,
	"cest" text DEFAULT '' NOT NULL,
	"ean_trib" text DEFAULT '' NOT NULL,
	"codigo_unitario" text DEFAULT '' NOT NULL,
	"descricao_unitaria" text DEFAULT '' NOT NULL,
	"codigo_produto_sap" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_020501_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_020501" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"data" text DEFAULT '' NOT NULL,
	"docum" text DEFAULT '' NOT NULL,
	"serie" text DEFAULT '' NOT NULL,
	"nr_bo" text DEFAULT '' NOT NULL,
	"armazem" text DEFAULT '' NOT NULL,
	"deposito_entrada" text DEFAULT '' NOT NULL,
	"deposito_saida" text DEFAULT '' NOT NULL,
	"item" text DEFAULT '' NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"unidade" text DEFAULT '' NOT NULL,
	"mapa" text DEFAULT '' NOT NULL,
	"cod_operacao" text DEFAULT '' NOT NULL,
	"tipo_operacao" text DEFAULT '' NOT NULL,
	"tipo_mov" text DEFAULT '' NOT NULL,
	"entrada_inteiras" text DEFAULT '' NOT NULL,
	"entrada_avulsas" text DEFAULT '' NOT NULL,
	"usuario" text DEFAULT '' NOT NULL,
	"hora" text DEFAULT '' NOT NULL,
	"responsabilidade" text DEFAULT '' NOT NULL,
	"numero_documento_sap" text DEFAULT '' NOT NULL,
	"numero_controle" text DEFAULT '' NOT NULL,
	"filial_origem" text DEFAULT '' NOT NULL,
	"transportadora" text DEFAULT '' NOT NULL,
	"fabrica" text DEFAULT '' NOT NULL,
	"historico_motivo" text DEFAULT '' NOT NULL,
	"area_arm" text DEFAULT '' NOT NULL,
	"turno" text DEFAULT '' NOT NULL,
	"conferente" text DEFAULT '' NOT NULL,
	"op_emp" text DEFAULT '' NOT NULL,
	"ajudante" text DEFAULT '' NOT NULL,
	"prest_serv" text DEFAULT '' NOT NULL,
	"preco_medio" real DEFAULT 0 NOT NULL,
	"preco_total" real DEFAULT 0 NOT NULL,
	"motivo" text DEFAULT '' NOT NULL,
	"dt_validade" text DEFAULT '' NOT NULL,
	"lote" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_020502_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_020502" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"armazem" text DEFAULT '' NOT NULL,
	"deposito" text DEFAULT '' NOT NULL,
	"produto" text DEFAULT '' NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"unidade" text DEFAULT '' NOT NULL,
	"saldo_anterior" text DEFAULT '' NOT NULL,
	"entradas" text DEFAULT '' NOT NULL,
	"saidas" text DEFAULT '' NOT NULL,
	"saldo_atual" text DEFAULT '' NOT NULL,
	"transito" text DEFAULT '' NOT NULL,
	"disponivel" text DEFAULT '' NOT NULL,
	"inventario" text DEFAULT '' NOT NULL,
	"diferenca" text DEFAULT '' NOT NULL,
	"diferenca_congelamento" text DEFAULT '' NOT NULL,
	"trans_ant" text DEFAULT '' NOT NULL,
	"trans_ant_nao_carregado" text DEFAULT '' NOT NULL,
	"trans_dia_nao_carregado" text DEFAULT '' NOT NULL,
	"comodato_op03" text DEFAULT '' NOT NULL,
	"venda_vas_op85" text DEFAULT '' NOT NULL,
	"valorizacao" text DEFAULT '' NOT NULL,
	"saldo_unitario" text DEFAULT '' NOT NULL,
	"saldo_atual_real" text DEFAULT '' NOT NULL,
	"saldo_grade_real" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_agendados_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_agendados" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"data_entrega_original" text DEFAULT '' NOT NULL,
	"geo_venda" text DEFAULT '' NOT NULL,
	"cod_unidade_venda" text DEFAULT '' NOT NULL,
	"desc_unidade_venda" text DEFAULT '' NOT NULL,
	"numero_pedido" text DEFAULT '' NOT NULL,
	"numero_pedido_cliente" text DEFAULT '' NOT NULL,
	"data_entrega" text DEFAULT '' NOT NULL,
	"cpf_cnpj_cliente" text DEFAULT '' NOT NULL,
	"cod_cliente" text DEFAULT '' NOT NULL,
	"nome_cliente" text DEFAULT '' NOT NULL,
	"nome_fantasia" text DEFAULT '' NOT NULL,
	"tipo_pedido" text DEFAULT '' NOT NULL,
	"id_pedido" text DEFAULT '' NOT NULL,
	"situacao_pedido" text DEFAULT '' NOT NULL,
	"situacao_atend_pedido" text DEFAULT '' NOT NULL,
	"data_ultima_modificacao" text DEFAULT '' NOT NULL,
	"data_hora_cancelamento" text DEFAULT '' NOT NULL,
	"motivo_cancelamento" text DEFAULT '' NOT NULL,
	"data_entrada" text DEFAULT '' NOT NULL,
	"canal_origem" text DEFAULT '' NOT NULL,
	"tipo_canal_origem" text DEFAULT '' NOT NULL,
	"desc_municipio" text DEFAULT '' NOT NULL,
	"cod_operacao" text DEFAULT '' NOT NULL,
	"desc_operacao" text DEFAULT '' NOT NULL,
	"cod_tipo_movimento" text DEFAULT '' NOT NULL,
	"desc_tipo_movimento" text DEFAULT '' NOT NULL,
	"valor_desconto_total" real DEFAULT 0 NOT NULL,
	"valor_total" real DEFAULT 0 NOT NULL,
	"forma_pagamento" text DEFAULT '' NOT NULL,
	"prazo_pagamento" text DEFAULT '' NOT NULL,
	"cod_setor" text DEFAULT '' NOT NULL,
	"desc_setor" text DEFAULT '' NOT NULL,
	"cod_vendedor" text DEFAULT '' NOT NULL,
	"nome_vendedor" text DEFAULT '' NOT NULL,
	"cod_produto" text DEFAULT '' NOT NULL,
	"desc_produto" text DEFAULT '' NOT NULL,
	"unidade_produto" text DEFAULT '' NOT NULL,
	"quant_venda" real DEFAULT 0 NOT NULL,
	"unidade_venda" text DEFAULT '' NOT NULL,
	"valor_unitario_liquido" real DEFAULT 0 NOT NULL,
	"valor_liquido_item" real DEFAULT 0 NOT NULL,
	"volume_hectolitro" real DEFAULT 0 NOT NULL,
	"situacao_item" text DEFAULT '' NOT NULL,
	"situacao_atend_item" text DEFAULT '' NOT NULL,
	"numero_nf" text DEFAULT '' NOT NULL,
	"data_emissao_nf" text DEFAULT '' NOT NULL,
	"situacao_nf" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_exemplo_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_exemplo" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"id_promax" text DEFAULT '' NOT NULL,
	"nome_ajudante" text DEFAULT '' NOT NULL,
	"cpf" text DEFAULT '' NOT NULL,
	"cracha" text DEFAULT '' NOT NULL,
	"tipo" text DEFAULT '' NOT NULL,
	"setor" text DEFAULT '' NOT NULL,
	"prestador" text DEFAULT '' NOT NULL,
	"turno" text DEFAULT '' NOT NULL,
	"status" text DEFAULT '' NOT NULL,
	"cd_supervisor" text DEFAULT '' NOT NULL,
	"cd_conferente_lider" text DEFAULT '' NOT NULL,
	"inicio_vigencia" text DEFAULT '' NOT NULL,
	"meta_pallet_dia" integer DEFAULT 0 NOT NULL,
	"meta_pallet_hora" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_grade_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_grade" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"codigo_produto" integer NOT NULL,
	"descricao_produto" text DEFAULT '' NOT NULL,
	"unidade_medida" text DEFAULT '' NOT NULL,
	"grade_estoque" integer DEFAULT 0 NOT NULL,
	"grade_cadastrada" integer DEFAULT 0 NOT NULL,
	"reserva" integer DEFAULT 0 NOT NULL,
	"saida" integer DEFAULT 0 NOT NULL,
	"saldo_disponivel" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_producao_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_producao" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"descricao_unidade" text DEFAULT '' NOT NULL,
	"cod_sap" text DEFAULT '' NOT NULL,
	"descr_prod_abreviada" text DEFAULT '' NOT NULL,
	"embalagem" text DEFAULT '' NOT NULL,
	"fator_ra24" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "estoque_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"produto" text NOT NULL,
	"marca" text NOT NULL,
	"embalagem" text DEFAULT '' NOT NULL,
	"doi" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'OK' NOT NULL,
	"demanda" real DEFAULT 0 NOT NULL,
	"min" real DEFAULT 0 NOT NULL,
	"max" real DEFAULT 0 NOT NULL,
	"curva" text DEFAULT 'C' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produto_segmento" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo_produto" integer NOT NULL,
	"segmento" text NOT NULL,
	CONSTRAINT "produto_segmento_codigo_produto_unique" UNIQUE("codigo_produto")
);
--> statement-breakpoint
CREATE INDEX "base_0111_snapshots_uploaded_at_idx" ON "base_0111_snapshots" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "base_0111_snapshot_id_idx" ON "base_0111" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "base_0111_codigo_idx" ON "base_0111" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "base_0111_codigo_produto_sap_idx" ON "base_0111" USING btree ("codigo_produto_sap");--> statement-breakpoint
CREATE INDEX "base_020501_snapshots_uploaded_at_idx" ON "base_020501_snapshots" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "base_020501_snapshot_id_idx" ON "base_020501" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "base_020501_item_idx" ON "base_020501" USING btree ("item");--> statement-breakpoint
CREATE INDEX "base_020501_data_idx" ON "base_020501" USING btree ("data");--> statement-breakpoint
CREATE INDEX "base_020502_snapshots_uploaded_at_idx" ON "base_020502_snapshots" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "base_020502_snapshot_id_idx" ON "base_020502" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "base_020502_produto_idx" ON "base_020502" USING btree ("produto");--> statement-breakpoint
CREATE INDEX "base_agendados_snapshots_uploaded_at_idx" ON "base_agendados_snapshots" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "base_agendados_snapshot_id_idx" ON "base_agendados" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "base_agendados_numero_pedido_idx" ON "base_agendados" USING btree ("numero_pedido");--> statement-breakpoint
CREATE INDEX "base_agendados_cod_produto_idx" ON "base_agendados" USING btree ("cod_produto");--> statement-breakpoint
CREATE INDEX "base_exemplo_snapshots_uploaded_at_idx" ON "base_exemplo_snapshots" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "base_exemplo_snapshot_id_idx" ON "base_exemplo" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "base_exemplo_cpf_idx" ON "base_exemplo" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "base_grade_snapshots_uploaded_at_idx" ON "base_grade_snapshots" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "base_grade_snapshot_id_idx" ON "base_grade" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "base_grade_codigo_produto_idx" ON "base_grade" USING btree ("codigo_produto");--> statement-breakpoint
CREATE INDEX "base_producao_snapshots_uploaded_at_idx" ON "base_producao_snapshots" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "base_producao_snapshot_id_idx" ON "base_producao" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "base_producao_cod_sap_idx" ON "base_producao" USING btree ("cod_sap");--> statement-breakpoint
CREATE INDEX "base_producao_date_idx" ON "base_producao" USING btree ("date");--> statement-breakpoint
CREATE INDEX "admin_users_created_at_idx" ON "admin_users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "estoque_items_snapshot_id_idx" ON "estoque_items" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "estoque_items_marca_idx" ON "estoque_items" USING btree ("marca");--> statement-breakpoint
CREATE INDEX "estoque_items_status_idx" ON "estoque_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "estoque_items_curva_idx" ON "estoque_items" USING btree ("curva");--> statement-breakpoint
CREATE INDEX "upload_snapshots_uploaded_at_idx" ON "upload_snapshots" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "produto_segmento_segmento_idx" ON "produto_segmento" USING btree ("segmento");