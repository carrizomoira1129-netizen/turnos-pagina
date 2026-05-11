"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  X,
  Clock,
  Loader2,
  CheckCircle2,
  ChevronRight,
  User,
  Briefcase,
} from "lucide-react";

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00",
];

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
}

interface Professional {
  id: string;
  name: string;
  specialty: string;
}

interface BookingModalProps {
  date: Date;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "service" | "professional" | "time" | "confirm" | "success";

export default function BookingModal({ date, onClose, onSuccess }: BookingModalProps) {
  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const dateStr = format(date, "yyyy-MM-dd");
  const displayDate = format(date, "EEEE d 'de' MMMM, yyyy", { locale: es });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [servRes, profRes, availRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/professionals"),
          fetch(`/api/availability?date=${dateStr}`),
        ]);
        const [servData, profData, availData] = await Promise.all([
          servRes.json(),
          profRes.json(),
          availRes.json(),
        ]);
        setServices(servData.services || []);
        setProfessionals(profData.professionals || []);
        setBookedSlots(availData.booked || []);
      } catch {
        setError("Error al cargar datos. Por favor, intentá de nuevo.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateStr]);

  const handleConfirm = async () => {
    if (!selectedService || !selectedProfessional || !selectedTime) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          professionalId: selectedProfessional.id,
          date: dateStr,
          time: selectedTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear turno");

      setStep("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear turno");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) =>
    `$${price.toLocaleString("es-AR")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="text-white font-semibold text-lg">
              {step === "success" ? "¡Turno reservado!" : "Reservar turno"}
            </h2>
            <p className="text-white/40 text-sm capitalize">{displayDate}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "success" && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 bg-white/[0.02]">
            {(["service", "professional", "time", "confirm"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                    s === step
                      ? "bg-[#e4c69a] text-[#0D0D0D]"
                      : ["service", "professional", "time", "confirm"].indexOf(s) <
                        ["service", "professional", "time", "confirm"].indexOf(step)
                      ? "bg-[#e4c69a]/30 text-[#e4c69a]"
                      : "bg-white/10 text-white/30"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && <div className="w-6 h-px bg-white/10" />}
              </div>
            ))}
            <span className="ml-2 text-xs text-white/30">
              {step === "service" && "Elegí un servicio"}
              {step === "professional" && "Elegí un profesional"}
              {step === "time" && "Elegí un horario"}
              {step === "confirm" && "Confirmá tu turno"}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : step === "success" ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-[#e4c69a] mx-auto mb-4" />
              <h3 className="text-white text-xl font-bold mb-2">
                ¡Todo listo!
              </h3>
              <p className="text-white/50 text-sm">
                Tu turno fue reservado exitosamente.
              </p>
              <div className="mt-4 p-4 bg-white/[0.03] rounded-xl border border-white/10 text-left space-y-2">
                <p className="text-white/60 text-xs">
                  <span className="text-white/30">Servicio: </span>
                  {selectedService?.name}
                </p>
                <p className="text-white/60 text-xs">
                  <span className="text-white/30">Profesional: </span>
                  {selectedProfessional?.name}
                </p>
                <p className="text-white/60 text-xs">
                  <span className="text-white/30">Fecha: </span>
                  <span className="capitalize">{displayDate}</span>
                </p>
                <p className="text-white/60 text-xs">
                  <span className="text-white/30">Hora: </span>
                  {selectedTime}
                </p>
              </div>
            </div>
          ) : step === "service" ? (
            <div className="space-y-3">
              <p className="text-white/40 text-sm mb-4">
                Seleccioná el servicio que necesitás:
              </p>
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setStep("professional");
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all group ${
                    selectedService?.id === service.id
                      ? "border-[#e4c69a]/50 bg-[#e4c69a]/5"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{service.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">{service.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-white/30">
                          <Clock className="w-3 h-3" />
                          {service.duration_minutes} min
                        </span>
                        <span className="text-xs text-[#e4c69a] font-semibold">
                          {formatPrice(service.price)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors ml-3" />
                  </div>
                </button>
              ))}
            </div>
          ) : step === "professional" ? (
            <div className="space-y-3">
              <p className="text-white/40 text-sm mb-4">
                Seleccioná un profesional:
              </p>
              {professionals.map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => {
                    setSelectedProfessional(prof);
                    setStep("time");
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all group ${
                    selectedProfessional?.id === prof.id
                      ? "border-[#e4c69a]/50 bg-[#e4c69a]/5"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e4c69a]/10 border border-[#e4c69a]/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-[#e4c69a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{prof.name}</p>
                      <p className="text-white/40 text-xs">{prof.specialty}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          ) : step === "time" ? (
            <div>
              <p className="text-white/40 text-sm mb-4">
                Seleccioná un horario disponible:
              </p>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isBooked = bookedSlots.includes(slot);
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => {
                        if (!isBooked) {
                          setSelectedTime(slot);
                          setStep("confirm");
                        }
                      }}
                      disabled={isBooked}
                      className={`py-3 rounded-xl text-sm font-medium transition-all border ${
                        isSelected
                          ? "bg-[#e4c69a] text-[#0D0D0D] border-[#e4c69a]"
                          : isBooked
                          ? "bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed line-through"
                          : "bg-white/[0.03] border-white/10 text-white hover:border-[#e4c69a]/40 hover:text-[#e4c69a] hover:bg-[#e4c69a]/5"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
              {bookedSlots.length > 0 && (
                <p className="text-white/20 text-xs mt-4">
                  Los horarios tachados ya están reservados
                </p>
              )}
            </div>
          ) : step === "confirm" ? (
            <div className="space-y-4">
              <p className="text-white/40 text-sm mb-2">
                Confirmá los detalles de tu turno:
              </p>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-[#e4c69a]" />
                  <div>
                    <p className="text-white/30 text-xs">Servicio</p>
                    <p className="text-white text-sm font-medium">{selectedService?.name}</p>
                    <p className="text-[#e4c69a] text-xs font-semibold">
                      {formatPrice(selectedService?.price || 0)} · {selectedService?.duration_minutes} min
                    </p>
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[#e4c69a]" />
                  <div>
                    <p className="text-white/30 text-xs">Profesional</p>
                    <p className="text-white text-sm font-medium">{selectedProfessional?.name}</p>
                    <p className="text-white/40 text-xs">{selectedProfessional?.specialty}</p>
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#e4c69a]" />
                  <div>
                    <p className="text-white/30 text-xs">Fecha y hora</p>
                    <p className="text-white text-sm font-medium capitalize">{displayDate}</p>
                    <p className="text-[#e4c69a] text-xs font-semibold">{selectedTime} hs</p>
                  </div>
                </div>
              </div>
              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {step !== "success" && !loading && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3">
            {step !== "service" && (
              <button
                onClick={() => {
                  if (step === "professional") setStep("service");
                  else if (step === "time") setStep("professional");
                  else if (step === "confirm") setStep("time");
                }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm font-medium transition-all"
              >
                Atrás
              </button>
            )}
            {step === "confirm" && (
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-[#e4c69a] hover:bg-[#d4b68a] disabled:opacity-50 text-[#0D0D0D] text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reservando...
                  </>
                ) : (
                  "Confirmar reserva"
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
