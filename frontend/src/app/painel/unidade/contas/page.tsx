import { redirect } from "next/navigation";
import { CreateUserAccount } from "@/features/unit-admin/create-user-account";
import { getSession } from "@/lib/auth/session";

export default async function UnitAdminAccountsPage() {
  const session = await getSession();
  if (
    session.user?.role !== "UNIT_ADMIN" ||
    !session.user.permissions?.includes("CREATE_USER_ACCOUNT")
  )
    redirect("/painel/unidade");
  return (
    <main className="main">
      <CreateUserAccount />
    </main>
  );
}
