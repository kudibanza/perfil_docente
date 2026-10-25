import { MyProfile } from "@/features/profile/my-profile";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ProfilePanel() {
  const session = await getSession();
  if (session.user?.role !== "USER") redirect("/painel");
  return (
    <main className="main">
      <MyProfile />
    </main>
  );
}
