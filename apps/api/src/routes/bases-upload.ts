import { Router, type IRouter } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { readUploadedFileBuffer } from "../lib/upload-storage";

const router: IRouter = Router();
const BATCH_SIZE = 500;

type SnapshotStatus = {
  file_name: string;
  uploaded_at: string;
  total_rows: number;
};

type DbRow = Record<string, unknown>;

let supabaseClient: SupabaseClient | null = null;

function getSupabaseReadClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) sao obrigatorios para as rotas de bases.",
    );
  }

  supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

async function getLatestStatus(
  table: string,
): Promise<{ fileName: string | null; uploadedAt: string | null; totalRows: number | null }> {
  const { data, error } = await getSupabaseReadClient()
    .from(table)
    .select("file_name, uploaded_at, total_rows")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = (data as SnapshotStatus | null) ?? null;

  if (!row) {
    return { fileName: null, uploadedAt: null, totalRows: null };
  }

  return {
    fileName: row.file_name,
    uploadedAt: row.uploaded_at,
    totalRows: row.total_rows,
  };
}

async function createSnapshot(
  table: string,
  fileName: string,
  totalRows: number,
): Promise<{ id: number }> {
  const { data, error } = await getSupabaseReadClient()
    .from(table)
    .insert({
      file_name: fileName,
      total_rows: totalRows,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return { id: Number(data.id) };
}

async function insertRows(table: string, rows: DbRow[]): Promise<void> {
  if (!rows.length) {
    return;
  }

  const { error } = await getSupabaseReadClient().from(table).insert(rows);

  if (error) {
    throw error;
  }
}

async function keepOnlyLatestSnapshot(
  dataTable: string,
  snapshotTable: string,
  currentSnapshotId: number,
): Promise<void> {
  const client = getSupabaseReadClient();

  const { error: rowsError } = await client
    .from(dataTable)
    .delete()
    .neq("snapshot_id", currentSnapshotId);

  if (rowsError) {
    throw rowsError;
  }

  const { error: snapshotsError } = await client
    .from(snapshotTable)
    .delete()
    .neq("id", currentSnapshotId);

  if (snapshotsError) {
    throw snapshotsError;
  }
}

function camelToSnake(key: string): string {
  if (key === "ean1") {
    return "ean_trib";
  }

  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toDatabaseRow(
  row: DbRow,
  overrides: Record<string, string> = {},
): DbRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      overrides[key] ?? camelToSnake(key),
      value,
    ]),
  );
}

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
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" }) as Record<
    string,
    unknown
  >[];
}

function getRowsFromAllSheets(
  wb: XLSX.WorkBook,
): Array<{ sheetName: string; row: Record<string, unknown> }> {
  return wb.SheetNames.flatMap((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<
      string,
      unknown
    >[];

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
  try {
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
    const wb = await readWorkbook({ fileBase64, storagePath, storageBucket });
    const rows = getRows(wb);
    if (!rows.length) {
      res.status(400).json({ error: "Planilha sem dados" });
      return;
    }
    const snapshot = await createSnapshot("base_grade_snapshots", fileName, rows.length);
    const items = rows.map((r) => {
      const n = normalizeRow(r);
      return toDatabaseRow({
        snapshotId: snapshot.id,
        codigoProduto: parseInt0(n["codigoproduto"] ?? n["codigo"]),
        descricaoProduto: str(n["descricaoproduto"] ?? n["descricao"]),
        unidadeMedida: str(n["unidademedida"] ?? n["unidade"]),
        gradeEstoque: parseInt0(n["gradeestoque"] ?? n["grade"]),
        gradeCadastrada: parseInt0(n["gradecadastrada"]),
        reserva: parseInt0(n["reserva"]),
        saida: parseInt0(n["saida"]),
        saldoDisponivel: parseInt0(n["saldodisponivel"] ?? n["saldo"]),
      });
    });
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      await insertRows("base_grade", items.slice(i, i + BATCH_SIZE));
    }
    await keepOnlyLatestSnapshot("base_grade", "base_grade_snapshots", snapshot.id);
    res.json({
      success: true,
      message: `${items.length} itens importados`,
      rowsProcessed: items.length,
      fileName,
    });
  } catch (error) {
    req.log.error({ error }, "bases grade upload failed");
    res.status(500).json({ error: "Falha ao processar upload da base grade" });
  }
});

router.get("/bases/grade/status", async (req, res): Promise<void> => {
  try {
    res.json(await getLatestStatus("base_grade_snapshots"));
  } catch (error) {
    req.log.error({ error }, "bases grade status failed");
    res.status(500).json({ error: "Falha ao carregar status da base grade" });
  }
});

router.post("/bases/0111/upload", async (req, res): Promise<void> => {
  try {
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
    const wb = await readWorkbook({ fileBase64, storagePath, storageBucket });
    const rows = getRows(wb);
    if (!rows.length) {
      res.status(400).json({ error: "Planilha sem dados" });
      return;
    }
    const snapshot = await createSnapshot("base_0111_snapshots", fileName, rows.length);
    const items = rows.map((r) => {
      const n = normalizeRow(r);
      return toDatabaseRow(
        {
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
        },
        { ean1: "ean_trib" },
      );
    });
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      await insertRows("base_0111", items.slice(i, i + BATCH_SIZE));
    }
    await keepOnlyLatestSnapshot("base_0111", "base_0111_snapshots", snapshot.id);
    res.json({
      success: true,
      message: `${items.length} itens importados`,
      rowsProcessed: items.length,
      fileName,
    });
  } catch (error) {
    req.log.error({ error }, "bases 0111 upload failed");
    res.status(500).json({ error: "Falha ao processar upload da base 0111" });
  }
});

router.get("/bases/0111/status", async (req, res): Promise<void> => {
  try {
    res.json(await getLatestStatus("base_0111_snapshots"));
  } catch (error) {
    req.log.error({ error }, "bases 0111 status failed");
    res.status(500).json({ error: "Falha ao carregar status da base 0111" });
  }
});

router.post("/bases/agendados/upload", async (req, res): Promise<void> => {
  try {
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
    const wb = await readWorkbook({ fileBase64, storagePath, storageBucket });
    const rows = getRows(wb);
    if (!rows.length) {
      res.status(400).json({ error: "Planilha sem dados" });
      return;
    }
    const snapshot = await createSnapshot("base_agendados_snapshots", fileName, rows.length);
    const items = rows.map((r) => {
      const n = normalizeRow(r);
      return toDatabaseRow({
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
        dataUltimaModificacao: str(
          n["dataultmamodificacao"] ?? n["dataultima modificacao"],
        ),
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
      });
    });
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      await insertRows("base_agendados", items.slice(i, i + BATCH_SIZE));
    }
    await keepOnlyLatestSnapshot(
      "base_agendados",
      "base_agendados_snapshots",
      snapshot.id,
    );
    res.json({
      success: true,
      message: `${items.length} itens importados`,
      rowsProcessed: items.length,
      fileName,
    });
  } catch (error) {
    req.log.error({ error }, "bases agendados upload failed");
    res.status(500).json({ error: "Falha ao processar upload da base agendados" });
  }
});

router.get("/bases/agendados/status", async (req, res): Promise<void> => {
  try {
    res.json(await getLatestStatus("base_agendados_snapshots"));
  } catch (error) {
    req.log.error({ error }, "bases agendados status failed");
    res.status(500).json({ error: "Falha ao carregar status da base agendados" });
  }
});

router.post("/bases/exemplo/upload", async (req, res): Promise<void> => {
  try {
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
    const wb = await readWorkbook({ fileBase64, storagePath, storageBucket });
    const rows = getRows(wb);
    if (!rows.length) {
      res.status(400).json({ error: "Planilha sem dados" });
      return;
    }
    const snapshot = await createSnapshot("base_exemplo_snapshots", fileName, rows.length);
    const items = rows.map((r) => {
      const n = normalizeRow(r);
      return toDatabaseRow({
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
      });
    });
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      await insertRows("base_exemplo", items.slice(i, i + BATCH_SIZE));
    }
    await keepOnlyLatestSnapshot("base_exemplo", "base_exemplo_snapshots", snapshot.id);
    res.json({
      success: true,
      message: `${items.length} itens importados`,
      rowsProcessed: items.length,
      fileName,
    });
  } catch (error) {
    req.log.error({ error }, "bases exemplo upload failed");
    res.status(500).json({ error: "Falha ao processar upload da base exemplo" });
  }
});

router.get("/bases/exemplo/status", async (req, res): Promise<void> => {
  try {
    res.json(await getLatestStatus("base_exemplo_snapshots"));
  } catch (error) {
    req.log.error({ error }, "bases exemplo status failed");
    res.status(500).json({ error: "Falha ao carregar status da base exemplo" });
  }
});

router.post("/bases/020501/upload", async (req, res): Promise<void> => {
  try {
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
    const wb = await readWorkbook({ fileBase64, storagePath, storageBucket });
    const rows = getRows(wb);
    if (!rows.length) {
      res.status(400).json({ error: "Planilha sem dados" });
      return;
    }
    const snapshot = await createSnapshot("base_020501_snapshots", fileName, rows.length);
    const items = rows.map((r) => {
      const n = normalizeRow(r);
      return toDatabaseRow({
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
      });
    });
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      await insertRows("base_020501", items.slice(i, i + BATCH_SIZE));
    }
    await keepOnlyLatestSnapshot("base_020501", "base_020501_snapshots", snapshot.id);
    res.json({
      success: true,
      message: `${items.length} itens importados`,
      rowsProcessed: items.length,
      fileName,
    });
  } catch (error) {
    req.log.error({ error }, "bases 020501 upload failed");
    res.status(500).json({ error: "Falha ao processar upload da base 020501" });
  }
});

router.get("/bases/020501/status", async (req, res): Promise<void> => {
  try {
    res.json(await getLatestStatus("base_020501_snapshots"));
  } catch (error) {
    req.log.error({ error }, "bases 020501 status failed");
    res.status(500).json({ error: "Falha ao carregar status da base 020501" });
  }
});

router.post("/bases/020502/upload", async (req, res): Promise<void> => {
  try {
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
    const wb = await readWorkbook({ fileBase64, storagePath, storageBucket });
    const rows = getRows(wb);
    if (!rows.length) {
      res.status(400).json({ error: "Planilha sem dados" });
      return;
    }
    const snapshot = await createSnapshot("base_020502_snapshots", fileName, rows.length);
    const items = rows.map((r) => {
      const n = normalizeRow(r);
      return toDatabaseRow({
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
      });
    });
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      await insertRows("base_020502", items.slice(i, i + BATCH_SIZE));
    }
    await keepOnlyLatestSnapshot("base_020502", "base_020502_snapshots", snapshot.id);
    res.json({
      success: true,
      message: `${items.length} itens importados`,
      rowsProcessed: items.length,
      fileName,
    });
  } catch (error) {
    req.log.error({ error }, "bases 020502 upload failed");
    res.status(500).json({ error: "Falha ao processar upload da base 020502" });
  }
});

router.get("/bases/020502/status", async (req, res): Promise<void> => {
  try {
    res.json(await getLatestStatus("base_020502_snapshots"));
  } catch (error) {
    req.log.error({ error }, "bases 020502 status failed");
    res.status(500).json({ error: "Falha ao carregar status da base 020502" });
  }
});

router.post("/bases/producao/upload", async (req, res): Promise<void> => {
  try {
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
    const wb = await readWorkbook({ fileBase64, storagePath, storageBucket });
    const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
      header: 1,
      defval: "",
    }) as unknown[][];
    if (rawRows.length < 2) {
      res.status(400).json({ error: "Planilha sem dados" });
      return;
    }
    const headers = (rawRows[0] as string[]).map(normalizeKey);
    const rows = rawRows.slice(1).map((r) => {
      const arr = r as unknown[];
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = arr[i] ?? "";
      });
      return obj;
    });
    const snapshot = await createSnapshot("base_producao_snapshots", fileName, rows.length);
    const items = rows.map((n) =>
      toDatabaseRow({
        snapshotId: snapshot.id,
        date: str(n["date"] ?? n["data"]),
        descricaoUnidade: str(n["descricaounidade"]),
        codSap: str(n["codsap"]),
        descrProdAbreviada: str(n["descrprodabreviada"]),
        embalagem: str(n["embalagem"]),
        fatorRa24: parseFloat0(n["fatorra24ultparticaora24"] ?? n["fator"]),
      }),
    );
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      await insertRows("base_producao", items.slice(i, i + BATCH_SIZE));
    }
    await keepOnlyLatestSnapshot(
      "base_producao",
      "base_producao_snapshots",
      snapshot.id,
    );
    res.json({
      success: true,
      message: `${items.length} itens importados`,
      rowsProcessed: items.length,
      fileName,
    });
  } catch (error) {
    req.log.error({ error }, "bases producao upload failed");
    res.status(500).json({ error: "Falha ao processar upload da base producao" });
  }
});

router.get("/bases/producao/status", async (req, res): Promise<void> => {
  try {
    res.json(await getLatestStatus("base_producao_snapshots"));
  } catch (error) {
    req.log.error({ error }, "bases producao status failed");
    res.status(500).json({ error: "Falha ao carregar status da base producao" });
  }
});

router.post("/bases/segmentos/upload", async (req, res): Promise<void> => {
  try {
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

    const wb = await readWorkbook({ fileBase64, storagePath, storageBucket });
    const sheetRows = getRowsFromAllSheets(wb);
    if (!sheetRows.length) {
      res.status(400).json({ error: "Planilha sem dados" });
      return;
    }

    const itemsByCodigo = new Map<number, { codigo_produto: number; segmento: string }>();
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
          codigo_produto: codigo,
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

    const deleteResponse = await getSupabaseReadClient()
      .from("produto_segmento")
      .delete()
      .gt("id", 0);

    if (deleteResponse.error) {
      throw deleteResponse.error;
    }

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      await insertRows("produto_segmento", items.slice(i, i + BATCH_SIZE));
    }

    res.json({
      success: true,
      message: `${items.length} classificacoes importadas`,
      rowsProcessed: items.length,
      fileName,
      sheetsProcessed: wb.SheetNames.length,
    });
  } catch (error) {
    req.log.error({ error }, "bases segmentos upload failed");
    res.status(500).json({ error: "Falha ao processar upload da base segmentos" });
  }
});

router.get("/bases/segmentos/status", async (req, res): Promise<void> => {
  try {
    const { count: exactCount, error: countError } = await getSupabaseReadClient()
      .from("produto_segmento")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    res.json({
      totalRows: exactCount ?? 0,
      fileName: (exactCount ?? 0) > 0 ? "classificacao_segmentos" : null,
      uploadedAt: null,
    });
  } catch (error) {
    req.log.error({ error }, "bases segmentos status failed");
    res.status(500).json({ error: "Falha ao carregar status da base segmentos" });
  }
});

export default router;
