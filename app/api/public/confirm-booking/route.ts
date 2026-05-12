import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAppointment } from "@/lib/notifications";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: Request) {
  const {
    slug,
    paymentIntentId,
    serviceId,
    professionalId,
    date,
    time,
    guestName,
    guestEmail,
    guestPhone,
    amount,
  } = await request.json();

  if (!slug || !paymentIntentId || !serviceId || !professionalId || !date || !time) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
  }

  const db = createAdminClient();

  // Resolve business by slug
  const { data: biz } = await db
    .from("businesses")
    .select("id, name, plan, plan_status")
    .eq("slug", slug)
    .single();
  if (!biz || biz.plan_status !== "active") {
    return NextResponse.json({ error: "Negocio no disponible" }, { status: 404 });
  }

  // Verify payment with Stripe before creating the appointment
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch {
    return NextResponse.json({ error: "No se pudo verificar el pago" }, { status: 400 });
  }

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: `El pago no fue aprobado (estado: ${paymentIntent.status})` },
      { status: 402 }
    );
  }

  const { data, error } = await db.rpc("create_guest_appointment", {
    p_business_id:       biz.id,
    p_service_id:        serviceId,
    p_professional_id:   professionalId,
    p_date:              date,
    p_time:              time,
    p_guest_name:        guestName,
    p_guest_email:       guestEmail,
    p_guest_phone:       guestPhone,
    p_payment_intent_id: paymentIntentId,
    p_payment_amount:    amount,
  });

  if (error) {
    try { await stripe.paymentIntents.cancel(paymentIntentId); } catch {}
    const status = error.message.includes("ya está reservado") ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  const appointmentId = data as string;

  // Fire confirmation (best-effort)
  try {
    const [{ data: settings }, { data: svc }, { data: pro }] = await Promise.all([
      db.from("notification_settings").select("confirmation_enabled").eq("business_id", biz.id).maybeSingle(),
      db.from("services").select("name").eq("id", serviceId).single(),
      db.from("professionals").select("name").eq("id", professionalId).single(),
    ]);

    if (settings?.confirmation_enabled !== false && biz.plan !== "basic") {
      const result = await notifyAppointment({
        appointmentId,
        businessId: biz.id,
        type: "confirmation",
        phone: guestPhone ?? null,
        email: guestEmail ?? null,
        ctx: {
          name: guestName ?? "Cliente",
          date,
          time: String(time).slice(0, 5),
          professional: pro?.name ?? "tu profesional",
          service: svc?.name ?? "Tu servicio",
          businessName: biz.name,
        },
      });
      if (result.sent) {
        await db.from("appointments")
          .update({ confirmation_sent: true })
          .eq("id", appointmentId);
      }
    }
  } catch (e) {
    console.error("[confirm-booking] notification error:", e);
  }

  const confirmationCode = appointmentId.split("-")[0].toUpperCase();
  return NextResponse.json({ id: appointmentId, confirmationCode }, { status: 201 });
}
