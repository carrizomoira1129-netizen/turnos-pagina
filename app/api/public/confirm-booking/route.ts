import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAppointment } from "@/lib/notifications";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: Request) {
  const {
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

  if (!paymentIntentId || !serviceId || !professionalId || !date || !time) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
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

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_guest_appointment", {
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
    // If booking failed after payment, attempt to cancel the PaymentIntent
    try {
      await stripe.paymentIntents.cancel(paymentIntentId);
    } catch {}
    const status = error.message.includes("ya está reservado") ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  const appointmentId = data as string;

  // Fire WhatsApp confirmation (best-effort, non-blocking on errors)
  try {
    const admin = createAdminClient();
    const [{ data: settings }, { data: svc }, { data: pro }, { data: biz }] = await Promise.all([
      admin.from("notification_settings").select("confirmation_enabled").eq("id", 1).single(),
      admin.from("services").select("name").eq("id", serviceId).single(),
      admin.from("professionals").select("name").eq("id", professionalId).single(),
      admin.from("business_config").select("name").limit(1).single(),
    ]);

    if (settings?.confirmation_enabled !== false) {
      const result = await notifyAppointment({
        appointmentId,
        type: "confirmation",
        phone: guestPhone ?? null,
        email: guestEmail ?? null,
        ctx: {
          name: guestName ?? "Cliente",
          date,
          time: String(time).slice(0, 5),
          professional: pro?.name ?? "tu profesional",
          service: svc?.name ?? "Tu servicio",
          businessName: biz?.name,
        },
      });
      if (result.sent) {
        await admin.from("appointments")
          .update({ confirmation_sent: true })
          .eq("id", appointmentId);
      }
    }
  } catch (e) {
    console.error("[confirm-booking] notification error:", e);
  }

  // Return short confirmation code (first 8 chars of UUID)
  const confirmationCode = appointmentId.split("-")[0].toUpperCase();
  return NextResponse.json({ id: appointmentId, confirmationCode }, { status: 201 });
}
