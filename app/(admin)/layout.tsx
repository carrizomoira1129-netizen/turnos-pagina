import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      <AdminSidebar userEmail={user.email} />
      <main className="flex-1 ml-0 md:ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}
