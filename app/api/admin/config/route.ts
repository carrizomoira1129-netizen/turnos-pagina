import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessContext } from "@/lib/auth/business";
import { NextResponse } from "next/server";

export async function GET() {
  const ctx = await getBusinessContext();
  if (!ctx?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("business_config")
    .select("*")
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data });
}

export async function PATCH(request: Request) {
  const ctx = await getBusinessContext();
  if (!ctx?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const db   = createAdminClient();

  const { data: existing } = await db
    .from("business_config").select("id")
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  let result;
  if (existing) {
    result = await db.from("business_config")
      .update(body).eq("id", existing.id).eq("business_id", ctx.businessId)
      .select().single();
  } else {
    result = await db.from("business_config")
      .insert({ ...body, business_id: ctx.businessId })
      .select().single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ config: result.data });
}
