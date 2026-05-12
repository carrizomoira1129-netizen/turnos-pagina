import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();

  const { data, error } = await db
    .from("appointments")
    .select(`
      id, appointment_date, guest_name, guest_email, guest_phone, client_id, status,
      profiles (full_name, phone)
    `)
    .order("appointment_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate by email (guest or auth)
  const map = new Map<string, {
    name:  string; email: string; phone: string;
    total: number; lastDate: string;
  }>();

  for (const a of (data ?? [])) {
    const appt = a as Record<string, unknown>;
    const email = (appt.guest_email as string) ?? `uid:${appt.client_id}`;
    const name  = (appt.guest_name  as string)
      || ((appt.profiles as Record<string,string> | null)?.full_name)
      || "—";
    const phone = (appt.guest_phone as string)
      || ((appt.profiles as Record<string,string> | null)?.phone)
      || "—";
    const date  = appt.appointment_date as string;

    if (!map.has(email)) {
      map.set(email, { name, email: email.startsWith("uid:") ? "—" : email, phone, total: 0, lastDate: date });
    }
    const entry = map.get(email)!;
    entry.total++;
    if (date > entry.lastDate) entry.lastDate = date;
  }

  const clients = Array.from(map.values())
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({ clients });
}
