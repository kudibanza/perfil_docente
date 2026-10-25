import { NextRequest, NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/server";
import { hasTrustedOrigin } from "@/lib/auth/origin";
import { getSession } from "@/lib/auth/session";

const allowedRoots = new Set([
  "academic-years",
  "admin",
  "courses",
  "disciplines",
  "organizational-units",
  "profiles",
  "public",
  "users",
]);
const allowedMethods = new Set(["GET", "POST", "PATCH", "DELETE"]);

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!allowedMethods.has(request.method))
    return NextResponse.json({ detail: "Método não suportado." }, { status: 405 });
  if (request.method !== "GET" && !hasTrustedOrigin(request))
    return NextResponse.json({ detail: "Origem inválida." }, { status: 403 });

  const { path } = await context.params;
  if (
    !path.length ||
    path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part)) ||
    !allowedRoots.has(path[0])
  ) {
    return NextResponse.json({ detail: "Rota inválida." }, { status: 404 });
  }
  const session = await getSession();
  if (!session.accessToken || !session.expiresAt || session.expiresAt <= Date.now()) {
    session.destroy();
    return NextResponse.json({ detail: "Sessão expirada." }, { status: 401 });
  }

  const target = `/${path.join("/")}${request.nextUrl.search}`;
  const upstream = await apiRequest(target, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(request.headers.get("content-type")
        ? { "Content-Type": request.headers.get("content-type")! }
        : {}),
    },
    ...(request.method === "GET" ? {} : { body: await request.arrayBuffer() }),
  });
  if (upstream.status === 401) session.destroy();

  const headers = new Headers({ "Cache-Control": "no-store" });
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
