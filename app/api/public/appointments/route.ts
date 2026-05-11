import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { serviceId, date, time, guestName, guestEmail, guestPhone } = body;

  if (!serviceId || !date || !time || !guestName || !guestEmail || !guestPhone) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(guestEmail)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_guest_appointment", {
    p_service_id:  serviceId,
    p_date:        date,
    p_time:        time,
    p_guest_name:  guestName,
    p_guest_email: guestEmail,
    p_guest_phone: guestPhone,
  });

  if (error) {
    const status = error.message.includes("ya está reservado") ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ id: data }, { status: 201 });
}
