import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessContext } from "@/lib/auth/business";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const ctx = await getBusinessContext();
  if (!ctx?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  const db = createAdminClient();

  let query = db
    .from("appointments")
    .select(`
      id, appointment_date, appointment_time, payment_amount,
      payment_status, stripe_payment_intent_id,
      guest_name, guest_email, created_at, status,
      services (name),
      professionals (name),
      profiles (full_name)
    `)
    .eq("business_id", ctx.businessId)
    .in("payment_status", ["paid", "refunded"])
    .order("created_at", { ascending: false });

  if (from) query = query.gte("appointment_date", from);
  if (to)   query = query.lte("appointment_date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type PaymentRow = Record<string, unknown> & {
    payment_status: string; payment_amount: number;
  };

  const payments = (data ?? []).map((a: Record<string, unknown>): PaymentRow => ({
    ...a,
    clientName: (a.guest_name as string)
      || ((a.profiles as Record<string,string> | null)?.full_name)
      || "—",
    serviceName:      (a.services as Record<string,string> | null)?.name ?? "—",
    professionalName: (a.professionals as Record<string,string> | null)?.name ?? "—",
    time: String(a.appointment_time).slice(0, 5),
    payment_status: String(a.payment_status ?? ""),
    payment_amount: Number(a.payment_amount ?? 0),
  }));

  const total = payments
    .filter((p) => p.payment_status === "paid")
    .reduce((s, p) => s + (p.payment_amount ?? 0), 0);

  return NextResponse.json({ payments, total });
}
