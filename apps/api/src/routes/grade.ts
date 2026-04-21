import { Router, type IRouter } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const router: IRouter = Router();

type GradeSnapshot = {
  id: number;
  uploaded_at: string;
};

type GradeRow = {
  id: number;
  codigo_produto: number;
  descricao_produto: string;
  unidade_medida: string;
  grade_estoque: number;
  grade_cadastrada: number;
  reserva: number;
  saida: number;
  saldo_disponivel: number;
};

type Base0111Row = {
  codigo: string;
  embalagem: string;
  tipo_marca: string;
  codigo_produto_sap: string;
};

type SegmentoRow = {
  codigo_produto: number;
  segmento: string;
};

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
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) sao obrigatorios para as rotas de grade.",
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

async function loadLatestSnapshot(table: string): Promise<GradeSnapshot | null> {
  const { data, error } = await getSupabaseReadClient()
    .from(table)
    .select("id, uploaded_at")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as GradeSnapshot | null) ?? null;
}

function computeCurvaMap(rows: GradeRow[]): Map<number, string> {
  const sorted = [...rows].sort(
    (a, b) => (b.grade_cadastrada ?? 0) - (a.grade_cadastrada ?? 0),
  );

  const curvaById = new Map<number, string>();

  if (sorted.length === 0) {
    return curvaById;
  }

  let lastValue: number | null = null;
  let currentRank = 1;

  sorted.forEach((row, index) => {
    const currentValue = row.grade_cadastrada ?? 0;
    if (lastValue === null || currentValue !== lastValue) {
      currentRank = index + 1;
      lastValue = currentValue;
    }

    const percentRank =
      sorted.length === 1 ? 0 : (currentRank - 1) / (sorted.length - 1);

    const curva =
      percentRank < 0.2 ? "A" : percentRank < 0.5 ? "B" : "C";

    curvaById.set(row.id, curva);
  });

  return curvaById;
}

router.get("/grade/consulta/segmentos", async (req, res): Promise<void> => {
  try {
    const { data, error } = await getSupabaseReadClient()
      .from("produto_segmento")
      .select("segmento")
      .neq("segmento", "");

    if (error) {
      throw error;
    }

    const segmentos = Array.from(
      new Set(
        ((data ?? []) as Array<{ segmento: string | null }>).map((row) =>
          String(row.segmento ?? "").trim(),
        ),
      ),
    )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    res.json({
      segmentos: segmentos.map((value) => ({
        value,
        label: value,
      })),
    });
  } catch (error) {
    req.log.error({ error }, "grade segmentos query failed");
    res.status(500).json({ error: "Falha ao carregar segmentos" });
  }
});

router.get("/grade/consulta", async (req, res): Promise<void> => {
  try {
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

    const gradeSnapshot = await loadLatestSnapshot("base_grade_snapshots");
    if (!gradeSnapshot) {
      res.json({
        items: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
        snapshotDate: null,
      });
      return;
    }

    const dim0111Snapshot = await loadLatestSnapshot("base_0111_snapshots");

    const { data: gradeRowsData, error: gradeRowsError } =
      await getSupabaseReadClient()
        .from("base_grade")
        .select(
          "id, codigo_produto, descricao_produto, unidade_medida, grade_estoque, grade_cadastrada, reserva, saida, saldo_disponivel",
        )
        .eq("snapshot_id", gradeSnapshot.id);

    if (gradeRowsError) {
      throw gradeRowsError;
    }

    const gradeRows = (gradeRowsData ?? []) as GradeRow[];
    const curvaById = computeCurvaMap(gradeRows);

    const codigos = Array.from(
      new Set(gradeRows.map((row) => String(row.codigo_produto))),
    );

    let base0111Rows: Base0111Row[] = [];
    if (dim0111Snapshot && codigos.length > 0) {
      const { data, error } = await getSupabaseReadClient()
        .from("base_0111")
        .select("codigo, embalagem, tipo_marca, codigo_produto_sap")
        .eq("snapshot_id", dim0111Snapshot.id)
        .in("codigo", codigos);

      if (error) {
        throw error;
      }

      base0111Rows = (data ?? []) as Base0111Row[];
    }

    const { data: segmentoRowsData, error: segmentoRowsError } =
      await getSupabaseReadClient()
        .from("produto_segmento")
        .select("codigo_produto, segmento");

    if (segmentoRowsError) {
      throw segmentoRowsError;
    }

    const segmentoRows = (segmentoRowsData ?? []) as SegmentoRow[];

    const base0111ByCodigo = new Map(
      base0111Rows.map((row) => [String(row.codigo), row]),
    );
    const segmentoByCodigo = new Map(
      segmentoRows.map((row) => [Number(row.codigo_produto), row.segmento ?? ""]),
    );

    const normalizedSearch = search?.trim().toLowerCase() ?? "";

    const filtered = gradeRows
      .map((row) => {
        const item0111 = base0111ByCodigo.get(String(row.codigo_produto));
        const itemSegmento = segmentoByCodigo.get(Number(row.codigo_produto)) ?? "";
        const itemCurva = curvaById.get(row.id) ?? "C";

        return {
          id: row.id,
          codigoProduto: row.codigo_produto,
          descricaoProduto: row.descricao_produto,
          unidadeMedida: row.unidade_medida,
          gradeEstoque: row.grade_estoque,
          gradeCadastrada: row.grade_cadastrada,
          reserva: row.reserva,
          saida: row.saida,
          saldoDisponivel: row.saldo_disponivel,
          curva: itemCurva,
          embalagem: item0111?.embalagem || null,
          tipoMarca: item0111?.tipo_marca || null,
          codigoProdutoSap: item0111?.codigo_produto_sap || null,
          segmento: itemSegmento || null,
        };
      })
      .filter((item) => {
        if (normalizedSearch) {
          const matchesSearch =
            item.descricaoProduto.toLowerCase().includes(normalizedSearch) ||
            String(item.codigoProduto).includes(normalizedSearch);

          if (!matchesSearch) {
            return false;
          }
        }

        if (status === "disponivel" && Number(item.saldoDisponivel) <= 0) {
          return false;
        }

        if (status === "ruptura" && Number(item.saldoDisponivel) > 0) {
          return false;
        }

        if (segmento && item.segmento !== segmento) {
          return false;
        }

        if (curva && item.curva !== curva) {
          return false;
        }

        return true;
      })
      .sort((a, b) =>
        a.descricaoProduto.localeCompare(b.descricaoProduto, "pt-BR"),
      );

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limitNum);

    res.json({
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      snapshotDate: gradeSnapshot.uploaded_at,
    });
  } catch (error) {
    req.log.error({ error, query: req.query }, "grade consulta query failed");
    res.status(500).json({ error: "Falha ao carregar consulta de grade" });
  }
});

router.get("/grade/consulta/snapshot", async (req, res): Promise<void> => {
  try {
    const snap = await loadLatestSnapshot("base_grade_snapshots");

    if (!snap) {
      res.json({ fileName: null, uploadedAt: null, totalRows: null });
      return;
    }

    const { data, error } = await getSupabaseReadClient()
      .from("base_grade_snapshots")
      .select("file_name, uploaded_at, total_rows")
      .eq("id", snap.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    res.json({
      fileName: data?.file_name ?? null,
      uploadedAt: data?.uploaded_at ?? null,
      totalRows: data?.total_rows ?? null,
    });
  } catch (error) {
    req.log.error({ error }, "grade snapshot query failed");
    res.status(500).json({ error: "Falha ao carregar snapshot da grade" });
  }
});

export default router;
