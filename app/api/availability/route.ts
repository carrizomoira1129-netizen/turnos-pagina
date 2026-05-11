import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Date required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("appointment_time")
    .eq("appointment_date", date)
    .neq("status", "cancelled");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const booked = data?.map((a) => a.appointment_time.slice(0, 5)) || [];

  return NextResponse.json({ booked });
}
