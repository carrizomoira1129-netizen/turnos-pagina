import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessContext } from "@/lib/auth/business";
import { NextResponse } from "next/server";
import { startOfWeek, endOfWeek, format, addWeeks } from "date-fns";

export async function GET(request: Request) {
  const ctx = await getBusinessContext();
  if (!ctx?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const base      = addWeeks(new Date(), offset);
  const weekStart = format(startOfWeek(base, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd   = format(endOfWeek(base,   { weekStartsOn: 1 }), "yyyy-MM-dd");

  const db = createAdminClient();

  const { data, error } = await db
    .from("appointments")
    .select(`
      id, appointment_date, appointment_time, status, guest_name,
      services (id, name, price),
      professionals (name),
      profiles (full_name)
    `)
    .eq("business_id", ctx.businessId)
    .neq("status", "cancelled")
    .gte("appointment_date", weekStart)
    .lte("appointment_date", weekEnd)
    .order("appointment_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ appointments: data ?? [], weekStart, weekEnd });
}
