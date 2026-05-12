import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessContext } from "@/lib/auth/business";
import { NextResponse } from "next/server";
import {
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  format,
} from "date-fns";

export async function GET() {
  const ctx = await getBusinessContext();
  if (!ctx?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db  = createAdminClient();
  const now = new Date();

  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd   = format(endOfMonth(now),   "yyyy-MM-dd");
  const weekStart  = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd    = format(endOfWeek(now,   { weekStartsOn: 1 }), "yyyy-MM-dd");
  const today      = format(now, "yyyy-MM-dd");
  const bid = ctx.businessId;

  const [{ data: paid }, { data: weekly }, { data: completed }, { data: nonCancelled }] =
    await Promise.all([
      db.from("appointments").select("payment_amount")
        .eq("business_id", bid).eq("payment_status", "paid")
        .gte("appointment_date", monthStart).lte("appointment_date", monthEnd),

      db.from("appointments").select("id")
        .eq("business_id", bid).neq("status", "cancelled")
        .gte("appointment_date", weekStart).lte("appointment_date", weekEnd),

      db.from("appointments").select("id")
        .eq("business_id", bid).eq("status", "completed")
        .lte("appointment_date", today),

      db.from("appointments").select("id")
        .eq("business_id", bid).in("status", ["completed", "confirmed", "pending"])
        .lte("appointment_date", today),
    ]);

  const monthlyIncome      = (paid ?? []).reduce((s, r) => s + (r.payment_amount ?? 0), 0);
  const weeklyAppointments = (weekly ?? []).length;
  const attendanceRate     = (nonCancelled ?? []).length === 0 ? 100
    : Math.round(((completed ?? []).length / (nonCancelled ?? []).length) * 100);

  return NextResponse.json({ monthlyIncome, weeklyAppointments, attendanceRate });
}
