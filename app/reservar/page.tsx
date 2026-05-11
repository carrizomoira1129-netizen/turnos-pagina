"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  ChevronDown,
  CheckCircle2,
  Loader2,
  User,
  Mail,
  Phone,
  AlertCircle,
  LogIn,
} from "lucide-react";
import Calendar from "@/components/Calendar";

const TIME_SLOTS = [
  "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00",
];

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

function formatPrice(price: number) {
  return `$${price.toLocaleString("es-AR")}`;
}

function SectionHeader({
  step,
  label,
  locked,
}: {
  step: number;
  label: string;
  locked: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all flex-shrink-0 ${
          locked
            ? "border-white/10 text-white/20 bg-transparent"
            : "border-[#e4c69a]/40 text-[#e4c69a] bg-[#e4c69a]/10"
        }`}
      >
        {step}
      </div>
      <h2
        className={`font-semibold text-base transition-all ${
          locked ? "text-white/20" : "text-white"
        }`}
      >
        {label}
      </h2>
    </div>
  );
}

export default function ReservarPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    service: string;
    date: string;
    time: string;
  } | null>(null);

  // Load services
  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setServices(d.services || []))
      .finally(() => setLoadingServices(false));
  }, []);

  // Load fully booked dates for current/next month
  const fetchFullyBooked = useCallback(async (year: number, month: number) => {
    try {
      const res = await fetch(
        `/api/public/availability?year=${year}&month=${month}`
      );
      const data = await res.json();
      setFullyBookedDates((prev) => [
        ...prev.filter((d) => !d.startsWith(`${year}-${String(month).padStart(2, "0")}`)),
        ...(data.fullyBooked || []),
      ]);
    } catch {}
  }, []);

  useEffect(() => {
    const now = new Date();
    fetchFullyBooked(now.getFullYear(), now.getMonth() + 1);
  }, [fetchFullyBooked]);

  // Load booked slots when date is selected
  useEffect(() => {
    if (!selectedDate) return;
    setSelectedTime(null);
    setLoadingSlots(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    fetch(`/api/public/availability?date=${dateStr}`)
      .then((r) => r.json())
      .then((d) => setBookedSlots(d.booked || []))
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  // Validation
  const validate = (field: keyof FormState, value: string): string => {
    if (!value.trim()) return "Este campo es obligatorio";
    if (field === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email inválido";
    }
    if (field === "phone") {
      if (!/^\+?[\d\s\-()]{7,}$/.test(value)) return "Solo números, espacios y guiones";
    }
    return "";
  };

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validate(field, value) }));
    }
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validate(field, form[field]) }));
  };

  const allFieldsValid =
    form.name.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    !validate("name", form.name) &&
    !validate("email", form.email) &&
    !validate("phone", form.phone);

  const canSubmit =
    selectedService && selectedDate && selectedTime && allFieldsValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId:  selectedService!.id,
          date:       format(selectedDate!, "yyyy-MM-dd"),
          time:       selectedTime,
          guestName:  form.name.trim(),
          guestEmail: form.email.trim(),
          guestPhone: form.phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reservar");

      setSuccessData({
        service: selectedService!.name,
        date: format(selectedDate!, "EEEE d 'de' MMMM, yyyy", { locale: es }),
        time: selectedTime!,
      });
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al confirmar el turno");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success screen ───────────────────────────────────────────────────────
  if (success && successData) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#e4c69a]/10 border border-[#e4c69a]/30 mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#e4c69a]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">¡Turno confirmado!</h1>
          <p className="text-white/40 mb-8">
            Te esperamos. Recibirás un recordatorio por email.
          </p>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-left space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e4c69a]/10 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-4 h-4 text-[#e4c69a]" />
              </div>
              <div>
                <p className="text-white/40 text-xs">Servicio</p>
                <p className="text-white font-semibold">{successData.service}</p>
              </div>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e4c69a]/10 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-4 h-4 text-[#e4c69a]" />
              </div>
              <div>
                <p className="text-white/40 text-xs">Fecha</p>
                <p className="text-white font-semibold capitalize">{successData.date}</p>
              </div>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e4c69a]/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-[#e4c69a]" />
              </div>
              <div>
                <p className="text-white/40 text-xs">Hora</p>
                <p className="text-white font-semibold">{successData.time} hs</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSuccess(false);
              setSuccessData(null);
              setSelectedService(null);
              setSelectedDate(null);
              setSelectedTime(null);
              setForm({ name: "", email: "", phone: "" });
              setTouched({});
              setErrors({});
            }}
            className="w-full py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm font-medium transition-all mb-3"
          >
            Reservar otro turno
          </button>
          <Link
            href="/login"
            className="block text-center text-sm text-[#e4c69a]/60 hover:text-[#e4c69a] transition-colors"
          >
            ¿Tenés cuenta? Iniciá sesión para ver tus turnos
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main page ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="border-b border-white/5 sticky top-0 z-10 bg-[#0D0D0D]/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/30 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-[#e4c69a]" />
            </div>
            <div>
              <span className="text-white font-bold text-lg leading-none block">TurnosPro</span>
              <span className="text-white/30 text-xs">Reserva online</span>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-white/40 hover:text-[#e4c69a] transition-colors border border-white/10 hover:border-[#e4c69a]/30 px-3 py-1.5 rounded-lg"
          >
            <LogIn className="w-3.5 h-3.5" />
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 pb-16">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Reservá tu turno
          </h1>
          <p className="text-white/40">
            Sin necesidad de crear una cuenta. Completá los pasos a continuación.
          </p>
        </div>

        {/* ── STEP 1: Service ── */}
        <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <SectionHeader step={1} label="Elegí el servicio" locked={false} />

          {loadingServices ? (
            <div className="flex items-center gap-2 text-white/30 text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando servicios...
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all ${
                  selectedService
                    ? "border-[#e4c69a]/40 bg-[#e4c69a]/5"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                {selectedService ? (
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{selectedService.name}</p>
                    <p className="text-white/40 text-xs mt-0.5 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {selectedService.duration_minutes} min
                      <span className="text-[#e4c69a] font-semibold">
                        {formatPrice(selectedService.price)}
                      </span>
                    </p>
                  </div>
                ) : (
                  <span className="text-white/30 text-sm">
                    Seleccioná un servicio...
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-white/30 flex-shrink-0 ml-3 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute z-20 top-full mt-2 left-0 right-0 bg-[#161616] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setDropdownOpen(false);
                        setSelectedDate(null);
                        setSelectedTime(null);
                      }}
                      className={`w-full flex items-start justify-between px-4 py-3.5 text-left hover:bg-white/5 transition-all border-b border-white/5 last:border-0 ${
                        selectedService?.id === service.id ? "bg-[#e4c69a]/5" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{service.name}</p>
                        <p className="text-white/40 text-xs mt-0.5">{service.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-white/30">
                            <Clock className="w-3 h-3" />
                            {service.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      <span className="text-[#e4c69a] font-bold text-sm ml-4 flex-shrink-0 mt-0.5">
                        {formatPrice(service.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── STEP 2: Date & Time ── */}
        <section
          className={`bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all ${
            !selectedService ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          <SectionHeader step={2} label="Elegí la fecha y el horario" locked={!selectedService} />

          <Calendar
            onSelectDate={setSelectedDate}
            selectedDate={selectedDate}
            bookedDates={[]}
            disabledDates={fullyBookedDates}
            showLegend={false}
          />

          {/* Time slots */}
          {selectedDate && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-white/50 text-xs font-medium mb-3 capitalize">
                Horarios disponibles —{" "}
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </p>

              {loadingSlots ? (
                <div className="flex items-center gap-2 text-white/30 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando disponibilidad...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const isBooked = bookedSlots.includes(slot);
                      const isSelected = selectedTime === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => !isBooked && setSelectedTime(slot)}
                          disabled={isBooked}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            isSelected
                              ? "bg-[#e4c69a] text-[#0D0D0D] border-[#e4c69a] shadow-lg shadow-[#e4c69a]/20"
                              : isBooked
                              ? "bg-transparent border-white/5 text-white/15 cursor-not-allowed line-through"
                              : "bg-white/[0.03] border-white/10 text-white hover:border-[#e4c69a]/40 hover:text-[#e4c69a] hover:bg-[#e4c69a]/5"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  {bookedSlots.length === TIME_SLOTS.length && (
                    <p className="flex items-center gap-1.5 text-yellow-500/70 text-xs mt-3">
                      <AlertCircle className="w-3.5 h-3.5" />
                      No hay horarios disponibles para este día. Elegí otra fecha.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* ── STEP 3: Form ── */}
        <section
          className={`bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all ${
            !selectedTime ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          <SectionHeader step={3} label="Tus datos" locked={!selectedTime} />

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-white/50 mb-1.5">
                Nombre completo <span className="text-[#e4c69a]">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  placeholder="Juan Pérez"
                  className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 transition-all ${
                    errors.name && touched.name
                      ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/10"
                      : "border-white/10 focus:border-[#e4c69a]/50 focus:ring-[#e4c69a]/10"
                  }`}
                />
              </div>
              {errors.name && touched.name && (
                <p className="flex items-center gap-1 text-red-400 text-xs mt-1.5">
                  <AlertCircle className="w-3 h-3" /> {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-white/50 mb-1.5">
                Email <span className="text-[#e4c69a]">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder="tu@email.com"
                  className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 transition-all ${
                    errors.email && touched.email
                      ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/10"
                      : "border-white/10 focus:border-[#e4c69a]/50 focus:ring-[#e4c69a]/10"
                  }`}
                />
              </div>
              {errors.email && touched.email && (
                <p className="flex items-center gap-1 text-red-400 text-xs mt-1.5">
                  <AlertCircle className="w-3 h-3" /> {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm text-white/50 mb-1.5">
                Teléfono <span className="text-[#e4c69a]">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  onBlur={() => handleBlur("phone")}
                  placeholder="+54 11 1234-5678"
                  className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 transition-all ${
                    errors.phone && touched.phone
                      ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/10"
                      : "border-white/10 focus:border-[#e4c69a]/50 focus:ring-[#e4c69a]/10"
                  }`}
                />
              </div>
              {errors.phone && touched.phone && (
                <p className="flex items-center gap-1 text-red-400 text-xs mt-1.5">
                  <AlertCircle className="w-3 h-3" /> {errors.phone}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── STEP 4: Summary + Confirm ── */}
        <section>
          {/* Summary pill (shows when service + date + time are selected) */}
          {selectedService && selectedDate && selectedTime && (
            <div className="bg-white/[0.03] border border-[#e4c69a]/15 rounded-2xl p-4 mb-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-white/60">
                <span className="text-[#e4c69a]">▸</span>
                <span>{selectedService.name}</span>
                <span className="text-[#e4c69a] font-semibold">{formatPrice(selectedService.price)}</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <CalendarDays className="w-3.5 h-3.5 text-[#e4c69a]" />
                <span className="capitalize">
                  {format(selectedDate, "d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Clock className="w-3.5 h-3.5 text-[#e4c69a]" />
                <span>{selectedTime} hs</span>
              </div>
            </div>
          )}

          {submitError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {submitError}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
              canSubmit && !submitting
                ? "bg-gradient-to-r from-[#e4c69a] to-[#c9a96e] text-[#0D0D0D] hover:shadow-lg hover:shadow-[#e4c69a]/20 hover:scale-[1.01] active:scale-[0.99]"
                : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Confirmando turno...
              </>
            ) : (
              <>
                <CalendarDays className="w-5 h-5" />
                Confirmar Turno
              </>
            )}
          </button>

          {!canSubmit && !submitting && (
            <p className="text-center text-white/20 text-xs mt-3">
              Completá todos los pasos para habilitar el botón
            </p>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} TurnosPro · Sistema de reservas online
        </p>
      </footer>
    </div>
  );
}
