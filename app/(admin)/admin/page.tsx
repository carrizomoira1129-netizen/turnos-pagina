"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  TrendingUp, CalendarDays, UserCheck, Loader2,
  CheckCircle2, Clock, XCircle, AlertCircle, BarChart3,
} from "lucide-react";

const ActivityChart = dynamic(() => import("@/components/admin/ActivityChart"), { ssr: false });

interface Stats  { monthlyIncome: number; weeklyAppointments: number; attendanceRate: number; }
interface Appt   {
  id: string; time: string; clientName: string; clientEmail: string;
  serviceName: string; servicePrice: number; professional: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
}
interface ChartD { month: string; count: number; }

const STATUS_BADGE = {
  confirmed: { label: "Confirmado", cls: "bg-green-500/15  border-green-500/30  text-green-400",  Icon: CheckCircle2 },
  pending:   { label: "Pendiente",  cls: "bg-yellow-500/15 border-yellow-500/30 text-yellow-400", Icon: Clock        },
  cancelled: { label: "Cancelado",  cls: "bg-red-500/15    border-red-500/30    text-red-400",    Icon: XCircle      },
  completed: { label: "Completado", cls: "bg-[#e4c69a]/15  border-[#e4c69a]/30 text-[#e4c69a]",  Icon: CheckCircle2 },
};

function formatPrice(n: number) { return `$${(n ?? 0).toLocaleString("es-AR")}`; }

export default function AdminDashboardPage() {
  const [stats,  setStats]  = useState<Stats | null>(null);
  const [today,  setToday]  = useState<Appt[]>([]);
  const [chart,  setChart]  = useState<ChartD[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    const [sRes, tRes, aRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/today"),
      fetch("/api/admin/activity"),
    ]);
    const [s, t, a] = await Promise.all([sRes.json(), tRes.json(), aRes.json()]);
    setStats(s);
    setToday(t.appointments ?? []);
    setChart(a.activity    ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setToday((prev) => prev.map((a) => a.id === id ? { ...a, status: status as Appt["status"] } : a));
    setUpdating(null);
  };

  const todayLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-14 md:pt-0 p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1 capitalize">{todayLabel}</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Ingresos del mes",
            value: formatPrice(stats?.monthlyIncome ?? 0),
            sub:   "pagos confirmados",
            Icon:  TrendingUp,
            gold:  true,
          },
          {
            label: "Turnos esta semana",
            value: String(stats?.weeklyAppointments ?? 0),
            sub:   "Lun – Dom",
            Icon:  CalendarDays,
            gold:  false,
          },
          {
            label: "Tasa de asistencia",
            value: `${stats?.attendanceRate ?? 0}%`,
            sub:   "completados / confirmados",
            Icon:  UserCheck,
            gold:  false,
          },
        ].map(({ label, value, sub, Icon, gold }) => (
          <div key={label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/40 text-xs font-medium">{label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${gold ? "bg-[#e4c69a]/10" : "bg-white/5"}`}>
                <Icon className={`w-4 h-4 ${gold ? "text-[#e4c69a]" : "text-white/40"}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${gold ? "text-[#e4c69a]" : "text-white"}`}>{value}</p>
            <p className="text-white/25 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Today's appointments ── */}
        <div className="lg:col-span-3 bg-white/[0.03] border border-white/10 rounded-2xl">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-white font-semibold">Turnos de hoy</h2>
            <span className="text-white/30 text-xs">{today.length} turnos</span>
          </div>

          {today.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="w-10 h-10 text-white/10 mb-3" />
              <p className="text-white/30 text-sm">No hay turnos para hoy</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {today.map((appt) => {
                const badge = STATUS_BADGE[appt.status] ?? STATUS_BADGE.pending;
                const BadgeIcon = badge.Icon;
                return (
                  <div key={appt.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-all">
                    {/* Time */}
                    <div className="w-14 text-center flex-shrink-0">
                      <p className="text-[#e4c69a] font-bold text-sm">{appt.time}</p>
                      <p className="text-white/20 text-xs">hs</p>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{appt.clientName}</p>
                      <p className="text-white/40 text-xs">{appt.serviceName} · {formatPrice(appt.servicePrice)}</p>
                    </div>

                    {/* Status badge */}
                    <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${badge.cls}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>

                    {/* Actions */}
                    {(appt.status === "pending" || appt.status === "confirmed") && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {appt.status === "pending" && (
                          <button
                            onClick={() => updateStatus(appt.id, "confirmed")}
                            disabled={updating === appt.id}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
                            title="Confirmar"
                          >
                            {updating === appt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(appt.id, "cancelled")}
                          disabled={updating === appt.id}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                          title="Cancelar"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Activity chart ── */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/10 rounded-2xl">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#e4c69a]" />
            <h2 className="text-white font-semibold">Actividad</h2>
            <span className="text-white/30 text-xs ml-auto">últimos 6 meses</span>
          </div>
          <div className="px-4 py-5">
            {chart.length > 0 ? (
              <ActivityChart data={chart} />
            ) : (
              <div className="flex items-center justify-center h-44">
                <p className="text-white/20 text-sm">Sin datos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
