import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessContext } from "@/lib/auth/business";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getBusinessContext();
  if (!ctx?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("notification_logs")
    .select("id, appointment_id, type, channel, status, recipient, message, error, created_at")
    .eq("business_id", ctx.businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
