import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiRequest } from "@/lib/api/server";
import { hasTrustedOrigin } from "@/lib/auth/origin";
import { getSession, type SessionUser } from "@/lib/auth/session";

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(1).max(1024) });
const userSchema = z.object({
  id: z.number().int().positive(),
  email: z.email(),
  role: z.enum(["USER", "UNIT_ADMIN", "SUPER_ADMIN"]),
  organizational_unit_id: z.number().int().positive().nullable(),
  is_active: z.boolean(),
  permissions: z.array(z.enum(["CREATE_USER_ACCOUNT"])).default([]),
});

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ detail: "Origem inválida." }, { status: 403 });
  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ detail: "Email ou palavra-passe inválidos." }, { status: 422 });

  const login = await apiRequest("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  if (!login.ok)
    return NextResponse.json(
      { detail: "Não foi possível iniciar sessão. Verifique as credenciais." },
      { status: login.status },
    );

  const tokenData = z
    .object({ access_token: z.string().min(1), expires_in: z.number().positive() })
    .safeParse(await login.json());
  if (!tokenData.success)
    return NextResponse.json({ detail: "Resposta de autenticação inválida." }, { status: 502 });
  const me = await apiRequest("/auth/me", {
    headers: { Authorization: `Bearer ${tokenData.data.access_token}` },
  });
  const userData = userSchema.safeParse(await me.json().catch(() => null));
  if (!me.ok || !userData.success || !userData.data.is_active) {
    return NextResponse.json(
      { detail: "Não foi possível validar a conta." },
      { status: me.ok ? 502 : me.status },
    );
  }

  const session = await getSession();
  session.accessToken = tokenData.data.access_token;
  session.expiresAt = Date.now() + tokenData.data.expires_in * 1000;
  session.user = userData.data as SessionUser;
  await session.save();
  return NextResponse.json({ user: session.user }, { headers: { "Cache-Control": "no-store" } });
}
