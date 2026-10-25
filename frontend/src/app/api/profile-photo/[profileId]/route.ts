import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/server";
import { getSession } from "@/lib/auth/session";

export async function GET(_request: Request, context: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await context.params;
  if (!/^\d+$/.test(profileId))
    return NextResponse.json({ detail: "Perfil inválido." }, { status: 404 });
  const session = await getSession();
  if (!session.accessToken || !session.expiresAt || session.expiresAt <= Date.now()) {
    session.destroy();
    return NextResponse.json({ detail: "Sessão expirada." }, { status: 401 });
  }
  const upstream = await apiRequest(`/profiles/${profileId}/photo`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
