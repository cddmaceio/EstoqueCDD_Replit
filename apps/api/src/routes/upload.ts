import { Router, type IRouter } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { requireAdmin } from "../lib/admin-auth";
import { readUploadedFileBuffer } from "../lib/upload-storage";

const router: IRouter = Router();
let supabaseClient: SupabaseClient | null = null;

function getSupabaseWriteClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) sao obrigatorios para upload de estoque.",
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

async function insertSnapshot(
  fileName: string,
  totalRows: number,
): Promise<{ id: number }> {
  const { data, error } = await getSupabaseWriteClient()
    .from("upload_snapshots")
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

async function insertEstoqueRows(
  rows: Array<{
    snapshot_id: number;
    produto: string;
    marca: string;
    embalagem: string;
    doi: number;
    status: string;
    demanda: number;
    min: number;
    max: number;
    curva: string;
  }>,
): Promise<void> {
  if (!rows.length) {
    return;
  }

  const { error } = await getSupabaseWriteClient()
    .from("estoque_items")
    .insert(rows);

  if (error) {
    throw error;
  }
}

async function keepOnlyLatestEstoqueSnapshot(currentSnapshotId: number): Promise<void> {
  const client = getSupabaseWriteClient();

  const { error: rowsError } = await client
    .from("estoque_items")
    .delete()
    .neq("snapshot_id", currentSnapshotId);

  if (rowsError) {
    throw rowsError;
  }

  const { error: snapshotsError } = await client
    .from("upload_snapshots")
    .delete()
    .neq("id", currentSnapshotId);

  if (snapshotsError) {
    throw snapshotsError;
  }
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function mapRowToItem(row: Record<string, unknown>): {
  produto: string;
  marca: string;
  embalagem: string;
  doi: number;
  status: string;
  demanda: number;
  min: number;
  max: number;
  curva: string;
} | null {
  const normalized: Record<string, unknown> = {};

  for (const key of Object.keys(row)) {
    normalized[normalizeHeader(key)] = row[key];
  }

  const produto = String(
    normalized.produto ??
      normalized.descricao ??
      normalized.sku ??
      normalized.item ??
      "",
  ).trim();

  if (!produto) {
    return null;
  }

  const marca = String(
    normalized.marca ?? normalized.fornecedor ?? normalized.brand ?? "",
  ).trim();
  const embalagem = String(
    normalized.embalagem ?? normalized.unidade ?? normalized.emb ?? "",
  ).trim();
  const doi =
    parseFloat(
      String(
        normalized.doi ??
          normalized.diasestoque ??
          normalized.diainventario ??
          "0",
      ),
    ) || 0;
  const rawStatus = String(normalized.status ?? normalized.situacao ?? "OK")
    .trim()
    .toUpperCase();
  const status = rawStatus === "NOK" ? "NOK" : "OK";
  const demanda =
    parseFloat(
      String(normalized.demanda ?? normalized.venda ?? normalized.consumo ?? "0"),
    ) || 0;
  const min =
    parseFloat(
      String(normalized.min ?? normalized.minimo ?? normalized.estoquemin ?? "0"),
    ) || 0;
  const max =
    parseFloat(
      String(normalized.max ?? normalized.maximo ?? normalized.estoquemax ?? "0"),
    ) || 0;
  const rawCurva = String(
    normalized.curva ?? normalized.curvaabc ?? normalized.abc ?? "C",
  )
    .trim()
    .toUpperCase();
  const curva = ["A", "B", "C"].includes(rawCurva) ? rawCurva : "C";

  return { produto, marca, embalagem, doi, status, demanda, min, max, curva };
}

router.post("/estoque/upload", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) {
    return;
  }
  try {
    const { fileName, fileBase64, storagePath, storageBucket } = req.body as {
      fileName?: string;
      fileBase64?: string;
      storagePath?: string;
      storageBucket?: string;
    };

    if (!fileName || (!fileBase64 && !storagePath)) {
      res.status(400).json({
        error: "fileName e (fileBase64 ou storagePath) sao obrigatorios",
      });
      return;
    }

    const buffer = await readUploadedFileBuffer({
      fileBase64,
      storagePath,
      storageBucket,
    });
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      res.status(400).json({ error: "Planilha vazia" });
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    if (rows.length === 0) {
      res.status(400).json({ error: "Planilha sem dados" });
      return;
    }

    const items = rows
      .map(mapRowToItem)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (items.length === 0) {
      res
        .status(400)
        .json({ error: "Nenhum item valido encontrado na planilha" });
      return;
    }

    const snapshot = await insertSnapshot(fileName, items.length);

    const batchSize = 500;
    for (let index = 0; index < items.length; index += batchSize) {
      const batch = items.slice(index, index + batchSize).map((item) => ({
        snapshot_id: snapshot.id,
        produto: item.produto,
        marca: item.marca,
        embalagem: item.embalagem,
        doi: item.doi,
        status: item.status,
        demanda: item.demanda,
        min: item.min,
        max: item.max,
        curva: item.curva,
      }));

      await insertEstoqueRows(batch);
    }

    await keepOnlyLatestEstoqueSnapshot(snapshot.id);

    res.json({
      success: true,
      message: `Upload processado com sucesso: ${items.length} itens importados`,
      rowsProcessed: items.length,
      fileName,
    });
  } catch (error) {
    req.log.error({ error }, "estoque upload failed");
    res.status(500).json({ error: "Falha ao processar upload de estoque" });
  }
});

export default router;

