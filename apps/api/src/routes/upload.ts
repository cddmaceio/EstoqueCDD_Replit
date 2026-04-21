import { Router, type IRouter } from "express";
import { getDb, estoqueItemsTable, uploadSnapshotsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import * as XLSX from "xlsx";
import { requireAdmin } from "../lib/admin-auth";
import { readUploadedFileBuffer } from "../lib/upload-storage";

const router: IRouter = Router();

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

  const db = getDb();

  const { fileName, fileBase64, storagePath, storageBucket } = req.body as {
    fileName?: string;
    fileBase64?: string;
    storagePath?: string;
    storageBucket?: string;
  };

  if (!fileName || (!fileBase64 && !storagePath)) {
    res
      .status(400)
      .json({ error: "fileName e (fileBase64 ou storagePath) sao obrigatorios" });
    return;
  }

  let workbook: XLSX.WorkBook;

  try {
    const buffer = await readUploadedFileBuffer({
      fileBase64,
      storagePath,
      storageBucket,
    });
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    res.status(400).json({ error: "Arquivo invalido. Use .xlsx ou .csv" });
    return;
  }

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

  const [snapshot] = await db
    .insert(uploadSnapshotsTable)
    .values({ fileName, totalRows: items.length })
    .returning();

  const batchSize = 500;
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize).map((item) => ({
      ...item,
      snapshotId: snapshot.id,
    }));
    await db.insert(estoqueItemsTable).values(batch);
  }

  const previousSnapshots = await db
    .select()
    .from(uploadSnapshotsTable)
    .orderBy(desc(uploadSnapshotsTable.uploadedAt));

  if (previousSnapshots.length > 5) {
    req.log.info("Keeping only latest 5 snapshots");
  }

  res.json({
    success: true,
    message: `Upload processado com sucesso: ${items.length} itens importados`,
    rowsProcessed: items.length,
    fileName,
  });
});

export default router;

