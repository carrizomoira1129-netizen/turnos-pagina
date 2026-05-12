import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles").select("business_id, is_super_admin").eq("id", user.id).single();

  let slug: string | undefined;
  if (profile?.business_id) {
    const { data: biz } = await db
      .from("businesses").select("slug").eq("id", profile.business_id).single();
    slug = biz?.slug;
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      <AdminSidebar userEmail={user.email} businessSlug={slug} isSuperAdmin={!!profile?.is_super_admin} />
      <main className="flex-1 ml-0 md:ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}
