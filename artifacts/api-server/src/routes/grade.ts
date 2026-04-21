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

async function getLatestGradeSnapshotId(): Promise<{ id: number; uploadedAt: Date } | null> {
  const [snap] = await db
    .select()
    .from(baseGradeSnapshotsTable)
    .orderBy(desc(baseGradeSnapshotsTable.uploadedAt))
    .limit(1);
  return snap ?? null;
}

router.get("/grade/consulta/segmentos", async (_req, res): Promise<void> => {
  const gradeSnapshot = await getLatestGradeSnapshotId();
  const dim0111SnapshotId = await getLatest0111SnapshotId();

  if (!gradeSnapshot || !dim0111SnapshotId) {
    res.json({ segmentos: [] });
    return;
  }

  const rows = await db
    .selectDistinct({ tipoMarca: base0111Table.tipoMarca })
    .from(baseGradeTable)
    .innerJoin(
      base0111Table,
      and(
        sql`${base0111Table.codigo}::bigint = ${baseGradeTable.codigoProduto}`,
        eq(base0111Table.snapshotId, dim0111SnapshotId),
      )!,
    )
    .where(eq(baseGradeTable.snapshotId, gradeSnapshot.id))
    .orderBy(base0111Table.tipoMarca);

  const segmentos = rows
    .map((r) => r.tipoMarca)
    .filter(Boolean)
    .map((t) => ({
      value: t,
      label: t.replace(/^\d+\s*-\s*/, ""),
    }));

  res.json({ segmentos });
});

router.get("/grade/consulta", async (req, res): Promise<void> => {
  const {
    search,
    status,
    segmento,
    page = "1",
    limit = "20",
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page ?? "1", 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? "20", 10)));
  const offset = (pageNum - 1) * limitNum;

  const gradeSnapshot = await getLatestGradeSnapshotId();
  if (!gradeSnapshot) {
    res.json({ items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0, snapshotDate: null });
    return;
  }

  const dim0111SnapshotId = await getLatest0111SnapshotId();

  const gradeConditions = [eq(baseGradeTable.snapshotId, gradeSnapshot.id)];

  if (search) {
    const searchTerm = `%${search}%`;
    gradeConditions.push(
      or(
        ilike(baseGradeTable.descricaoProduto, searchTerm),
        sql`${baseGradeTable.codigoProduto}::text ilike ${searchTerm}`,
      )!,
    );
  }

  if (status === "disponivel") {
    gradeConditions.push(gt(baseGradeTable.saldoDisponivel, 0));
  } else if (status === "ruptura") {
    gradeConditions.push(lte(baseGradeTable.saldoDisponivel, 0));
  }

  const joinCondition = dim0111SnapshotId
    ? and(
        sql`${base0111Table.codigo}::bigint = ${baseGradeTable.codigoProduto}`,
        eq(base0111Table.snapshotId, dim0111SnapshotId),
      )
    : sql`${base0111Table.codigo}::bigint = ${baseGradeTable.codigoProduto}`;

  const dimConditions = segmento ? [eq(base0111Table.tipoMarca, segmento)] : [];

  const gradeWhereClause = and(...gradeConditions);
  const dimWhereClause = dimConditions.length > 0 ? and(...dimConditions) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(baseGradeTable)
    .leftJoin(base0111Table, joinCondition!)
    .where(dimWhereClause ? and(gradeWhereClause, dimWhereClause) : gradeWhereClause);

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
      tipoMarca: base0111Table.tipoMarca,
      codigoProdutoSap: base0111Table.codigoProdutoSap,
    })
    .from(baseGradeTable)
    .leftJoin(base0111Table, joinCondition!)
    .where(dimWhereClause ? and(gradeWhereClause, dimWhereClause) : gradeWhereClause)
    .orderBy(baseGradeTable.descricaoProduto)
    .limit(limitNum)
    .offset(offset);

  res.json({
    items: rows,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    snapshotDate: gradeSnapshot.uploadedAt.toISOString(),
  });
});

router.get("/grade/consulta/snapshot", async (_req, res): Promise<void> => {
  const snapshot = await getLatestGradeSnapshotId();
  if (!snapshot) {
    res.json({ fileName: null, uploadedAt: null, totalRows: null });
    return;
  }
  const [full] = await db
    .select()
    .from(baseGradeSnapshotsTable)
    .where(eq(baseGradeSnapshotsTable.id, snapshot.id));
  res.json(full ? {
    fileName: full.fileName,
    uploadedAt: full.uploadedAt.toISOString(),
    totalRows: full.totalRows,
  } : { fileName: null, uploadedAt: null, totalRows: null });
});

export default router;
