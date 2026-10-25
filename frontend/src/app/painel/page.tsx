import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function DashboardRedirect() {
  const session = await getSession();
  if (
    !session.accessToken ||
    !session.user ||
    !session.expiresAt ||
    session.expiresAt <= Date.now()
  )
    redirect("/entrar");
  if (session.user.role === "SUPER_ADMIN") redirect("/painel/super-admin");
  if (session.user.role === "UNIT_ADMIN") redirect("/painel/unidade");
  redirect("/painel/perfil");
}
