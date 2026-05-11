import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const supabase = await createClient();

  // Return booked slots for a specific date
  if (date) {
    const { data, error } = await supabase.rpc("get_booked_slots", {
      booking_date: date,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ booked: data ?? [] });
  }

  // Return fully booked dates for a month
  if (year && month) {
    const { data, error } = await supabase.rpc("get_fully_booked_dates", {
      year: parseInt(year),
      month: parseInt(month),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ fullyBooked: data ?? [] });
  }

  return NextResponse.json({ error: "Parámetro requerido: date o year+month" }, { status: 400 });
}
