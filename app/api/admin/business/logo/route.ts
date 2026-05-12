import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessContext } from "@/lib/auth/business";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const ctx = await getBusinessContext();
  if (!ctx?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Máximo 2MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `logos/${ctx.businessId}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const db = createAdminClient();
  const { error: upErr } = await db.storage
    .from("business-assets")
    .upload(path, buf, { upsert: true, contentType: file.type });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = db.storage.from("business-assets").getPublicUrl(path);
  const logoUrl = `${pub.publicUrl}?v=${Date.now()}`;

  await db.from("businesses").update({ logo_url: logoUrl }).eq("id", ctx.businessId);

  return NextResponse.json({ logo_url: logoUrl });
}
