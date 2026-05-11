import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("appointment_date")
    .neq("status", "cancelled");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dates = [...new Set(data?.map((a) => a.appointment_date) || [])];

  return NextResponse.json({ dates });
}
