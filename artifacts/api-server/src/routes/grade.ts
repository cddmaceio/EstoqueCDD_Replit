import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { baseGradeTable, baseGradeSnapshotsTable, base0111Table, base0111SnapshotsTable } from "@workspace/db";
import { eq, ilike, or, sql, desc, and, gt, lte } from "drizzle-orm";

const router: IRouter = Router();

async function getLatest0111SnapshotId(): Promise<number | null> {
  const [snap] = await db
    .select({ id: base0111SnapshotsTable.id })
    .from(base0111SnapshotsTable)
    .orderBy(desc(base0111SnapshotsTable.uploadedAt))
    .limit(1);
  return snap?.id ?? null;
}

router.get("/grade/consulta", async (req, res): Promise<void> => {
  const {
    search,
    status,
    page = "1",
    limit = "20",
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page ?? "1", 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? "20", 10)));
  const offset = (pageNum - 1) * limitNum;

  const [latestGradeSnapshot] = await db
    .select()
    .from(baseGradeSnapshotsTable)
    .orderBy(desc(baseGradeSnapshotsTable.uploadedAt))
    .limit(1);

  if (!latestGradeSnapshot) {
    res.json({ items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0, snapshotDate: null });
    return;
  }

  const gradeSnapshotId = latestGradeSnapshot.id;
  const snapshotDate = latestGradeSnapshot.uploadedAt.toISOString();
  const dim0111SnapshotId = await getLatest0111SnapshotId();

  const conditions = [eq(baseGradeTable.snapshotId, gradeSnapshotId)];

  if (search) {
    const searchTerm = `%${search}%`;
    conditions.push(
      or(
        ilike(baseGradeTable.descricaoProduto, searchTerm),
        sql`${baseGradeTable.codigoProduto}::text ilike ${searchTerm}`,
      )!,
    );
  }

  if (status === "disponivel") {
    conditions.push(gt(baseGradeTable.saldoDisponivel, 0));
  } else if (status === "ruptura") {
    conditions.push(lte(baseGradeTable.saldoDisponivel, 0));
  }

  const whereClause = and(...conditions);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(baseGradeTable)
    .where(whereClause);

  const joinCondition = dim0111SnapshotId
    ? and(
        sql`${base0111Table.codigo}::bigint = ${baseGradeTable.codigoProduto}`,
        eq(base0111Table.snapshotId, dim0111SnapshotId),
      )
    : sql`${base0111Table.codigo}::bigint = ${baseGradeTable.codigoProduto}`;

  const rows = await db
    .select({
      id: baseGradeTable.id,
      codigoProduto: baseGradeTable.codigoProduto,
      descricaoProduto: baseGradeTable.descricaoProduto,
      unidadeMedida: baseGradeTable.unidadeMedida,
      gradeEstoque: baseGradeTable.gradeEstoque,
      gradeCadastrada: baseGradeTable.gradeCadastrada,
      reserva: baseGradeTable.reserva,
      saida: baseGradeTable.saida,
      saldoDisponivel: baseGradeTable.saldoDisponivel,
      embalagem: base0111Table.embalagem,
      codigoProdutoSap: base0111Table.codigoProdutoSap,
    })
    .from(baseGradeTable)
    .leftJoin(base0111Table, joinCondition!)
    .where(whereClause)
    .orderBy(baseGradeTable.descricaoProduto)
    .limit(limitNum)
    .offset(offset);

  res.json({
    items: rows,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    snapshotDate,
  });
});

router.get("/grade/consulta/snapshot", async (_req, res): Promise<void> => {
  const [snapshot] = await db
    .select()
    .from(baseGradeSnapshotsTable)
    .orderBy(desc(baseGradeSnapshotsTable.uploadedAt))
    .limit(1);

  if (!snapshot) {
    res.json({ fileName: null, uploadedAt: null, totalRows: null });
    return;
  }

  res.json({
    fileName: snapshot.fileName,
    uploadedAt: snapshot.uploadedAt.toISOString(),
    totalRows: snapshot.totalRows,
  });
});

export default router;
