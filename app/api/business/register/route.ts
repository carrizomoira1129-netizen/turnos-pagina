import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { Plan } from "@/lib/plans";

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { businessName, niche, email, password, phone, address, plan = "basic" } = body;

  if (!businessName || !email || !password) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const db = createAdminClient();

  // 1) Generate unique slug
  const base = slugify(businessName) || "negocio";
  let slug = base; let n = 0;
  while (true) {
    const { data: existing } = await db.from("businesses").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    n++; slug = `${base}-${n}`;
    if (n > 50) return NextResponse.json({ error: "No se pudo generar slug" }, { status: 500 });
  }

  // 2) Create the auth user (auto-confirmed for SaaS onboarding UX)
  const { data: created, error: signErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: businessName },
  });
  if (signErr || !created.user) {
    return NextResponse.json({ error: signErr?.message ?? "No se pudo crear el usuario" }, { status: 400 });
  }
  const userId = created.user.id;

  // 3) Create business row
  const { data: biz, error: bizErr } = await db
    .from("businesses")
    .insert({
      slug,
      name: businessName,
      niche: niche ?? null,
      email,
      phone: phone ?? null,
      address: address ?? null,
      plan: (["basic","pro","premium"].includes(plan) ? plan : "basic") as Plan,
    })
    .select()
    .single();

  if (bizErr || !biz) {
    await db.auth.admin.deleteUser(userId).catch(() => {});
    return NextResponse.json({ error: bizErr?.message ?? "No se pudo crear el negocio" }, { status: 500 });
  }

  // 4) Link profile (the trigger creates the profile; we update it)
  await db.from("profiles").upsert({
    id: userId,
    full_name: businessName,
    role: "admin",
    business_id: biz.id,
  });

  // 5) Seed business_config + notification_settings + default professional
  await Promise.all([
    db.from("business_config").insert({
      business_id: biz.id,
      name: businessName,
      phone: phone ?? null,
      email,
      address: address ?? null,
    }),
    db.from("notification_settings").insert({
      business_id: biz.id,
      confirmation_enabled: true,
      reminder_24h_enabled: true,
      reminder_1h_enabled: true,
      email_backup_enabled: true,
    } as Record<string, unknown>),
    db.from("professionals").insert({
      business_id: biz.id,
      name: businessName,
      specialty: niche ?? "General",
      is_active: true,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    slug: biz.slug,
    businessId: biz.id,
    publicUrl: `/negocio/${biz.slug}`,
  }, { status: 201 });
}
