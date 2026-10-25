import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  SuperAdminDashboard,
  type SuperAdminSection,
} from "@/features/super-admin/super-admin-dashboard";

export async function SuperAdminPageContent({ section }: { section: SuperAdminSection }) {
  const session = await getSession();
  if (session.user?.role !== "SUPER_ADMIN") redirect("/painel");
  return (
    <main className="main">
      <SuperAdminDashboard currentUserId={session.user.id} section={section} />
    </main>
  );
}
