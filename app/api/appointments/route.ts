import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id, appointment_date, appointment_time, status, notes,
      services (name, price, duration_minutes),
      professionals (name, specialty)
    `)
    .eq("client_id", user.id)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointments: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { serviceId, professionalId, date, time } = body;

  if (!serviceId || !professionalId || !date || !time) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  // Check if slot is already booked
  const { data: existing } = await supabase
    .from("appointments")
    .select("id")
    .eq("appointment_date", date)
    .eq("appointment_time", time)
    .eq("professional_id", professionalId)
    .neq("status", "cancelled")
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Este horario ya no está disponible." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      client_id: user.id,
      service_id: serviceId,
      professional_id: professionalId,
      appointment_date: date,
      appointment_time: time,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointment: data }, { status: 201 });
}
