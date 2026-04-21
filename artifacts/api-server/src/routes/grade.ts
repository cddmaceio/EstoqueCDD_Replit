import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { baseGradeSnapshotsTable, base0111SnapshotsTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";

const router: IRouter = Router();

async function getLatestSnapshotId(table: typeof baseGradeSnapshotsTable): Promise<{ id: number; uploadedAt: Date } | null> {
  const [snap] = await db.select().from(table).orderBy(desc(table.uploadedAt)).limit(1);
  return snap ?? null;
}

async function getLatest0111Id(): Promise<number | null> {
  const [snap] = await db.select({ id: base0111SnapshotsTable.id }).from(base0111SnapshotsTable).orderBy(desc(base0111SnapshotsTable.uploadedAt)).limit(1);
  return snap?.id ?? null;
}

const STATIC_SEGMENTOS = [
  "MKTPLACE",
  "MONDELEZ-MINALBA",
  "NAB",
  "SKU LIMIT",
  "Alto Giro",
  "Match",
  "Megabrands",
  "Resort",
  "FOCO_SEAL",
  "Litrinho",
  "Chopp",
];

router.get("/grade/consulta/segmentos", async (_req, res): Promise<void> => {
  res.json({ segmentos: STATIC_SEGMENTOS.map((s) => ({ value: s, label: s })) });
});

router.get("/grade/consulta", async (req, res): Promise<void> => {
  const {
    search,
    status,
    segmento,
    curva,
    page = "1",
    limit = "20",
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page ?? "1", 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? "20", 10)));
  const offset = (pageNum - 1) * limitNum;

  const gradeSnapshot = await getLatestSnapshotId(baseGradeSnapshotsTable);
  if (!gradeSnapshot) {
    res.json({ items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0, snapshotDate: null });
    return;
  }

  const dim0111Id = await getLatest0111Id();

  const searchTerm = search ? `%${search}%` : null;

  const result = await db.execute(sql`
    WITH grade_with_curva AS (
      SELECT
        g.id,
        g.codigo_produto,
        g.descricao_produto,
        g.unidade_medida,
        g.grade_estoque,
        g.grade_cadastrada,
        g.reserva,
        g.saida,
        g.saldo_disponivel,
        CASE
          WHEN PERCENT_RANK() OVER (ORDER BY g.grade_cadastrada DESC) < 0.20 THEN 'A'
          WHEN PERCENT_RANK() OVER (ORDER BY g.grade_cadastrada DESC) < 0.50 THEN 'B'
          ELSE 'C'
        END AS curva
      FROM base_grade g
      WHERE g.snapshot_id = ${gradeSnapshot.id}
    ),
    joined AS (
      SELECT
        gc.*,
        COALESCE(p.embalagem, '')          AS embalagem,
        COALESCE(p.tipo_marca, '')         AS tipo_marca,
        COALESCE(p.codigo_produto_sap, '') AS codigo_produto_sap,
        COALESCE(ps.segmento, '')          AS segmento
      FROM grade_with_curva gc
      LEFT JOIN base_0111 p
        ON p.codigo::bigint = gc.codigo_produto
        ${dim0111Id ? sql`AND p.snapshot_id = ${dim0111Id}` : sql``}
      LEFT JOIN produto_segmento ps
        ON ps.codigo_produto = gc.codigo_produto
    ),
    filtered AS (
      SELECT * FROM joined
      WHERE 1=1
        ${searchTerm ? sql`AND (descricao_produto ILIKE ${searchTerm} OR codigo_produto::text ILIKE ${searchTerm})` : sql``}
        ${status === "disponivel" ? sql`AND saldo_disponivel > 0` : sql``}
        ${status === "ruptura" ? sql`AND saldo_disponivel <= 0` : sql``}
        ${segmento ? sql`AND segmento = ${segmento}` : sql``}
        ${curva ? sql`AND curva = ${curva}` : sql``}
    )
    SELECT *, COUNT(*) OVER () AS total_count
    FROM filtered
    ORDER BY descricao_produto
    LIMIT ${limitNum} OFFSET ${offset}
  `);

  const rows = result.rows as Record<string, unknown>[];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

  const items = rows.map((r) => ({
    id: r.id,
    codigoProduto: r.codigo_produto,
    descricaoProduto: r.descricao_produto,
    unidadeMedida: r.unidade_medida,
    gradeEstoque: r.grade_estoque,
    gradeCadastrada: r.grade_cadastrada,
    reserva: r.reserva,
    saida: r.saida,
    saldoDisponivel: r.saldo_disponivel,
    curva: r.curva,
    embalagem: r.embalagem || null,
    tipoMarca: r.tipo_marca || null,
    codigoProdutoSap: r.codigo_produto_sap || null,
    segmento: r.segmento || null,
  }));

  res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    snapshotDate: gradeSnapshot.uploadedAt.toISOString(),
  });
});

router.get("/grade/consulta/snapshot", async (_req, res): Promise<void> => {
  const [snap] = await db.select().from(baseGradeSnapshotsTable).orderBy(desc(baseGradeSnapshotsTable.uploadedAt)).limit(1);
  if (!snap) { res.json({ fileName: null, uploadedAt: null, totalRows: null }); return; }
  res.json({ fileName: snap.fileName, uploadedAt: snap.uploadedAt.toISOString(), totalRows: snap.totalRows });
});

export default router;
