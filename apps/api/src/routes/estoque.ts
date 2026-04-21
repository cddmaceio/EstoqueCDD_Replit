import { Router, type IRouter } from "express";
import { db, estoqueItemsTable, uploadSnapshotsTable } from "@workspace/db";
import { eq, ilike, and, or, sql, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/admin-auth";

const router: IRouter = Router();

router.get("/estoque", async (req, res): Promise<void> => {
  const {
    search,
    marca,
    status,
    curva,
    page = "1",
    limit = "20",
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page ?? "1", 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? "20", 10)));
  const offset = (pageNum - 1) * limitNum;

  const latestSnapshot = await db
    .select()
    .from(uploadSnapshotsTable)
    .orderBy(desc(uploadSnapshotsTable.uploadedAt))
    .limit(1);

  if (latestSnapshot.length === 0) {
    res.json({ items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 });
    return;
  }

  const snapshotId = latestSnapshot[0].id;

  const conditions = [eq(estoqueItemsTable.snapshotId, snapshotId)];

  if (search) {
    conditions.push(
      or(
        ilike(estoqueItemsTable.produto, `%${search}%`),
        ilike(estoqueItemsTable.marca, `%${search}%`),
      )!,
    );
  }

  if (marca) {
    conditions.push(ilike(estoqueItemsTable.marca, marca));
  }

  if (status && (status === "OK" || status === "NOK")) {
    conditions.push(eq(estoqueItemsTable.status, status));
  }

  if (curva && (curva === "A" || curva === "B" || curva === "C")) {
    conditions.push(eq(estoqueItemsTable.curva, curva));
  }

  const whereClause = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(estoqueItemsTable)
    .where(whereClause);

  const items = await db
    .select()
    .from(estoqueItemsTable)
    .where(whereClause)
    .orderBy(estoqueItemsTable.produto)
    .limit(limitNum)
    .offset(offset);

  const totalPages = Math.ceil(count / limitNum);

  res.json({
    items,
    total: count,
    page: pageNum,
    limit: limitNum,
    totalPages,
  });
});

router.get("/estoque/marcas", async (_req, res): Promise<void> => {
  const latestSnapshot = await db
    .select()
    .from(uploadSnapshotsTable)
    .orderBy(desc(uploadSnapshotsTable.uploadedAt))
    .limit(1);

  if (latestSnapshot.length === 0) {
    res.json({ marcas: [] });
    return;
  }

  const snapshotId = latestSnapshot[0].id;

  const marcas = await db
    .selectDistinct({ marca: estoqueItemsTable.marca })
    .from(estoqueItemsTable)
    .where(eq(estoqueItemsTable.snapshotId, snapshotId))
    .orderBy(estoqueItemsTable.marca);

  res.json({ marcas: marcas.map((m) => m.marca) });
});

router.get("/estoque/dashboard", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const latestSnapshot = await db
    .select()
    .from(uploadSnapshotsTable)
    .orderBy(desc(uploadSnapshotsTable.uploadedAt))
    .limit(1);

  if (latestSnapshot.length === 0) {
    res.json({
      totalSKUs: 0,
      percentOK: 0,
      percentNOK: 0,
      mediaDOI: 0,
      distribuicaoStatus: [],
      produtosPorMarca: [],
      snapshotDate: null,
    });
    return;
  }

  const snapshot = latestSnapshot[0];
  const snapshotId = snapshot.id;

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      totalOK: sql<number>`sum(case when status = 'OK' then 1 else 0 end)::int`,
      totalNOK: sql<number>`sum(case when status = 'NOK' then 1 else 0 end)::int`,
      mediaDOI: sql<number>`avg(doi)::float`,
    })
    .from(estoqueItemsTable)
    .where(eq(estoqueItemsTable.snapshotId, snapshotId));

  const total = totals.total ?? 0;
  const totalOK = totals.totalOK ?? 0;
  const totalNOK = totals.totalNOK ?? 0;

  const produtosPorMarca = await db
    .select({
      marca: estoqueItemsTable.marca,
      total: sql<number>`count(*)::int`,
      curva: sql<string>`
        case 
          when count(*) >= (select count(*) * 0.2 from estoque_items where snapshot_id = ${snapshotId}) then 'A'
          when count(*) >= (select count(*) * 0.1 from estoque_items where snapshot_id = ${snapshotId}) then 'B'
          else 'C'
        end
      `,
    })
    .from(estoqueItemsTable)
    .where(eq(estoqueItemsTable.snapshotId, snapshotId))
    .groupBy(estoqueItemsTable.marca)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  res.json({
    totalSKUs: total,
    percentOK: total > 0 ? Math.round((totalOK / total) * 100) : 0,
    percentNOK: total > 0 ? Math.round((totalNOK / total) * 100) : 0,
    mediaDOI: totals.mediaDOI ? Math.round(totals.mediaDOI * 10) / 10 : 0,
    distribuicaoStatus: [
      { name: "OK", value: totalOK },
      { name: "NOK", value: totalNOK },
    ],
    produtosPorMarca,
    snapshotDate: snapshot.uploadedAt.toISOString(),
  });
});

router.get("/estoque/upload-status", async (req, res): Promise<void> => {
  if (!(await requireAdmin(req, res))) return;

  const latestSnapshot = await db
    .select()
    .from(uploadSnapshotsTable)
    .orderBy(desc(uploadSnapshotsTable.uploadedAt))
    .limit(1);

  if (latestSnapshot.length === 0) {
    res.json({ fileName: null, uploadedAt: null, totalRows: null });
    return;
  }

  const snapshot = latestSnapshot[0];
  res.json({
    fileName: snapshot.fileName,
    uploadedAt: snapshot.uploadedAt.toISOString(),
    totalRows: snapshot.totalRows,
  });
});

export default router;
