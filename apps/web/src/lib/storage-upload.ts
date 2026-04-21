import { getApiBaseUrl } from "./api-base-url";
import { getSupabaseAccessToken, getSupabaseClient } from "./supabase";

const API_BASE_URL = getApiBaseUrl();

type SignedUploadTarget = {
  bucket: string;
  path: string;
  token: string;
};

export type StoredUploadFile = {
  fileName: string;
  storageBucket: string;
  storagePath: string;
};

export async function encodeFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Nao foi possivel ler o arquivo selecionado."));
    };

    reader.onload = () => {
      const result = reader.result?.toString() ?? "";
      const base64 = result.split(",")[1];

      if (!base64) {
        reject(new Error("Nao foi possivel converter o arquivo."));
        return;
      }

      resolve(base64);
    };

    reader.readAsDataURL(file);
  });
}

async function createSignedUploadTarget(
  category: string,
  fileName: string,
): Promise<SignedUploadTarget> {
  const token = await getSupabaseAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/uploads/storage/sign`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ category, fileName }),
  });

  const payload = (await res.json()) as
    | SignedUploadTarget
    | { error?: string };

  if (!res.ok || !("bucket" in payload) || !("path" in payload) || !("token" in payload)) {
    const errorMessage =
      "error" in payload ? payload.error : undefined;
    throw new Error(errorMessage ?? "Nao foi possivel iniciar o upload.");
  }

  return payload;
}

export async function uploadFileToStorage(
  category: string,
  file: File,
): Promise<StoredUploadFile> {
  const target = await createSignedUploadTarget(category, file.name);

  const { error } = await getSupabaseClient()
    .storage.from(target.bucket)
    .uploadToSignedUrl(target.path, target.token, file, {
      upsert: true,
      contentType: file.type || undefined,
    });

  if (error) {
    throw error;
  }

  return {
    fileName: file.name,
    storageBucket: target.bucket,
    storagePath: target.path,
  };
}
