import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
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

  // Return short confirmation code (first 8 chars of UUID)
  const confirmationCode = (data as string).split("-")[0].toUpperCase();
  return NextResponse.json({ id: data, confirmationCode }, { status: 201 });
}
