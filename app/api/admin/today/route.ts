import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format } from "date-fns";

export async function GET() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db    = createAdminClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data, error } = await db
    .from("appointments")
    .select(`
      id, appointment_time, status, guest_name, guest_email,
      services (name, price),
      professionals (name),
      profiles (full_name)
    `)
    .eq("appointment_date", today)
    .order("appointment_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appointments = (data ?? []).map((a: Record<string, unknown>) => ({
    id:           a.id,
    time:         String(a.appointment_time).slice(0, 5),
    clientName:   (a.guest_name as string) || ((a.profiles as Record<string,string> | null)?.full_name) || "Cliente",
    clientEmail:  a.guest_email as string,
    serviceName:  (a.services as Record<string,string> | null)?.name ?? "—",
    servicePrice: (a.services as Record<string,number> | null)?.price ?? 0,
    professional: (a.professionals as Record<string,string> | null)?.name ?? "—",
    status:       a.status as string,
  }));

  return NextResponse.json({ appointments });
}
