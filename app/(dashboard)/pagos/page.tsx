"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  TrendingUp,
  CreditCard,
  Loader2,
  CalendarDays,
  User,
  Briefcase,
  RotateCcw,
  CheckCircle,
  Hash,
} from "lucide-react";

interface Payment {
  id:                       string;
  appointment_date:         string;
  appointment_time:         string;
  payment_amount:           number;
  payment_status:           "paid" | "refunded";
  stripe_payment_intent_id: string;
  guest_name:               string;
  guest_email:              string;
  service_name:             string;
  professional_name:        string;
  created_at:               string;
}

const STATUS_CONFIG = {
  paid:     { label: "Pagado",       color: "text-green-400",     bg: "bg-green-400/10  border-green-400/20",    Icon: CheckCircle },
  refunded: { label: "Reembolsado",  color: "text-yellow-400",    bg: "bg-yellow-400/10 border-yellow-400/20",   Icon: RotateCcw   },
};

function formatPrice(n: number) {
  return `$${(n ?? 0).toLocaleString("es-AR")}`;
}

export default function PagosPage() {
  const [payments,     setPayments]     = useState<Payment[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPayments(d.payments  ?? []);
        setMonthlyTotal(d.monthlyTotal ?? 0);
      })
      .catch((e) => setError(e.message ?? "Error al cargar pagos"))
      .finally(() => setLoading(false));
  }, []);

  const currentMonthName = format(new Date(), "MMMM yyyy", { locale: es });
  const totalRevenue     = payments
    .filter((p) => p.payment_status === "paid")
    .reduce((s, p) => s + (p.payment_amount ?? 0), 0);
  const refunded = payments.filter((p) => p.payment_status === "refunded").length;

  return (
    <div className="pt-14 md:pt-0 min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Pagos recibidos</h1>
        <p className="text-white/40 text-sm mt-1">
          Historial de cobros procesados a través de Stripe
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <CreditCard className="w-10 h-10 text-white/10" />
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-white/30 text-xs max-w-xs">
            Verificá que el SQL de <code>stripe_payments.sql</code> fue ejecutado en Supabase.
          </p>
        </div>
      ) : (
        <div className="max-w-4xl space-y-6">
          {/* ── KPI cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Monthly income */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs font-medium capitalize">
                  Ingresos — {currentMonthName}
                </p>
                <div className="w-8 h-8 rounded-lg bg-[#e4c69a]/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#e4c69a]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#e4c69a]">{formatPrice(monthlyTotal)}</p>
              <p className="text-white/30 text-xs mt-1">mes actual</p>
            </div>

            {/* Total all time */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs font-medium">Total acumulado</p>
                <div className="w-8 h-8 rounded-lg bg-[#e4c69a]/10 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#e4c69a]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{formatPrice(totalRevenue)}</p>
              <p className="text-white/30 text-xs mt-1">{payments.filter((p) => p.payment_status === "paid").length} pagos</p>
            </div>

            {/* Refunds */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs font-medium">Reembolsos</p>
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-yellow-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{refunded}</p>
              <p className="text-white/30 text-xs mt-1">total histórico</p>
            </div>
          </div>

          {/* ── Payments list ── */}
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CreditCard className="w-12 h-12 text-white/10 mb-4" />
              <h3 className="text-white/40 font-medium mb-1">Sin pagos registrados</h3>
              <p className="text-white/20 text-sm">
                Los pagos aparecerán aquí una vez que se procesen reservas en{" "}
                <span className="text-[#e4c69a]">/reservar</span>
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4">
                Todos los pagos ({payments.length})
              </h2>

              <div className="space-y-3">
                {payments.map((p) => {
                  const statusCfg = STATUS_CONFIG[p.payment_status] ?? STATUS_CONFIG.paid;
                  const StatusIcon = statusCfg.Icon;
                  const shortId = p.id?.split("-")[0].toUpperCase() ?? "—";

                  return (
                    <div
                      key={p.id}
                      className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-2 flex-1 min-w-0">
                          {/* Service + professional */}
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 text-sm text-white font-medium">
                              <Briefcase className="w-3.5 h-3.5 text-[#e4c69a]" />
                              {p.service_name ?? "—"}
                            </div>
                            {p.professional_name && (
                              <div className="flex items-center gap-1.5 text-xs text-white/40">
                                <User className="w-3 h-3" />
                                {p.professional_name}
                              </div>
                            )}
                          </div>

                          {/* Client */}
                          <div className="flex items-center gap-1.5 text-xs text-white/40">
                            <User className="w-3 h-3" />
                            <span className="font-medium text-white/60">{p.guest_name ?? "—"}</span>
                            {p.guest_email && <span>· {p.guest_email}</span>}
                          </div>

                          {/* Date + confirmation */}
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-white/40">
                              <CalendarDays className="w-3 h-3" />
                              <span className="capitalize">
                                {p.appointment_date
                                  ? format(parseISO(p.appointment_date), "d 'de' MMMM, yyyy", { locale: es })
                                  : "—"}
                              </span>
                              <span>· {p.appointment_time ?? "—"} hs</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-white/20 font-mono">
                              <Hash className="w-3 h-3" />
                              {shortId}
                            </div>
                          </div>
                        </div>

                        {/* Amount + status */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <p className="text-xl font-bold text-[#e4c69a]">
                            {formatPrice(p.payment_amount)}
                          </p>
                          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                          {p.stripe_payment_intent_id && (
                            <span className="text-white/15 text-xs font-mono truncate max-w-[100px]">
                              {p.stripe_payment_intent_id.slice(-8)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stripe dashboard link */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-white/20 flex-shrink-0" />
            <p className="text-white/30 text-xs">
              Para ver detalles completos, reembolsos y disputas visitá el{" "}
              <span className="text-[#e4c69a]/60">Dashboard de Stripe</span>
              {" → "}dashboard.stripe.com
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
