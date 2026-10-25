import "server-only";

const baseUrl = process.env.FASTAPI_INTERNAL_URL;

export async function apiRequest(path: string, init: RequestInit = {}) {
  if (!baseUrl) throw new Error("FASTAPI_INTERNAL_URL não está configurada.");
  return fetch(`${baseUrl.replace(/\/$/, "")}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", ...init.headers },
  });
}
