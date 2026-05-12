import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles").select("is_super_admin").eq("id", user.id).single();
  if (!profile?.is_super_admin) redirect("/admin");

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {children}
    </div>
  );
}
