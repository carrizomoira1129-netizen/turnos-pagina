"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CreditCard, TrendingUp, Loader2, RotateCcw,
  CheckCircle, Hash, Filter, CalendarDays,
} from "lucide-react";

interface Payment {
  id: string; appointment_date: string; time: string;
  payment_amount: number; payment_status: "paid" | "refunded";
  stripe_payment_intent_id: string;
  clientName: string; guest_email: string;
  serviceName: string; professionalName: string;
  created_at: string; status: string;
}

function fmt(n: number) { return `$${(n ?? 0).toLocaleString("es-AR")}`; }

export default function AdminPagosPage() {
  const [payments,   setPayments]   = useState<Payment[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [from,       setFrom]       = useState("");
  const [to,         setTo]         = useState("");
  const [refunding,  setRefunding]  = useState<string | null>(null);
  const [refundErr,  setRefundErr]  = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to)   params.set("to",   to);
    const r = await fetch(`/api/admin/payments?${params}`);
    const d = await r.json();
    setPayments(d.payments ?? []);
    setTotal(d.total ?? 0);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const handleRefund = async (p: Payment) => {
    if (!p.stripe_payment_intent_id) {
      setRefundErr("Este pago no tiene ID de Stripe — reembolso manual requerido.");
      return;
    }
    if (!confirm(`¿Reembolsar ${fmt(p.payment_amount)} a ${p.clientName}?`)) return;
    setRefunding(p.id);
    setRefundErr("");
    try {
      const r = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: p.id, paymentIntentId: p.stripe_payment_intent_id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPayments((prev) => prev.map((x) => x.id === p.id ? { ...x, payment_status: "refunded" } : x));
    } catch (e) {
      setRefundErr(e instanceof Error ? e.message : "Error al reembolsar");
    } finally {
      setRefunding(null);
    }
  };

  const paid     = payments.filter((p) => p.payment_status === "paid").length;
  const refunded = payments.filter((p) => p.payment_status === "refunded").length;

  return (
    <div className="pt-14 md:pt-0 p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pagos</h1>
        <p className="text-white/40 text-sm mt-1">Historial de cobros procesados a través de Stripe</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total filtrado", value: fmt(total),      Icon: TrendingUp, gold: true  },
          { label: "Pagos exitosos",  value: String(paid),   Icon: CheckCircle, gold: false },
          { label: "Reembolsados",    value: String(refunded),Icon: RotateCcw,  gold: false },
        ].map(({ label, value, Icon, gold }) => (
          <div key={label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/40 text-xs">{label}</p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${gold ? "bg-[#e4c69a]/10" : "bg-white/5"}`}>
                <Icon className={`w-3.5 h-3.5 ${gold ? "text-[#e4c69a]" : "text-white/40"}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${gold ? "text-[#e4c69a]" : "text-white"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Date filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-white/30" />
        <div className="flex items-center gap-2">
          <label className="text-white/40 text-xs">Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#e4c69a]/40 transition-all [color-scheme:dark]" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-white/40 text-xs">Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#e4c69a]/40 transition-all [color-scheme:dark]" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(""); setTo(""); }}
            className="text-xs text-white/30 hover:text-white transition-colors">
            Limpiar filtros
          </button>
        )}
      </div>

      {refundErr && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {refundErr}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CreditCard className="w-12 h-12 text-white/10 mb-4" />
          <p className="text-white/40">Sin pagos{(from || to) ? " en ese período" : ""}</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {payments.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center gap-4 flex-wrap hover:bg-white/[0.02] transition-all">
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium text-sm">{p.clientName}</p>
                    {p.guest_email && <p className="text-white/30 text-xs">{p.guest_email}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white/40 text-xs">{p.serviceName}</span>
                    <span className="flex items-center gap-1 text-white/30 text-xs">
                      <CalendarDays className="w-3 h-3" />
                      <span className="capitalize">
                        {p.appointment_date ? format(parseISO(p.appointment_date), "d MMM yyyy", { locale: es }) : "—"}
                      </span>
                      · {p.time} hs
                    </span>
                    <span className="flex items-center gap-1 text-white/20 text-xs font-mono">
                      <Hash className="w-3 h-3" />
                      {p.id?.split("-")[0].toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Amount + status */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="text-xl font-bold text-[#e4c69a]">{fmt(p.payment_amount)}</p>
                  {p.payment_status === "paid" ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-green-500/10 border-green-500/20 text-green-400">
                      <CheckCircle className="w-3 h-3" /> Pagado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-yellow-500/10 border-yellow-500/20 text-yellow-400">
                      <RotateCcw className="w-3 h-3" /> Reembolsado
                    </span>
                  )}
                  {p.payment_status === "paid" && (
                    <button
                      onClick={() => handleRefund(p)}
                      disabled={refunding === p.id}
                      className="flex items-center gap-1.5 text-xs text-white/25 hover:text-yellow-400 transition-colors disabled:opacity-40"
                    >
                      {refunding === p.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RotateCcw className="w-3.5 h-3.5" />}
                      Reembolsar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
