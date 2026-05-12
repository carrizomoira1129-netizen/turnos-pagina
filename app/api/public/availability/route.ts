import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// GET /api/public/availability?slug=xxx&date=YYYY-MM-DD
// GET /api/public/availability?slug=xxx&year=YYYY&month=MM
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug  = searchParams.get("slug");
  const date  = searchParams.get("date");
  const year  = searchParams.get("year");
  const month = searchParams.get("month");

  if (!slug) return NextResponse.json({ error: "slug requerido" }, { status: 400 });

  const db = createAdminClient();

  // Resolve business
  const { data: biz } = await db
    .from("businesses").select("id,plan_status").eq("slug", slug).single();
  if (!biz || biz.plan_status !== "active")
    return NextResponse.json({ error: "Negocio no disponible" }, { status: 404 });

  if (date) {
    const { data, error } = await db.rpc("get_booked_slots", {
      p_business_id: biz.id,
      p_date: date,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ booked: data ?? [] });
  }

  if (year && month) {
    const { data, error } = await db.rpc("get_fully_booked_dates", {
      p_business_id: biz.id,
      p_year:  parseInt(year),
      p_month: parseInt(month),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ fullyBooked: data ?? [] });
  }

  return NextResponse.json({ error: "Parámetro requerido: date o year+month" }, { status: 400 });
}
