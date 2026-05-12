"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2, TrendingUp, Users, XCircle, BarChart3,
  Loader2, CheckCircle2, ChevronDown, LogOut, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/plans";

const ActivityChart = dynamic(() => import("@/components/admin/ActivityChart"), { ssr: false });

const PLAN_COLORS = {
  basic:   "bg-white/10 text-white/60 border-white/10",
  pro:     "bg-blue-500/15 text-blue-400 border-blue-500/20",
  premium: "bg-[#e4c69a]/15 text-[#e4c69a] border-[#e4c69a]/20",
};
const STATUS_COLORS = {
  active:     "bg-green-500/15 text-green-400 border-green-500/20",
  past_due:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  cancelled:  "bg-red-500/15 text-red-400 border-red-500/20",
};

interface Business {
  id: string; name: string; slug: string; niche: string;
  plan: string; plan_status: string; created_at: string;
}
interface Metrics {
  mrr: number; activeCount: number; cancelledCount: number;
  churnRate: number; totalBusinesses: number;
  planBreakdown: { basic: number; pro: number; premium: number };
  growth: { month: string; count: number }[];
  businesses: Business[];
}

function fmt(n: number) { return `$${n.toLocaleString("es-AR")}`; }

export default function SuperAdminPage() {
  const router = useRouter();
  const [data,    setData]    = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);

  const load = () =>
    fetch("/api/super-admin/metrics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handlePlanChange = async (id: string, field: "plan" | "plan_status", value: string) => {
    setSaving(id);
    await fetch(`/api/super-admin/businesses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setData((prev) => prev ? {
      ...prev,
      businesses: prev.businesses.map((b) => b.id === id ? { ...b, [field]: value } : b),
    } : prev);
    setSaving(null);
  };

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
    </div>
  );

  const d = data!;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#e4c69a]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Super Admin</h1>
            <p className="text-white/40 text-sm">Panel de control SaaS</p>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/20 text-sm transition-all">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MRR",              value: fmt(d.mrr),             Icon: TrendingUp, gold: true  },
          { label: "Negocios activos", value: String(d.activeCount),  Icon: Building2,  gold: false },
          { label: "Cancelaciones",    value: String(d.cancelledCount),Icon: XCircle,   gold: false },
          { label: "Churn rate",       value: `${d.churnRate}%`,      Icon: Users,      gold: false },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth chart */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/10 rounded-2xl">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#e4c69a]" />
            <h2 className="text-white font-semibold">Crecimiento</h2>
            <span className="text-white/30 text-xs ml-auto">nuevos negocios/mes</span>
          </div>
          <div className="px-4 py-5">
            {d.growth.some((g) => g.count > 0) ? (
              <ActivityChart data={d.growth} />
            ) : (
              <div className="flex items-center justify-center h-44">
                <p className="text-white/20 text-sm">Sin datos aún</p>
              </div>
            )}
          </div>
        </div>

        {/* Plan breakdown */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-white font-semibold">Por plan</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            {(["basic","pro","premium"] as const).map((p) => {
              const def = PLANS[p];
              const count = d.planBreakdown[p];
              const pct = d.activeCount > 0 ? Math.round((count / d.activeCount) * 100) : 0;
              return (
                <div key={p}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/60 text-xs">{def.name}</span>
                    <span className="text-white text-xs font-bold">{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#e4c69a] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-white/5">
              <p className="text-white/30 text-xs text-center">{d.totalBusinesses} negocios registrados en total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Business list */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white font-semibold">Todos los negocios</h2>
          <span className="text-white/30 text-xs">{d.businesses.length} total</span>
        </div>

        {d.businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">Ningún negocio registrado aún</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {d.businesses.map((b) => (
              <div key={b.id}
                className="px-6 py-4 flex items-center gap-4 flex-wrap hover:bg-white/[0.02] transition-all">
                <div className="w-9 h-9 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#e4c69a] text-xs font-bold">{b.name.charAt(0).toUpperCase()}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{b.name}</p>
                  <p className="text-white/30 text-xs">/{b.slug} · {b.niche ?? "—"}</p>
                </div>

                <span className="text-white/30 text-xs">
                  {format(parseISO(b.created_at), "d MMM yyyy", { locale: es })}
                </span>

                {/* Plan selector */}
                <div className="relative">
                  <select
                    value={b.plan}
                    onChange={(e) => handlePlanChange(b.id, "plan", e.target.value)}
                    disabled={saving === b.id}
                    className={`appearance-none pl-2.5 pr-6 py-1 rounded-full border text-xs font-medium bg-transparent cursor-pointer focus:outline-none disabled:opacity-50 ${PLAN_COLORS[b.plan as keyof typeof PLAN_COLORS] ?? ""}`}
                  >
                    <option value="basic"   className="bg-[#0D0D0D] text-white">Básico</option>
                    <option value="pro"     className="bg-[#0D0D0D] text-white">Pro</option>
                    <option value="premium" className="bg-[#0D0D0D] text-white">Premium</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50" />
                </div>

                {/* Status selector */}
                <div className="relative">
                  <select
                    value={b.plan_status}
                    onChange={(e) => handlePlanChange(b.id, "plan_status", e.target.value)}
                    disabled={saving === b.id}
                    className={`appearance-none pl-2.5 pr-6 py-1 rounded-full border text-xs font-medium bg-transparent cursor-pointer focus:outline-none disabled:opacity-50 ${STATUS_COLORS[b.plan_status as keyof typeof STATUS_COLORS] ?? ""}`}
                  >
                    <option value="active"    className="bg-[#0D0D0D] text-white">Activo</option>
                    <option value="past_due"  className="bg-[#0D0D0D] text-white">Atrasado</option>
                    <option value="cancelled" className="bg-[#0D0D0D] text-white">Cancelado</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50" />
                </div>

                {saving === b.id
                  ? <Loader2 className="w-3.5 h-3.5 text-white/40 animate-spin" />
                  : <CheckCircle2 className="w-3.5 h-3.5 text-white/10" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
