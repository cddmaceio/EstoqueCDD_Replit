import { Router, type IRouter } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "../lib/admin-auth";

const router: IRouter = Router();

type SnapshotRow = {
  id: number;
  file_name: string;
  uploaded_at: string;
  total_rows: number;
};

type EstoqueItemRow = {
  id: number;
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
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) sao obrigatorios para as rotas de estoque.",
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

async function getLatestEstoqueSnapshot(): Promise<SnapshotRow | null> {
  const { data, error } = await getSupabaseReadClient()
    .from("upload_snapshots")
    .select("id, file_name, uploaded_at, total_rows")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as SnapshotRow | null) ?? null;
}

async function getSnapshotItems(snapshotId: number): Promise<EstoqueItemRow[]> {
  const { data, error } = await getSupabaseReadClient()
    .from("estoque_items")
    .select(
      "id, snapshot_id, produto, marca, embalagem, doi, status, demanda, min, max, curva",
    )
    .eq("snapshot_id", snapshotId);

  if (error) {
    throw error;
  }

  return (data ?? []) as EstoqueItemRow[];
}

router.get("/estoque", async (req, res): Promise<void> => {
  try {
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

    const latestSnapshot = await getLatestEstoqueSnapshot();

    if (!latestSnapshot) {
      res.json({
        items: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      });
      return;
    }

    const normalizedSearch = search?.trim().toLowerCase() ?? "";
    const normalizedMarca = marca?.trim().toLowerCase() ?? "";

    const items = (await getSnapshotItems(latestSnapshot.id))
      .filter((item) => {
        if (normalizedSearch) {
          const matchesSearch =
            item.produto.toLowerCase().includes(normalizedSearch) ||
            item.marca.toLowerCase().includes(normalizedSearch);

          if (!matchesSearch) {
            return false;
          }
        }

        if (normalizedMarca && item.marca.toLowerCase() !== normalizedMarca) {
          return false;
        }

        if (status && (status === "OK" || status === "NOK") && item.status !== status) {
          return false;
        }

        if (curva && (curva === "A" || curva === "B" || curva === "C") && item.curva !== curva) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.produto.localeCompare(b.produto, "pt-BR"));

    const total = items.length;

    res.json({
      items: items.slice(offset, offset + limitNum),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    req.log.error({ error, query: req.query }, "estoque consulta failed");
    res.status(500).json({ error: "Falha ao carregar estoque" });
  }
});

router.get("/estoque/marcas", async (req, res): Promise<void> => {
  try {
    const latestSnapshot = await getLatestEstoqueSnapshot();

    if (!latestSnapshot) {
      res.json({ marcas: [] });
      return;
    }

    const marcas = Array.from(
      new Set((await getSnapshotItems(latestSnapshot.id)).map((item) => item.marca.trim())),
    )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    res.json({ marcas });
  } catch (error) {
    req.log.error({ error }, "estoque marcas failed");
    res.status(500).json({ error: "Falha ao carregar marcas" });
  }
});

router.get("/estoque/dashboard", async (req, res): Promise<void> => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const latestSnapshot = await getLatestEstoqueSnapshot();

    if (!latestSnapshot) {
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

    const items = await getSnapshotItems(latestSnapshot.id);
    const total = items.length;
    const totalOK = items.filter((item) => item.status === "OK").length;
    const totalNOK = items.filter((item) => item.status === "NOK").length;
    const mediaDOI =
      total > 0
        ? items.reduce((sum, item) => sum + Number(item.doi ?? 0), 0) / total
        : 0;

    const produtosPorMarca = Array.from(
      items.reduce((acc, item) => {
        const current = acc.get(item.marca) ?? 0;
        acc.set(item.marca, current + 1);
        return acc;
      }, new Map<string, number>()),
    )
      .map(([marca, totalPorMarca]) => ({
        marca,
        total: totalPorMarca,
        curva:
          total > 0 && totalPorMarca >= total * 0.2
            ? "A"
            : total > 0 && totalPorMarca >= total * 0.1
              ? "B"
              : "C",
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    res.json({
      totalSKUs: total,
      percentOK: total > 0 ? Math.round((totalOK / total) * 100) : 0,
      percentNOK: total > 0 ? Math.round((totalNOK / total) * 100) : 0,
      mediaDOI: total > 0 ? Math.round(mediaDOI * 10) / 10 : 0,
      distribuicaoStatus: [
        { name: "OK", value: totalOK },
        { name: "NOK", value: totalNOK },
      ],
      produtosPorMarca,
      snapshotDate: latestSnapshot.uploaded_at,
    });
  } catch (error) {
    req.log.error({ error }, "estoque dashboard failed");
    res.status(500).json({ error: "Falha ao carregar dashboard" });
  }
});

router.get("/estoque/upload-status", async (req, res): Promise<void> => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const latestSnapshot = await getLatestEstoqueSnapshot();

    if (!latestSnapshot) {
      res.json({ fileName: null, uploadedAt: null, totalRows: null });
      return;
    }

    res.json({
      fileName: latestSnapshot.file_name,
      uploadedAt: latestSnapshot.uploaded_at,
      totalRows: latestSnapshot.total_rows,
    });
  } catch (error) {
    req.log.error({ error }, "estoque upload status failed");
    res.status(500).json({ error: "Falha ao carregar status do upload" });
  }
});

export default router;
