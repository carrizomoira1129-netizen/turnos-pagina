import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Free booking (plan básico, sin pago)
export async function POST(request: Request) {
  const body = await request.json();
  const { slug, serviceId, professionalId, date, time, guestName, guestEmail, guestPhone } = body;

  if (!slug || !serviceId || !date || !time || !guestName || !guestEmail) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: biz } = await db
    .from("businesses").select("id,plan,plan_status").eq("slug", slug).single();
  if (!biz || biz.plan_status !== "active")
    return NextResponse.json({ error: "Negocio no disponible" }, { status: 404 });

  const proId = professionalId ?? (
    await db.from("professionals").select("id").eq("business_id", biz.id).eq("is_active", true).limit(1).single()
  ).data?.id;

  const { data, error } = await db.rpc("create_guest_appointment", {
    p_business_id:       biz.id,
    p_service_id:        serviceId,
    p_professional_id:   proId ?? null,
    p_date:              date,
    p_time:              time,
    p_guest_name:        guestName,
    p_guest_email:       guestEmail,
    p_guest_phone:       guestPhone ?? "",
    p_payment_intent_id: "",
    p_payment_amount:    0,
  });

  if (error) {
    const status = error.message.includes("ya está reservado") ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  const confirmationCode = (data as string).split("-")[0].toUpperCase();
  return NextResponse.json({ id: data, confirmationCode }, { status: 201 });
}
