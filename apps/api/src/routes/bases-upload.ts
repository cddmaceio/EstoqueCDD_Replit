import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  baseGradeSnapshotsTable,
  baseGradeTable,
  base0111SnapshotsTable,
  base0111Table,
  baseAgendadosSnapshotsTable,
  baseAgendadosTable,
  baseExemploSnapshotsTable,
  baseExemploTable,
  base020501SnapshotsTable,
  base020501Table,
  base020502SnapshotsTable,
  base020502Table,
  baseProducaoSnapshotsTable,
  baseProducaoTable,
  produtoSegmentoTable,
} from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import { requireAdmin } from "../lib/admin-auth";
import { readUploadedFileBuffer } from "../lib/upload-storage";

const router: IRouter = Router();
const BATCH_SIZE = 500;

function parseFloat0(v: unknown): number {
  if (v == null) return 0;
  const s = String(v).replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseInt0(v: unknown): number {
  if (v == null) return 0;
  const s = String(v).replace(/[^\d-]/g, "");
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

async function readWorkbook(input: {
  fileBase64?: string;
  storagePath?: string;
  storageBucket?: string;
}): Promise<XLSX.WorkBook> {
  const buffer = await readUploadedFileBuffer(input);
  return XLSX.read(buffer, { type: "buffer", codepage: 28591 });
}

function getRows(wb: XLSX.WorkBook): Record<string, unknown>[] {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" }) as Record<string, unknown>[];
}

function getRowsFromAllSheets(
  wb: XLSX.WorkBook,
): Array<{ sheetName: string; row: Record<string, unknown> }> {
  return wb.SheetNames.flatMap((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];

    return rows.map((row) => ({ sheetName, row }));
  });
}

function normalizeKey(k: string): string {
  return k
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeKey(k)] = v;
  }
  return out;
}

router.post("/bases/grade/upload", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { fileName, fileBase64, storagePath, storageBucket } = req.body as { fileName?: string; fileBase64?: string; storagePath?: string; storageBucket?: string };
  if (!fileName || (!fileBase64 && !storagePath)) { res.status(400).json({ error: "fileName e fileBase64 obrigatórios" }); return; }
  let wb: XLSX.WorkBook;
  try { wb = await readWorkbook({ fileBase64, storagePath, storageBucket }); } catch { res.status(400).json({ error: "Arquivo inválido" }); return; }
  const rows = getRows(wb);
  if (!rows.length) { res.status(400).json({ error: "Planilha sem dados" }); return; }
  const [snapshot] = await db.insert(baseGradeSnapshotsTable).values({ fileName, totalRows: rows.length }).returning();
  const items = rows.map((r) => {
    const n = normalizeRow(r);
    return {
      snapshotId: snapshot.id,
      codigoProduto: parseInt0(n["codigoproduto"] ?? n["codigo"]),
      descricaoProduto: str(n["descricaoproduto"] ?? n["descricao"]),
      unidadeMedida: str(n["unidademedida"] ?? n["unidade"]),
      gradeEstoque: parseInt0(n["gradeestoque"] ?? n["grade"]),
      gradeCadastrada: parseInt0(n["gradecadastrada"]),
      reserva: parseInt0(n["reserva"]),
      saida: parseInt0(n["saida"]),
      saldoDisponivel: parseInt0(n["saldodisponivel"] ?? n["saldo"]),
    };
  });
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await db.insert(baseGradeTable).values(items.slice(i, i + BATCH_SIZE));
  }
  res.json({ success: true, message: `${items.length} itens importados`, rowsProcessed: items.length, fileName });
});

router.get("/bases/grade/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const [s] = await db.select().from(baseGradeSnapshotsTable).orderBy(desc(baseGradeSnapshotsTable.uploadedAt)).limit(1);
  res.json(s ? { fileName: s.fileName, uploadedAt: s.uploadedAt.toISOString(), totalRows: s.totalRows } : { fileName: null, uploadedAt: null, totalRows: null });
});

router.post("/bases/0111/upload", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { fileName, fileBase64, storagePath, storageBucket } = req.body as { fileName?: string; fileBase64?: string; storagePath?: string; storageBucket?: string };
  if (!fileName || (!fileBase64 && !storagePath)) { res.status(400).json({ error: "fileName e fileBase64 obrigatórios" }); return; }
  let wb: XLSX.WorkBook;
  try { wb = await readWorkbook({ fileBase64, storagePath, storageBucket }); } catch { res.status(400).json({ error: "Arquivo inválido" }); return; }
  const rows = getRows(wb);
  if (!rows.length) { res.status(400).json({ error: "Planilha sem dados" }); return; }
  const [snapshot] = await db.insert(base0111SnapshotsTable).values({ fileName, totalRows: rows.length }).returning();
  const items = rows.map((r) => {
    const n = normalizeRow(r);
    return {
      snapshotId: snapshot.id,
      codigo: str(n["codigo"]),
      descricao: str(n["descricao"]),
      pgv: str(n["pgv"]),
      empresa: str(n["empresa"]),
      tipoMarca: str(n["tipomarca"]),
      linhaMarca: str(n["linhamarca"]),
      embalagem: str(n["embalagem"]),
      marca: str(n["marca"]),
      vasilhame: str(n["vasilhame"]),
      garrafeira: str(n["garrafeira"]),
      icms: str(n["icms"]),
      tipoRoadshow: str(n["tiporoadshow"]),
      pesoBrutoKg: parseFloat0(n["pesobrutokg"]),
      fator: parseFloat0(n["fator"]),
      fatorHecto: parseFloat0(n["fatorhecto"]),
      fatorHectoComercial: parseFloat0(n["fatorhectocomercial"]),
      indPalmtop: str(n["indpalmtop"]),
      grupo: str(n["grupo"]),
      grupoRemuneracao: str(n["gruporemuneracao"]),
      ean: str(n["ean"]),
      tabelaIcms: str(n["tabelaicms"]),
      caixasPallet: parseInt0(n["caixaspallet"]),
      nrFatorConversao: parseFloat0(n["nrfatorconversao"]),
      lastro: str(n["lastro"]),
      famEmbalagemSiv: str(n["famembalagensiv"]),
      pautaPisLitro: parseFloat0(n["pautapislitro"]),
      pautaCofinsLitro: parseFloat0(n["pautacofinslitro"]),
      produtoPremium: str(n["produtopremium"]),
      ncm: str(n["ncm"]),
      cest: str(n["cest"]),
      ean1: str(n["eantrib"]),
      codigoUnitario: str(n["codigounitario"]),
      descricaoUnitaria: str(n["descricaounitaria"]),
      codigoProdutoSap: str(n["codigoprodutosap"]),
    };
  });
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await db.insert(base0111Table).values(items.slice(i, i + BATCH_SIZE));
  }
  res.json({ success: true, message: `${items.length} itens importados`, rowsProcessed: items.length, fileName });
});

router.get("/bases/0111/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const [s] = await db.select().from(base0111SnapshotsTable).orderBy(desc(base0111SnapshotsTable.uploadedAt)).limit(1);
  res.json(s ? { fileName: s.fileName, uploadedAt: s.uploadedAt.toISOString(), totalRows: s.totalRows } : { fileName: null, uploadedAt: null, totalRows: null });
});

router.post("/bases/agendados/upload", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { fileName, fileBase64, storagePath, storageBucket } = req.body as { fileName?: string; fileBase64?: string; storagePath?: string; storageBucket?: string };
  if (!fileName || (!fileBase64 && !storagePath)) { res.status(400).json({ error: "fileName e fileBase64 obrigatórios" }); return; }
  let wb: XLSX.WorkBook;
  try { wb = await readWorkbook({ fileBase64, storagePath, storageBucket }); } catch { res.status(400).json({ error: "Arquivo inválido" }); return; }
  const rows = getRows(wb);
  if (!rows.length) { res.status(400).json({ error: "Planilha sem dados" }); return; }
  const [snapshot] = await db.insert(baseAgendadosSnapshotsTable).values({ fileName, totalRows: rows.length }).returning();
  const items = rows.map((r) => {
    const n = normalizeRow(r);
    return {
      snapshotId: snapshot.id,
      dataEntregaOriginal: str(n["dataentregaoriginal"]),
      geoVenda: str(n["geovenda"]),
      codUnidadeVenda: str(n["codunidadevenda"]),
      descUnidadeVenda: str(n["descunidadevenda"]),
      numeroPedido: str(n["numeropedido"]),
      numeroPedidoCliente: str(n["numeropedidocliente"]),
      dataEntrega: str(n["dataentrega"]),
      cpfCnpjCliente: str(n["cpfcnpjcliente"]),
      codCliente: str(n["codcliente"]),
      nomeCliente: str(n["nomecliente"]),
      nomeFantasia: str(n["nomefantasia"]),
      tipoPedido: str(n["tipopedido"]),
      idPedido: str(n["idpedido"] ?? n["iddo pedido"]),
      situacaoPedido: str(n["situacaopedido"]),
      situacaoAtendPedido: str(n["situacaoatendpedido"]),
      dataUltimaModificacao: str(n["dataultmamodificacao"] ?? n["dataultima modificacao"]),
      dataHoraCancelamento: str(n["datahoracancelamento"]),
      motivoCancelamento: str(n["motivocancelamento"]),
      dataEntrada: str(n["dataentrada"]),
      canalOrigem: str(n["canalorigem"]),
      tipoCanalOrigem: str(n["tipocanalorigem"]),
      descMunicipio: str(n["descmunicipio"]),
      codOperacao: str(n["codoperacao"]),
      descOperacao: str(n["descoperacao"]),
      codTipoMovimento: str(n["codtipomovimento"]),
      descTipoMovimento: str(n["desctipomovimento"]),
      valorDescontoTotal: parseFloat0(n["valordescontototal"]),
      valorTotal: parseFloat0(n["valortotal"]),
      formaPagamento: str(n["formadepagamento"]),
      prazoPagamento: str(n["prazopagamento"]),
      codSetor: str(n["codsetor"]),
      descSetor: str(n["descsetor"]),
      codVendedor: str(n["codvendedor"]),
      nomeVendedor: str(n["nomevendedor"]),
      codProduto: str(n["codproduto"]),
      descProduto: str(n["descproduto"]),
      unidadeProduto: str(n["unidadeproduto"]),
      quantVenda: parseFloat0(n["quantvenda"]),
      unidadeVenda: str(n["unidadevenda"]),
      valorUnitarioLiquido: parseFloat0(n["valorunitarioliquido"]),
      valorLiquidoItem: parseFloat0(n["valorliquidoitem"]),
      volumeHectolitro: parseFloat0(n["volumehectolitro"]),
      situacaoItem: str(n["situacaoitem"]),
      situacaoAtendItem: str(n["situacaoatenditem"]),
      numeroNf: str(n["numeronf"]),
      dataEmissaoNf: str(n["dataemissaonf"]),
      situacaoNf: str(n["situacaonf"]),
    };
  });
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await db.insert(baseAgendadosTable).values(items.slice(i, i + BATCH_SIZE));
  }
  res.json({ success: true, message: `${items.length} itens importados`, rowsProcessed: items.length, fileName });
});

router.get("/bases/agendados/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const [s] = await db.select().from(baseAgendadosSnapshotsTable).orderBy(desc(baseAgendadosSnapshotsTable.uploadedAt)).limit(1);
  res.json(s ? { fileName: s.fileName, uploadedAt: s.uploadedAt.toISOString(), totalRows: s.totalRows } : { fileName: null, uploadedAt: null, totalRows: null });
});

router.post("/bases/exemplo/upload", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { fileName, fileBase64, storagePath, storageBucket } = req.body as { fileName?: string; fileBase64?: string; storagePath?: string; storageBucket?: string };
  if (!fileName || (!fileBase64 && !storagePath)) { res.status(400).json({ error: "fileName e fileBase64 obrigatórios" }); return; }
  let wb: XLSX.WorkBook;
  try { wb = await readWorkbook({ fileBase64, storagePath, storageBucket }); } catch { res.status(400).json({ error: "Arquivo inválido" }); return; }
  const rows = getRows(wb);
  if (!rows.length) { res.status(400).json({ error: "Planilha sem dados" }); return; }
  const [snapshot] = await db.insert(baseExemploSnapshotsTable).values({ fileName, totalRows: rows.length }).returning();
  const items = rows.map((r) => {
    const n = normalizeRow(r);
    return {
      snapshotId: snapshot.id,
      idPromax: str(n["idpromax"]),
      nomeAjudante: str(n["nomeajudante"]),
      cpf: str(n["cpf"]),
      cracha: str(n["cracha"]),
      tipo: str(n["tipo"]),
      setor: str(n["setor"]),
      prestador: str(n["prestador"]),
      turno: str(n["turno"]),
      status: str(n["status"]),
      cdSupervisor: str(n["cdsupervisor"]),
      cdConferenteLider: str(n["cdconferentelider"]),
      inicioVigencia: str(n["iniciovigencia"]),
      metaPalletDia: parseInt0(n["metapalletdia"]),
      metaPalletHora: parseInt0(n["metapallethora"]),
    };
  });
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await db.insert(baseExemploTable).values(items.slice(i, i + BATCH_SIZE));
  }
  res.json({ success: true, message: `${items.length} itens importados`, rowsProcessed: items.length, fileName });
});

router.get("/bases/exemplo/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const [s] = await db.select().from(baseExemploSnapshotsTable).orderBy(desc(baseExemploSnapshotsTable.uploadedAt)).limit(1);
  res.json(s ? { fileName: s.fileName, uploadedAt: s.uploadedAt.toISOString(), totalRows: s.totalRows } : { fileName: null, uploadedAt: null, totalRows: null });
});

router.post("/bases/020501/upload", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { fileName, fileBase64, storagePath, storageBucket } = req.body as { fileName?: string; fileBase64?: string; storagePath?: string; storageBucket?: string };
  if (!fileName || (!fileBase64 && !storagePath)) { res.status(400).json({ error: "fileName e fileBase64 obrigatórios" }); return; }
  let wb: XLSX.WorkBook;
  try { wb = await readWorkbook({ fileBase64, storagePath, storageBucket }); } catch { res.status(400).json({ error: "Arquivo inválido" }); return; }
  const rows = getRows(wb);
  if (!rows.length) { res.status(400).json({ error: "Planilha sem dados" }); return; }
  const [snapshot] = await db.insert(base020501SnapshotsTable).values({ fileName, totalRows: rows.length }).returning();
  const items = rows.map((r) => {
    const n = normalizeRow(r);
    return {
      snapshotId: snapshot.id,
      data: str(n["data"]),
      docum: str(n["docum"]),
      serie: str(n["serie"]),
      nrBo: str(n["nrbo"]),
      armazem: str(n["armazem"]),
      depositoEntrada: str(n["depositoentrada"]),
      depositoSaida: str(n["depositosaida"]),
      item: str(n["item"]),
      descricao: str(n["descricao"]),
      unidade: str(n["unidade"]),
      mapa: str(n["mapa"]),
      codOperacao: str(n["codoperacao"]),
      tipoOperacao: str(n["tipooperacao"]),
      tipoMov: str(n["tipomov"]),
      entradaInteiras: str(n["entradainteiras"]),
      entradaAvulsas: str(n["entradaavulsas"]),
      usuario: str(n["usuario"]),
      hora: str(n["hora"]),
      responsabilidade: str(n["responsabilidade"]),
      numeroDocumentoSap: str(n["numerododocumentosap"]),
      numeroControle: str(n["numerodocontrole"]),
      filialOrigem: str(n["filialorigem"]),
      transportadora: str(n["transportadora"]),
      fabrica: str(n["fabrica"]),
      historicoMotivo: str(n["historicomotivo"]),
      areaArm: str(n["areaarm"]),
      turno: str(n["turno"]),
      conferente: str(n["conferente"]),
      opEmp: str(n["opemp"]),
      ajudante: str(n["ajudante"]),
      prestServ: str(n["prestserv"]),
      precoMedio: parseFloat0(n["precomedio"]),
      precoTotal: parseFloat0(n["precototal"]),
      motivo: str(n["motivo"]),
      dtValidade: str(n["dtvalidade"]),
      lote: str(n["lote"]),
    };
  });
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await db.insert(base020501Table).values(items.slice(i, i + BATCH_SIZE));
  }
  res.json({ success: true, message: `${items.length} itens importados`, rowsProcessed: items.length, fileName });
});

router.get("/bases/020501/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const [s] = await db.select().from(base020501SnapshotsTable).orderBy(desc(base020501SnapshotsTable.uploadedAt)).limit(1);
  res.json(s ? { fileName: s.fileName, uploadedAt: s.uploadedAt.toISOString(), totalRows: s.totalRows } : { fileName: null, uploadedAt: null, totalRows: null });
});

router.post("/bases/020502/upload", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { fileName, fileBase64, storagePath, storageBucket } = req.body as { fileName?: string; fileBase64?: string; storagePath?: string; storageBucket?: string };
  if (!fileName || (!fileBase64 && !storagePath)) { res.status(400).json({ error: "fileName e fileBase64 obrigatórios" }); return; }
  let wb: XLSX.WorkBook;
  try { wb = await readWorkbook({ fileBase64, storagePath, storageBucket }); } catch { res.status(400).json({ error: "Arquivo inválido" }); return; }
  const rows = getRows(wb);
  if (!rows.length) { res.status(400).json({ error: "Planilha sem dados" }); return; }
  const [snapshot] = await db.insert(base020502SnapshotsTable).values({ fileName, totalRows: rows.length }).returning();
  const items = rows.map((r) => {
    const n = normalizeRow(r);
    return {
      snapshotId: snapshot.id,
      armazem: str(n["armazem"]),
      deposito: str(n["deposito"]),
      produto: str(n["produto"]),
      descricao: str(n["descricao"]),
      unidade: str(n["unidade"]),
      saldoAnterior: str(n["saldoanterior"]),
      entradas: str(n["entradas"]),
      saidas: str(n["saidas"]),
      saldoAtual: str(n["saldoatual"]),
      transito: str(n["transito"]),
      disponivel: str(n["disponivel"]),
      inventario: str(n["inventario"]),
      diferenca: str(n["diferenca"]),
      diferencaCongelamento: str(n["diferencacongelamento"]),
      transAnt: str(n["transant"]),
      transAntNaoCarregado: str(n["transantnaocarregado"]),
      transDiaNaoCarregado: str(n["transdianaocarregado"]),
      comodatoOp03: str(n["comodatoop03"]),
      vendaVasOp85: str(n["vendavasop85"]),
      valorizacao: str(n["valorizacao"]),
      saldoUnitario: str(n["saldounitario"]),
      saldoAtualReal: str(n["saldoatualreal"]),
      saldoGradeReal: str(n["saldogradereal"]),
    };
  });
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await db.insert(base020502Table).values(items.slice(i, i + BATCH_SIZE));
  }
  res.json({ success: true, message: `${items.length} itens importados`, rowsProcessed: items.length, fileName });
});

router.get("/bases/020502/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const [s] = await db.select().from(base020502SnapshotsTable).orderBy(desc(base020502SnapshotsTable.uploadedAt)).limit(1);
  res.json(s ? { fileName: s.fileName, uploadedAt: s.uploadedAt.toISOString(), totalRows: s.totalRows } : { fileName: null, uploadedAt: null, totalRows: null });
});

router.post("/bases/producao/upload", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const { fileName, fileBase64, storagePath, storageBucket } = req.body as { fileName?: string; fileBase64?: string; storagePath?: string; storageBucket?: string };
  if (!fileName || (!fileBase64 && !storagePath)) { res.status(400).json({ error: "fileName e fileBase64 obrigatórios" }); return; }
  let wb: XLSX.WorkBook;
  try { wb = await readWorkbook({ fileBase64, storagePath, storageBucket }); } catch { res.status(400).json({ error: "Arquivo inválido" }); return; }
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" }) as unknown[][];
  if (rawRows.length < 2) { res.status(400).json({ error: "Planilha sem dados" }); return; }
  const headers = (rawRows[0] as string[]).map(normalizeKey);
  const rows = rawRows.slice(1).map((r) => {
    const arr = r as unknown[];
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = arr[i] ?? ""; });
    return obj;
  });
  const [snapshot] = await db.insert(baseProducaoSnapshotsTable).values({ fileName, totalRows: rows.length }).returning();
  const items = rows.map((n) => ({
    snapshotId: snapshot.id,
    date: str(n["date"] ?? n["data"]),
    descricaoUnidade: str(n["descricaounidade"]),
    codSap: str(n["codsap"]),
    descrProdAbreviada: str(n["descrprodabreviada"]),
    embalagem: str(n["embalagem"]),
    fatorRa24: parseFloat0(n["fatorra24ultparticaora24"] ?? n["fator"]),
  }));
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await db.insert(baseProducaoTable).values(items.slice(i, i + BATCH_SIZE));
  }
  res.json({ success: true, message: `${items.length} itens importados`, rowsProcessed: items.length, fileName });
});

router.get("/bases/producao/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const [s] = await db.select().from(baseProducaoSnapshotsTable).orderBy(desc(baseProducaoSnapshotsTable.uploadedAt)).limit(1);
  res.json(s ? { fileName: s.fileName, uploadedAt: s.uploadedAt.toISOString(), totalRows: s.totalRows } : { fileName: null, uploadedAt: null, totalRows: null });
});

router.post("/bases/segmentos/upload", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const { fileName, fileBase64, storagePath, storageBucket } = req.body as {
    fileName?: string;
    fileBase64?: string;
    storagePath?: string;
    storageBucket?: string;
  };

  if (!fileName || (!fileBase64 && !storagePath)) {
    res.status(400).json({ error: "fileName e fileBase64 obrigatorios" });
    return;
  }

  let wb: XLSX.WorkBook;
  try {
    wb = await readWorkbook({ fileBase64, storagePath, storageBucket });
  } catch {
    res.status(400).json({ error: "Arquivo invalido" });
    return;
  }

  const sheetRows = getRowsFromAllSheets(wb);
  if (!sheetRows.length) {
    res.status(400).json({ error: "Planilha sem dados" });
    return;
  }

  const itemsByCodigo = new Map<number, { codigoProduto: number; segmento: string }>();
  for (const { sheetName, row } of sheetRows) {
    const n = normalizeRow(row);
    const codigo = parseInt0(
      n["codigoproduto"] ?? n["codigo"] ?? n["promax"] ?? n["cod"],
    );
    const segmento =
      str(n["segmento"] ?? n["segment"] ?? n["segmento_produto"]) ||
      sheetName;

    if (codigo > 0 && segmento) {
      itemsByCodigo.set(codigo, {
        codigoProduto: codigo,
        segmento,
      });
    }
  }

  const items = Array.from(itemsByCodigo.values());

  if (!items.length) {
    res.status(400).json({
      error:
        "Nenhum registro valido encontrado. Colunas esperadas: codigo_produto, segmento",
    });
    return;
  }

  await db.execute(sql`TRUNCATE produto_segmento RESTART IDENTITY`);

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await db.insert(produtoSegmentoTable).values(items.slice(i, i + BATCH_SIZE));
  }

  res.json({
    success: true,
    message: `${items.length} classificacoes importadas`,
    rowsProcessed: items.length,
    fileName,
    sheetsProcessed: wb.SheetNames.length,
  });
});

router.get("/bases/segmentos/status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;
  const result = await db.execute(sql`SELECT COUNT(*)::int as total FROM produto_segmento`);
  const row = result.rows[0];
  const total = row ? Number((row as Record<string, unknown>).total ?? 0) : 0;
  res.json({ totalRows: total, fileName: total > 0 ? "classificacao_segmentos" : null, uploadedAt: null });
});

export default router;
