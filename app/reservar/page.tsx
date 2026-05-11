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
  Hash,
} from "lucide-react";
import Calendar from "@/components/Calendar";
import StripeCheckout from "@/components/StripeCheckout";

const TIME_SLOTS = [
  "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00",
];

interface Service {
  id:               string;
  name:             string;
  description:      string;
  duration_minutes: number;
  price:            number;
}

interface FormState  { name: string; email: string; phone: string; }
interface FormErrors { name?: string; email?: string; phone?: string; }

type View = "form" | "payment" | "success";

function formatPrice(p: number) { return `$${p.toLocaleString("es-AR")}`; }

function SectionHeader({ step, label, locked }: { step: number; label: string; locked: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all flex-shrink-0 ${
        locked ? "border-white/10 text-white/20" : "border-[#e4c69a]/40 text-[#e4c69a] bg-[#e4c69a]/10"
      }`}>{step}</div>
      <h2 className={`font-semibold text-base transition-all ${locked ? "text-white/20" : "text-white"}`}>{label}</h2>
    </div>
  );
}

export default function ReservarPage() {
  const [view,           setView]           = useState<View>("form");
  const [confirmCode,    setConfirmCode]    = useState("");

  // Services
  const [services,        setServices]        = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dropdownOpen,    setDropdownOpen]    = useState(false);

  // Calendar
  const [selectedDate,     setSelectedDate]     = useState<Date | null>(null);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
  const [bookedSlots,      setBookedSlots]      = useState<string[]>([]);
  const [loadingSlots,     setLoadingSlots]     = useState(false);
  const [selectedTime,     setSelectedTime]     = useState<string | null>(null);

  // Client form
  const [form,    setForm]    = useState<FormState>({ name: "", email: "", phone: "" });
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  // ── Loaders ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d) => setServices(d.services || []))
      .finally(() => setLoadingServices(false));
  }, []);

  const fetchFullyBooked = useCallback(async (year: number, month: number) => {
    try {
      const r = await fetch(`/api/public/availability?year=${year}&month=${month}`);
      const d = await r.json();
      setFullyBookedDates((prev) => [
        ...prev.filter((s) => !s.startsWith(`${year}-${String(month).padStart(2, "0")}`)),
        ...(d.fullyBooked || []),
      ]);
    } catch {}
  }, []);

  useEffect(() => {
    const n = new Date();
    fetchFullyBooked(n.getFullYear(), n.getMonth() + 1);
  }, [fetchFullyBooked]);

  useEffect(() => {
    if (!selectedDate) return;
    setSelectedTime(null);
    setLoadingSlots(true);
    fetch(`/api/public/availability?date=${format(selectedDate, "yyyy-MM-dd")}`)
      .then((r) => r.json())
      .then((d) => setBookedSlots(d.booked || []))
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (field: keyof FormState, value: string) => {
    if (!value.trim()) return "Este campo es obligatorio";
    if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email inválido";
    if (field === "phone" && !/^\+?[\d\s\-()]{7,}$/.test(value)) return "Solo números, espacios y guiones";
    return "";
  };

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (touched[field]) setErrors((p) => ({ ...p, [field]: validate(field, value) }));
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors((p) => ({ ...p, [field]: validate(field, form[field]) }));
  };

  const allFieldsValid =
    form.name.trim() && form.email.trim() && form.phone.trim() &&
    !validate("name", form.name) && !validate("email", form.email) && !validate("phone", form.phone);

  const canProceedToPayment = !!(selectedService && selectedDate && selectedTime && allFieldsValid);

  const handleGoToPayment = () => {
    // Touch all fields to show validation errors if any
    setTouched({ name: true, email: true, phone: true });
    setErrors({
      name:  validate("name",  form.name),
      email: validate("email", form.email),
      phone: validate("phone", form.phone),
    });
    if (canProceedToPayment) setView("payment");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "success") {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#e4c69a]/10 border border-[#e4c69a]/30 mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#e4c69a]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">¡Pago confirmado!</h1>
          <p className="text-white/40 mb-2">Tu turno fue reservado y el pago fue procesado.</p>
          {confirmCode && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/20 mb-6">
              <Hash className="w-4 h-4 text-[#e4c69a]" />
              <span className="text-[#e4c69a] font-mono font-bold tracking-widest text-sm">
                {confirmCode}
              </span>
              <span className="text-white/30 text-xs">N° de confirmación</span>
            </div>
          )}

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-left space-y-4 mb-8">
            {selectedService && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#e4c69a]/10 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-4 h-4 text-[#e4c69a]" />
                </div>
                <div>
                  <p className="text-white/40 text-xs">Servicio</p>
                  <p className="text-white font-semibold">{selectedService.name}</p>
                  <p className="text-[#e4c69a] text-xs font-bold">{formatPrice(selectedService.price)}</p>
                </div>
              </div>
            )}
            <div className="h-px bg-white/5" />
            {selectedDate && selectedTime && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#e4c69a]/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-[#e4c69a]" />
                </div>
                <div>
                  <p className="text-white/40 text-xs">Fecha y hora</p>
                  <p className="text-white font-semibold capitalize">
                    {format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                  <p className="text-[#e4c69a] text-xs font-bold">{selectedTime} hs</p>
                </div>
              </div>
            )}
            <div className="h-px bg-white/5" />
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e4c69a]/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-[#e4c69a]" />
              </div>
              <div>
                <p className="text-white/40 text-xs">Datos del cliente</p>
                <p className="text-white font-semibold">{form.name}</p>
                <p className="text-white/40 text-xs">{form.email}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setView("form");
              setSelectedService(null);
              setSelectedDate(null);
              setSelectedTime(null);
              setForm({ name: "", email: "", phone: "" });
              setTouched({});
              setErrors({});
              setConfirmCode("");
            }}
            className="w-full py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm font-medium transition-all mb-3"
          >
            Reservar otro turno
          </button>
          <Link href="/login" className="block text-center text-sm text-[#e4c69a]/60 hover:text-[#e4c69a] transition-colors">
            ¿Tenés cuenta? Iniciá sesión para ver tus turnos
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAYMENT VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "payment" && selectedService && selectedDate && selectedTime) {
    return (
      <div className="min-h-screen bg-[#0D0D0D]">
        <header className="border-b border-white/5 sticky top-0 z-10 bg-[#0D0D0D]/90 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e4c69a]/10 border border-[#e4c69a]/30 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-[#e4c69a]" />
            </div>
            <div>
              <span className="text-white font-bold text-lg leading-none block">TurnosPro</span>
              <span className="text-white/30 text-xs">Paso final — Pago</span>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 pb-16">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Confirmá y pagá</h1>
            <p className="text-white/40 text-sm mt-1">
              Revisá los datos de tu turno y completá el pago para confirmar la reserva.
            </p>
          </div>

          <StripeCheckout
            service={selectedService}
            date={selectedDate}
            time={selectedTime}
            guestName={form.name}
            guestEmail={form.email}
            guestPhone={form.phone}
            onSuccess={(code) => { setConfirmCode(code); setView("success"); }}
            onBack={() => setView("form")}
          />
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FORM VIEW (steps 1–4)
  // ─────────────────────────────────────────────────────────────────────────
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
            className="flex items-center gap-2 text-sm text-white/40 hover:text-[#e4c69a] border border-white/10 hover:border-[#e4c69a]/30 px-3 py-1.5 rounded-lg transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reservá tu turno</h1>
          <p className="text-white/40">Sin necesidad de crear una cuenta. Completá los pasos a continuación.</p>
        </div>

        {/* ── Step 1: Service ── */}
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
                  selectedService ? "border-[#e4c69a]/40 bg-[#e4c69a]/5" : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                {selectedService ? (
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{selectedService.name}</p>
                    <p className="text-white/40 text-xs mt-0.5 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {selectedService.duration_minutes} min
                      <span className="text-[#e4c69a] font-semibold">{formatPrice(selectedService.price)}</span>
                    </p>
                  </div>
                ) : (
                  <span className="text-white/30 text-sm">Seleccioná un servicio...</span>
                )}
                <ChevronDown className={`w-4 h-4 text-white/30 flex-shrink-0 ml-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute z-20 top-full mt-2 left-0 right-0 bg-[#161616] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => { setSelectedService(service); setDropdownOpen(false); setSelectedDate(null); setSelectedTime(null); }}
                      className={`w-full flex items-start justify-between px-4 py-3.5 text-left hover:bg-white/5 transition-all border-b border-white/5 last:border-0 ${selectedService?.id === service.id ? "bg-[#e4c69a]/5" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{service.name}</p>
                        <p className="text-white/40 text-xs mt-0.5">{service.description}</p>
                        <span className="flex items-center gap-1 text-xs text-white/30 mt-1.5">
                          <Clock className="w-3 h-3" />{service.duration_minutes} min
                        </span>
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

        {/* ── Step 2: Date & Time ── */}
        <section className={`bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all ${!selectedService ? "opacity-40 pointer-events-none" : ""}`}>
          <SectionHeader step={2} label="Elegí la fecha y el horario" locked={!selectedService} />

          <Calendar
            onSelectDate={setSelectedDate}
            selectedDate={selectedDate}
            bookedDates={[]}
            disabledDates={fullyBookedDates}
            showLegend={false}
          />

          {selectedDate && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-white/50 text-xs font-medium mb-3 capitalize">
                Horarios disponibles — {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-white/30 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Verificando disponibilidad...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const booked   = bookedSlots.includes(slot);
                      const selected = selectedTime === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => !booked && setSelectedTime(slot)}
                          disabled={booked}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            selected ? "bg-[#e4c69a] text-[#0D0D0D] border-[#e4c69a] shadow-lg shadow-[#e4c69a]/20"
                            : booked  ? "bg-transparent border-white/5 text-white/15 cursor-not-allowed line-through"
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

        {/* ── Step 3: Client form ── */}
        <section className={`bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all ${!selectedTime ? "opacity-40 pointer-events-none" : ""}`}>
          <SectionHeader step={3} label="Tus datos" locked={!selectedTime} />

          <div className="space-y-4">
            {(["name", "email", "phone"] as const).map((field) => {
              const config = {
                name:  { label: "Nombre completo", placeholder: "Juan Pérez",          type: "text",  Icon: User  },
                email: { label: "Email",            placeholder: "tu@email.com",        type: "email", Icon: Mail  },
                phone: { label: "Teléfono",         placeholder: "+54 11 1234-5678",    type: "tel",   Icon: Phone },
              }[field];
              return (
                <div key={field}>
                  <label className="block text-sm text-white/50 mb-1.5">
                    {config.label} <span className="text-[#e4c69a]">*</span>
                  </label>
                  <div className="relative">
                    <config.Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type={config.type}
                      value={form[field]}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      onBlur={() => handleBlur(field)}
                      placeholder={config.placeholder}
                      className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:ring-1 transition-all ${
                        errors[field] && touched[field]
                          ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/10"
                          : "border-white/10 focus:border-[#e4c69a]/50 focus:ring-[#e4c69a]/10"
                      }`}
                    />
                  </div>
                  {errors[field] && touched[field] && (
                    <p className="flex items-center gap-1 text-red-400 text-xs mt-1.5">
                      <AlertCircle className="w-3 h-3" /> {errors[field]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Step 4: Go to payment ── */}
        <section>
          {selectedService && selectedDate && selectedTime && (
            <div className="bg-white/[0.03] border border-[#e4c69a]/15 rounded-2xl p-4 mb-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-white/60">
                <span className="text-[#e4c69a]">▸</span>
                <span>{selectedService.name}</span>
                <span className="text-[#e4c69a] font-semibold">{formatPrice(selectedService.price)}</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <CalendarDays className="w-3.5 h-3.5 text-[#e4c69a]" />
                <span className="capitalize">{format(selectedDate, "d 'de' MMMM", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Clock className="w-3.5 h-3.5 text-[#e4c69a]" />
                <span>{selectedTime} hs</span>
              </div>
            </div>
          )}

          <button
            onClick={handleGoToPayment}
            disabled={!canProceedToPayment}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
              canProceedToPayment
                ? "bg-gradient-to-r from-[#e4c69a] to-[#c9a96e] text-[#0D0D0D] hover:shadow-lg hover:shadow-[#e4c69a]/20 hover:scale-[1.01] active:scale-[0.99]"
                : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            {selectedService ? `Continuar al pago · ${formatPrice(selectedService.price)}` : "Continuar al pago"}
          </button>

          {!canProceedToPayment && (
            <p className="text-center text-white/20 text-xs mt-3">Completá todos los pasos para continuar</p>
          )}
        </section>
      </main>

      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} TurnosPro · Sistema de reservas online</p>
      </footer>
    </div>
  );
}
