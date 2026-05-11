"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Info } from "lucide-react";
import Calendar from "@/components/Calendar";
import BookingModal from "@/components/BookingModal";

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookedDates = useCallback(async () => {
    try {
      const res = await fetch("/api/booked-dates");
      const data = await res.json();
      setBookedDates(data.dates || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookedDates();
  }, [fetchBookedDates]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  const handleBookingSuccess = () => {
    fetchBookedDates();
  };

  return (
    <div className="pt-14 md:pt-0 min-h-screen p-6 md:p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Reservar turno</h1>
        <p className="text-white/40 text-sm mt-1">
          Seleccioná un día disponible en el calendario para agendar tu turno
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 h-80 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#e4c69a] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Calendar
              onSelectDate={handleSelectDate}
              selectedDate={selectedDate}
              bookedDates={bookedDates}
            />
          )}
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          {/* How it works */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#e4c69a]" />
              ¿Cómo funciona?
            </h3>
            <ol className="space-y-3">
              {[
                "Seleccioná un día disponible en el calendario",
                "Elegí el servicio que necesitás",
                "Seleccioná un profesional",
                "Elegí el horario que mejor te quede",
                "Confirmá tu reserva",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-white/40">
                  <span className="w-5 h-5 rounded-full bg-[#e4c69a]/10 border border-[#e4c69a]/20 text-[#e4c69a] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Business info */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#e4c69a]" />
              Horarios de atención
            </h3>
            <div className="space-y-2 text-xs text-white/40">
              <div className="flex justify-between">
                <span>Lunes a Viernes</span>
                <span className="text-white/60">10:00 – 18:00</span>
              </div>
              <div className="flex justify-between">
                <span>Sábados</span>
                <span className="text-white/60">10:00 – 18:00</span>
              </div>
              <div className="flex justify-between">
                <span>Domingos</span>
                <span className="text-red-400/60">Cerrado</span>
              </div>
            </div>
          </div>

          {/* Selected date preview */}
          {selectedDate && (
            <div className="bg-[#e4c69a]/5 border border-[#e4c69a]/20 rounded-2xl p-5">
              <p className="text-[#e4c69a] text-xs font-semibold mb-1">Día seleccionado</p>
              <p className="text-white font-medium text-sm capitalize">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 w-full py-2 rounded-lg bg-[#e4c69a] text-[#0D0D0D] text-xs font-semibold hover:bg-[#d4b68a] transition-all"
              >
                Ver horarios disponibles
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedDate && (
        <BookingModal
          date={selectedDate}
          onClose={handleModalClose}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
