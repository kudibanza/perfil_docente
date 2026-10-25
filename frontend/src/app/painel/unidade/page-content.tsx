import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  UnitAdminDashboard,
  type UnitAdminSection,
} from "@/features/unit-admin/unit-admin-dashboard";
import { UnitStatistics } from "@/features/unit-admin/unit-statistics";

type Section = "dashboard" | UnitAdminSection;

export async function UnitAdminPageContent({ section }: { section: Section }) {
  const session = await getSession();
  const organizationalUnitId = session.user?.organizational_unit_id;
  if (session.user?.role !== "UNIT_ADMIN" || !organizationalUnitId) redirect("/painel");
  if (section === "dashboard")
    return (
      <main className="main">
        <UnitStatistics organizationalUnitId={organizationalUnitId} />
      </main>
    );
  return (
    <main className="main">
      <UnitAdminDashboard
        organizationalUnitId={organizationalUnitId}
        section={section}
        showInternalTabs={false}
      />
    </main>
  );
}
