import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessContext } from "@/lib/auth/business";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: Request) {
  const ctx = await getBusinessContext();
  if (!ctx?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointmentId, paymentIntentId } = await request.json();

  if (!appointmentId || !paymentIntentId) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: appt } = await db
    .from("appointments").select("business_id").eq("id", appointmentId).single();
  if (!appt || appt.business_id !== ctx.businessId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    await stripe.refunds.create({ payment_intent: paymentIntentId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error en Stripe";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error } = await db
    .from("appointments")
    .update({ payment_status: "refunded", status: "cancelled" })
    .eq("id", appointmentId)
    .eq("business_id", ctx.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
