import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// GET /api/public/business?slug=xxx
// Returns business branding + services + professionals (no auth required)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug requerido" }, { status: 400 });

  const db = createAdminClient();

  const { data: biz, error } = await db
    .from("businesses")
    .select("id,slug,name,niche,description,phone,address,logo_url,primary_color,secondary_color,social_links,plan,plan_status")
    .eq("slug", slug)
    .eq("plan_status", "active")
    .single();

  if (error || !biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const [{ data: services }, { data: professionals }, { data: cfg }] = await Promise.all([
    db.from("services").select("id,name,description,duration_minutes,price")
      .eq("business_id", biz.id).eq("is_active", true).order("price"),
    db.from("professionals").select("id,name,specialty,photo_url")
      .eq("business_id", biz.id).eq("is_active", true).order("created_at"),
    db.from("business_config").select("working_days,working_hours_start,working_hours_end")
      .eq("business_id", biz.id).maybeSingle(),
  ]);

  return NextResponse.json({ business: biz, services: services ?? [], professionals: professionals ?? [], config: cfg });
}
