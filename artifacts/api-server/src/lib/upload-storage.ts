import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_UPLOAD_BUCKET = "app-uploads";

let supabaseAdmin: SupabaseClient | null = null;
let ensureBucketPromise: Promise<void> | null = null;

function getUploadBucket(): string {
  return process.env.SUPABASE_UPLOAD_BUCKET ?? DEFAULT_UPLOAD_BUCKET;
}

function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios para upload via Storage.",
    );
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}

async function ensureUploadBucketExists(): Promise<void> {
  if (ensureBucketPromise) {
    return ensureBucketPromise;
  }

  ensureBucketPromise = (async () => {
    const bucketId = getUploadBucket();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.getBucket(bucketId);

    if (!error && data) {
      return;
    }

    const { error: createError } = await supabase.storage.createBucket(bucketId, {
      public: false,
      fileSizeLimit: "50MB",
    });

    if (createError && !createError.message.toLowerCase().includes("already")) {
      throw createError;
    }
  })().catch((error) => {
    ensureBucketPromise = null;
    throw error;
  });

  return ensureBucketPromise;
}

function sanitizeFileName(fileName: string): string {
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()?.toLowerCase() ?? ""}` : "";
  const baseName = parts.join(".") || fileName;

  const normalized = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${normalized || "arquivo"}${extension}`;
}

export type StorageUploadTarget = {
  bucket: string;
  path: string;
  token: string;
};

export async function createSignedUploadTarget(
  category: string,
  fileName: string,
): Promise<StorageUploadTarget> {
  await ensureUploadBucketExists();

  const safeCategory = category.replace(/[^a-zA-Z0-9/_-]+/g, "-");
  const safeFileName = sanitizeFileName(fileName);
  const path = `${safeCategory}/${Date.now()}-${safeFileName}`;
  const bucket = getUploadBucket();

  const { data, error } = await getSupabaseAdmin()
    .storage.from(bucket)
    .createSignedUploadUrl(path, {
      upsert: true,
    });

  if (error || !data) {
    throw error ?? new Error("Nao foi possivel criar URL assinada de upload.");
  }

  return {
    bucket,
    path,
    token: data.token,
  };
}

type UploadFileInput = {
  fileBase64?: string;
  storagePath?: string;
  storageBucket?: string;
};

export async function readUploadedFileBuffer(
  input: UploadFileInput,
): Promise<Buffer> {
  if (input.fileBase64) {
    return Buffer.from(input.fileBase64, "base64");
  }

  if (!input.storagePath) {
    throw new Error("Informe fileBase64 ou storagePath.");
  }

  await ensureUploadBucketExists();

  const { data, error } = await getSupabaseAdmin()
    .storage.from(input.storageBucket ?? getUploadBucket())
    .download(input.storagePath);

  if (error || !data) {
    throw error ?? new Error("Nao foi possivel baixar o arquivo do Storage.");
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function getDefaultUploadBucket(): string {
  return getUploadBucket();
}
