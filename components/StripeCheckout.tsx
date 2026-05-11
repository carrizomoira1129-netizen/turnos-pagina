"use client";

import { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  User,
  Briefcase,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CreditCard,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Professional {
  id: string;
  name: string;
  specialty: string;
}

interface StripeCheckoutProps {
  service:    Service;
  date:       Date;
  time:       string;
  guestName:  string;
  guestEmail: string;
  guestPhone: string;
  onSuccess:  (confirmationCode: string) => void;
  onBack:     () => void;
}

// ─── Stripe element shared style ──────────────────────────────────────────────
const CARD_STYLE = {
  style: {
    base: {
      color:          "#ffffff",
      fontFamily:     '"Inter", system-ui, sans-serif',
      fontSize:       "14px",
      fontSmoothing:  "antialiased",
      "::placeholder": { color: "rgba(255,255,255,0.2)" },
    },
    invalid: { color: "#f87171", iconColor: "#f87171" },
  },
};

function formatPrice(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

// ─── Inner form (needs stripe/elements context) ───────────────────────────────
function CardForm({
  clientSecret,
  service,
  date,
  time,
  professional,
  guestName,
  guestEmail,
  guestPhone,
  onSuccess,
}: {
  clientSecret: string;
  professional: Professional;
  service:      Service;
  date:         Date;
  time:         string;
  guestName:    string;
  guestEmail:   string;
  guestPhone:   string;
  onSuccess:    (code: string) => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();

  const [cardholderName, setCardholderName] = useState("");
  const [paying,         setPaying]         = useState(false);
  const [payError,       setPayError]       = useState("");

  const handlePay = async () => {
    if (!stripe || !elements || !cardholderName.trim()) return;
    setPaying(true);
    setPayError("");

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) { setPaying(false); return; }

    // 1 — Process card payment
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card:             cardNumber,
          billing_details:  { name: cardholderName, email: guestEmail },
        },
      }
    );

    if (stripeError) {
      setPayError(stripeError.message ?? "Error al procesar el pago.");
      setPaying(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      setPayError("El pago no fue aprobado. Verificá los datos de tu tarjeta.");
      setPaying(false);
      return;
    }

    // 2 — Confirm booking in DB
    try {
      const res = await fetch("/api/public/confirm-booking", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          paymentIntentId: paymentIntent.id,
          serviceId:       service.id,
          professionalId:  professional.id,
          date:            format(date, "yyyy-MM-dd"),
          time,
          guestName,
          guestEmail,
          guestPhone,
          amount:          service.price,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al confirmar el turno");

      onSuccess(data.confirmationCode);
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Pago aprobado pero error al guardar el turno. Contactate con nosotros."
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Cardholder name */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5 font-medium">
          Nombre en la tarjeta
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="JUAN PÉREZ"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#e4c69a]/50 focus:ring-1 focus:ring-[#e4c69a]/10 transition-all uppercase"
        />
      </div>

      {/* Card number */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5 font-medium">
          Número de tarjeta
        </label>
        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#e4c69a]/50 focus-within:ring-1 focus-within:ring-[#e4c69a]/10 transition-all gap-3">
          <CreditCard className="w-4 h-4 text-white/20 flex-shrink-0" />
          <div className="flex-1">
            <CardNumberElement options={CARD_STYLE} />
          </div>
        </div>
      </div>

      {/* Expiry + CVC */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1.5 font-medium">
            Vencimiento
          </label>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#e4c69a]/50 focus-within:ring-1 focus-within:ring-[#e4c69a]/10 transition-all">
            <CardExpiryElement options={CARD_STYLE} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5 font-medium">
            CVC
          </label>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#e4c69a]/50 focus-within:ring-1 focus-within:ring-[#e4c69a]/10 transition-all">
            <CardCvcElement options={CARD_STYLE} />
          </div>
        </div>
      </div>

      {/* Error */}
      {payError && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {payError}
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={paying || !stripe || !cardholderName.trim()}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
          !paying && stripe && cardholderName.trim()
            ? "bg-gradient-to-r from-[#e4c69a] to-[#c9a96e] text-[#0D0D0D] hover:shadow-lg hover:shadow-[#e4c69a]/25 hover:scale-[1.01] active:scale-[0.99]"
            : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
        }`}
      >
        {paying ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Procesando pago...
          </>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5" />
            Pagar {formatPrice(service.price)} y Confirmar
          </>
        )}
      </button>

      {/* Stripe trust badge */}
      <div className="flex items-center justify-center gap-2 text-white/20 text-xs">
        <ShieldCheck className="w-3.5 h-3.5" />
        Pago seguro procesado por Stripe · Encriptación SSL 256-bit
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://cdn.brandfetch.io/idxAg10C0L/theme/dark/logo.svg"
          alt="Stripe"
          className="h-4 opacity-30"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
    </div>
  );
}

// ─── Outer shell: loads Stripe + PaymentIntent, then renders ─────────────────
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function StripeCheckout({
  service,
  date,
  time,
  guestName,
  guestEmail,
  guestPhone,
  onSuccess,
  onBack,
}: StripeCheckoutProps) {
  const [clientSecret,  setClientSecret]  = useState("");
  const [professional,  setProfessional]  = useState<Professional | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [initError,     setInitError]     = useState("");
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    Promise.all([
      fetch("/api/professionals").then((r) => r.json()),
      fetch("/api/public/create-payment-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          amount:      service.price,
          serviceName: service.name,
          guestEmail,
          guestName,
        }),
      }).then((r) => r.json()),
    ])
      .then(([profData, piData]) => {
        if (piData.error) throw new Error(piData.error);
        setProfessional(profData.professionals?.[0] ?? null);
        setClientSecret(piData.clientSecret);
      })
      .catch((err) => setInitError(err.message ?? "Error al inicializar el pago"))
      .finally(() => setLoading(false));
  }, [service, guestEmail, guestName]);

  const displayDate = format(date, "EEEE d 'de' MMMM, yyyy", { locale: es });

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#e4c69a]/30 border-t-[#e4c69a] animate-spin" />
        <p className="text-white/40 text-sm">Preparando el pago...</p>
      </div>
    );
  }

  // ── Init error ──
  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-red-400">{initError}</p>
        <button onClick={onBack} className="text-sm text-white/40 hover:text-white transition-colors">
          ← Volver
        </button>
      </div>
    );
  }

  // ── Stripe not configured ──
  if (!stripePromise || !clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-yellow-400" />
        <p className="text-white/60 text-sm max-w-xs">
          Stripe no está configurado. Agregá{" "}
          <code className="text-[#e4c69a]">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> y{" "}
          <code className="text-[#e4c69a]">STRIPE_SECRET_KEY</code> en tu{" "}
          <code className="text-[#e4c69a]">.env.local</code>.
        </p>
        <button onClick={onBack} className="text-sm text-white/40 hover:text-white transition-colors">
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Modificar datos
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── LEFT: Booking summary ── */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col gap-5 h-fit">
          <h3 className="text-white font-semibold">Resumen del turno</h3>

          {/* Service */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/20 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-4 h-4 text-[#e4c69a]" />
            </div>
            <div>
              <p className="text-white/40 text-xs">Servicio</p>
              <p className="text-white font-medium text-sm">{service.name}</p>
              <p className="text-white/30 text-xs">{service.duration_minutes} min</p>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Professional */}
          {professional && (
            <>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#e4c69a]" />
                </div>
                <div>
                  <p className="text-white/40 text-xs">Profesional</p>
                  <p className="text-white font-medium text-sm">{professional.name}</p>
                  <p className="text-white/30 text-xs">{professional.specialty}</p>
                </div>
              </div>
              <div className="h-px bg-white/5" />
            </>
          )}

          {/* Date */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/20 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-4 h-4 text-[#e4c69a]" />
            </div>
            <div>
              <p className="text-white/40 text-xs">Fecha y hora</p>
              <p className="text-white font-medium text-sm capitalize">{displayDate}</p>
              <p className="text-[#e4c69a] text-xs font-semibold">{time} hs</p>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Client */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[#e4c69a]" />
            </div>
            <div>
              <p className="text-white/40 text-xs">Paciente / Cliente</p>
              <p className="text-white font-medium text-sm">{guestName}</p>
              <p className="text-white/30 text-xs">{guestEmail}</p>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Total price */}
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm">Total a pagar</span>
            <span className="text-3xl font-bold text-[#e4c69a]">
              {formatPrice(service.price)}
            </span>
          </div>
        </div>

        {/* ── RIGHT: Payment form ── */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-4 h-4 text-[#e4c69a]" />
            <h3 className="text-white font-semibold">Datos de pago</h3>
          </div>

          {/* Test mode notice */}
          <div className="mb-5 px-3 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Modo prueba activo — usá la tarjeta{" "}
              <strong>4242 4242 4242 4242</strong>, cualquier fecha futura y CVC.
            </span>
          </div>

          <Elements stripe={stripePromise}>
            <CardForm
              clientSecret={clientSecret}
              service={service}
              date={date}
              time={time}
              professional={professional!}
              guestName={guestName}
              guestEmail={guestEmail}
              guestPhone={guestPhone}
              onSuccess={onSuccess}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}
