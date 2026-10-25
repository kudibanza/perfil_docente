import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session.accessToken || !session.expiresAt || session.expiresAt <= Date.now()) {
    session.destroy();
    return NextResponse.json(
      { detail: "Sessão expirada." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const response = await apiRequest("/auth/me", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (response.status === 401) {
    session.destroy();
    return NextResponse.json(
      { detail: "Sessão inválida ou expirada." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!response.ok)
    return NextResponse.json(
      { detail: "Não foi possível consultar a sessão." },
      { status: response.status, headers: { "Cache-Control": "no-store" } },
    );
  const user = await response.json();
  session.user = user;
  await session.save();
  return NextResponse.json({ user: session.user }, { headers: { "Cache-Control": "no-store" } });
}
