"use client";

import { useEffect, useState, useCallback } from "react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const HOURS  = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const DAYS   = ["Lun","Mar","Mié","Jue","Vie","Sáb"];

// Service color palette — cycles through these
const COLORS = [
  "bg-[#e4c69a]/20 border-[#e4c69a]/40 text-[#e4c69a]",
  "bg-blue-500/20  border-blue-500/40  text-blue-300",
  "bg-purple-500/20 border-purple-500/40 text-purple-300",
  "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  "bg-rose-500/20  border-rose-500/40  text-rose-300",
  "bg-cyan-500/20  border-cyan-500/40  text-cyan-300",
];

interface Appt {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  guest_name?: string;
  services: { id: string; name: string } | null;
  professionals: { name: string } | null;
  profiles: { full_name: string } | null;
}

export default function AgendaPage() {
  const [offset,       setOffset]       = useState(0);
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [weekStart,    setWeekStart]    = useState("");
  const [serviceColors, setServiceColors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/weekly?offset=${offset}`);
    const d = await r.json();
    setAppointments(d.appointments ?? []);
    setWeekStart(d.weekStart ?? "");

    // Assign stable colors to services
    const colorMap: Record<string, string> = {};
    let idx = 0;
    for (const a of (d.appointments ?? [])) {
      const sid = a.services?.id;
      if (sid && !(sid in colorMap)) colorMap[sid] = COLORS[idx++ % COLORS.length];
    }
    setServiceColors(colorMap);
    setLoading(false);
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  // Build day headers
  const weekDays = weekStart
    ? Array.from({ length: 6 }, (_, i) => {
        const d = addDays(parseISO(weekStart), i);
        return { iso: format(d, "yyyy-MM-dd"), label: DAYS[i], date: format(d, "d") };
      })
    : [];

  const getApptAt = (iso: string, hour: string) =>
    appointments.filter(
      (a) => a.appointment_date === iso && a.appointment_time.startsWith(hour)
    );

  const rangeLabel = weekStart
    ? (() => {
        const s = parseISO(weekStart);
        const e = addDays(s, 5);
        return `${format(s, "d")}–${format(e, "d 'de' MMMM yyyy", { locale: es })}`;
      })()
    : "";

  return (
    <div className="pt-14 md:pt-0 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Agenda semanal</h1>
          <p className="text-white/40 text-sm mt-0.5 capitalize">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset((p) => p - 1)}
            className="w-8 h-8 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/20 flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOffset(0)}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white text-xs transition-all"
          >
            Hoy
          </button>
          <button
            onClick={() => setOffset((p) => p + 1)}
            className="w-8 h-8 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/20 flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="min-w-[720px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              <div className="pr-3" /> {/* time col spacer */}
              {weekDays.map((d) => (
                <div
                  key={d.iso}
                  className={`text-center py-2 rounded-t-xl text-xs font-medium ${
                    d.iso === format(new Date(), "yyyy-MM-dd")
                      ? "bg-[#e4c69a]/10 border border-[#e4c69a]/20 text-[#e4c69a]"
                      : "text-white/40"
                  }`}
                >
                  <p>{d.label}</p>
                  <p className="text-base font-bold mt-0.5">{d.date}</p>
                </div>
              ))}
            </div>

            {/* Time rows */}
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-7 border-t border-white/5 min-h-[64px]">
                {/* Time label */}
                <div className="pr-3 pt-2 text-right">
                  <span className="text-white/25 text-xs">{hour}</span>
                </div>

                {/* Day cells */}
                {weekDays.map((d) => {
                  const appts = getApptAt(d.iso, hour);
                  return (
                    <div key={d.iso} className="border-l border-white/5 p-1 space-y-1">
                      {appts.map((a) => {
                        const colorCls = serviceColors[a.services?.id ?? ""] ?? COLORS[0];
                        const name = a.guest_name || a.profiles?.full_name || "—";
                        return (
                          <div
                            key={a.id}
                            className={`rounded-lg border px-2 py-1.5 text-xs leading-tight cursor-default ${colorCls}`}
                          >
                            <p className="font-semibold truncate">{name}</p>
                            <p className="opacity-70 truncate">{a.services?.name ?? "—"}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color legend */}
      {Object.keys(serviceColors).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-white/5">
          {Object.entries(serviceColors).map(([sid, cls]) => {
            const svc = appointments.find((a) => a.services?.id === sid)?.services;
            if (!svc) return null;
            return (
              <div key={sid} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs ${cls}`}>
                <span className="w-2 h-2 rounded-full bg-current" />
                {svc.name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
