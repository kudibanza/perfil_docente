import { NextRequest, NextResponse } from "next/server";
import { hasTrustedOrigin } from "@/lib/auth/origin";
import { getSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ detail: "Origem inválida." }, { status: 403 });
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
