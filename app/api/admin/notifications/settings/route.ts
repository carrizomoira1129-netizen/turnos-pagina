import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessContext } from "@/lib/auth/business";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getBusinessContext();
  if (!ctx?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data } = await db
    .from("notification_settings")
    .select("*")
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (!data) {
    // Seed default if missing
    const { data: created } = await db
      .from("notification_settings")
      .insert({
        business_id: ctx.businessId,
        confirmation_enabled: true,
        reminder_24h_enabled: true,
        reminder_1h_enabled: true,
        email_backup_enabled: true,
      } as Record<string, unknown>)
      .select().single();
    return NextResponse.json(created);
  }
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const ctx = await getBusinessContext();
  if (!ctx?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowed = ["confirmation_enabled", "reminder_24h_enabled", "reminder_1h_enabled", "email_backup_enabled"];
  const patch: Record<string, boolean> = {};
  for (const k of allowed) {
    if (typeof body[k] === "boolean") patch[k] = body[k];
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("notification_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("business_id", ctx.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
