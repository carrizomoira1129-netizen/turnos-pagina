"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  User,
  Briefcase,
  Loader2,
  XCircle,
  CheckCircle,
  AlertCircle,
  Ban,
} from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes: string | null;
  services: { name: string; price: number; duration_minutes: number } | null;
  professionals: { name: string; specialty: string } | null;
}

const STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", icon: AlertCircle },
  confirmed: { label: "Confirmado", color: "text-green-400", bg: "bg-green-400/10 border-green-400/20", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", icon: Ban },
  completed: { label: "Completado", color: "text-[#e4c69a]", bg: "bg-[#e4c69a]/10 border-[#e4c69a]/20", icon: CheckCircle },
};

export default function MisTurnosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      const res = await fetch("/api/appointments");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAppointments(data.appointments || []);
    } catch {
      setError("Error al cargar tus turnos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error();
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
      );
    } catch {
      setError("Error al cancelar el turno.");
    } finally {
      setCancelling(null);
    }
  };

  const formatPrice = (price: number) => `$${price.toLocaleString("es-AR")}`;

  const upcoming = appointments.filter(
    (a) => a.status === "pending" || a.status === "confirmed"
  );
  const past = appointments.filter(
    (a) => a.status === "cancelled" || a.status === "completed"
  );

  return (
    <div className="pt-14 md:pt-0 min-h-screen p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Mis turnos</h1>
        <p className="text-white/40 text-sm mt-1">
          Historial y próximos turnos reservados
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CalendarDays className="w-12 h-12 text-white/10 mb-4" />
          <h3 className="text-white/40 font-medium mb-1">No tenés turnos aún</h3>
          <p className="text-white/20 text-sm">
            Reservá tu primer turno desde el calendario
          </p>
        </div>
      ) : (
        <div className="space-y-8 max-w-3xl">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                Próximos turnos ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onCancel={handleCancel}
                    cancelling={cancelling}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                Historial ({past.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {past.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onCancel={null}
                    cancelling={cancelling}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  onCancel,
  cancelling,
  formatPrice,
}: {
  appointment: Appointment;
  onCancel: ((id: string) => void) | null;
  cancelling: string | null;
  formatPrice: (price: number) => string;
}) {
  const status = STATUS_CONFIG[appointment.status];
  const StatusIcon = status.icon;
  const dateDisplay = format(
    parseISO(appointment.appointment_date),
    "EEEE d 'de' MMMM, yyyy",
    { locale: es }
  );

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Service & professional */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-white font-medium">
              <Briefcase className="w-3.5 h-3.5 text-[#e4c69a]" />
              {appointment.services?.name ?? "Servicio"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <User className="w-3 h-3" />
              {appointment.professionals?.name ?? "Profesional"}
            </div>
          </div>

          {/* Date & time */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <CalendarDays className="w-3 h-3" />
              <span className="capitalize">{dateDisplay}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Clock className="w-3 h-3" />
              {appointment.appointment_time.slice(0, 5)} hs
            </div>
          </div>

          {/* Price */}
          {appointment.services && (
            <p className="text-[#e4c69a] text-xs font-semibold">
              {formatPrice(appointment.services.price)} ·{" "}
              {appointment.services.duration_minutes} min
            </p>
          )}
        </div>

        {/* Status & actions */}
        <div className="flex flex-col items-end gap-2">
          <span
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${status.bg} ${status.color}`}
          >
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>

          {onCancel && appointment.status !== "cancelled" && (
            <button
              onClick={() => onCancel(appointment.id)}
              disabled={cancelling === appointment.id}
              className="text-xs text-white/25 hover:text-red-400 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {cancelling === appointment.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
