import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(request: Request) {
  const { amount, serviceName, guestEmail, guestName } = await request.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      // ARS uses centavos: $3000 ARS = 300000 centavos
      amount: Math.round(amount * 100),
      currency: "ars",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        serviceName: serviceName ?? "",
        guestEmail:  guestEmail  ?? "",
        guestName:   guestName   ?? "",
      },
    });

    return NextResponse.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear el pago";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
