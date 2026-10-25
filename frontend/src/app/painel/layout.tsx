import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin-shell";

function hasExpired(expiresAt: number | undefined): boolean {
  return !expiresAt || expiresAt <= Date.now();
}

export default async function ProtectedPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session.accessToken || !session.user || hasExpired(session.expiresAt)) redirect("/entrar");
  return (
    <AdminShell
      role={session.user.role}
      email={session.user.email}
      permissions={session.user.permissions}
    >
      {children}
    </AdminShell>
  );
}
