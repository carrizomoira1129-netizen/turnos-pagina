"use client";

import { useEffect, useState, useCallback } from "react";
import { use } from "react";
import {
  CalendarDays, User, ChevronLeft, ChevronRight,
  CheckCircle2, Loader2, Phone, Mail, AlertCircle,
  Link as LinkIcon, Globe,
} from "lucide-react";
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import StripeCheckout from "@/components/StripeCheckout";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Business {
  id: string; slug: string; name: string; description: string;
  logo_url: string | null; primary_color: string; secondary_color: string;
  social_links: Record<string, string>; plan: string;
}
interface Service {
  id: string; name: string; description: string;
  duration_minutes: number; price: number;
}
interface Professional { id: string; name: string; specialty: string; }
interface Config { working_days: string[]; working_hours_start: string; working_hours_end: string; }

const DAY_KEYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const HOUR_STEP = 60;

function fmt(n: number) { return `$${n.toLocaleString("es-AR")}`; }

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NegocioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [biz, setBiz]                 = useState<Business | null>(null);
  const [services, setServices]       = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [config, setConfig]           = useState<Config | null>(null);
  const [loadingBiz, setLoadingBiz]   = useState(true);
  const [notFound, setNotFound]       = useState(false);

  // Form state
  const [service,  setService]  = useState<Service | null>(null);
  const [month,    setMonth]    = useState(new Date());
  const [selDate,  setSelDate]  = useState<Date | null>(null);
  const [selTime,  setSelTime]  = useState("");
  const [bookedSlots,  setBookedSlots]  = useState<string[]>([]);
  const [fullyBooked,  setFullyBooked]  = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [view,  setView]  = useState<"form" | "payment" | "success">("form");
  const [code,  setCode]  = useState("");

  // Load business
  useEffect(() => {
    fetch(`/api/public/business?slug=${slug}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => {
        setBiz(d.business); setServices(d.services ?? []);
        setProfessionals(d.professionals ?? []); setConfig(d.config);
        if (d.services?.length) setService(d.services[0]);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingBiz(false));
  }, [slug]);

  // Fully booked dates for current month
  useEffect(() => {
    if (!biz) return;
    fetch(`/api/public/availability?slug=${slug}&year=${month.getFullYear()}&month=${month.getMonth() + 1}`)
      .then((r) => r.json())
      .then((d) => setFullyBooked((d.fullyBooked ?? []).map((x: { full_date: string }) => x.full_date)));
  }, [slug, biz, month]);

  // Booked slots for selected date
  const loadSlots = useCallback(async (date: Date) => {
    if (!biz) return;
    setLoadingSlots(true);
    const iso = format(date, "yyyy-MM-dd");
    const r = await fetch(`/api/public/availability?slug=${slug}&date=${iso}`);
    const d = await r.json();
    setBookedSlots((d.booked ?? []).map((x: { appointment_time: string }) => x.appointment_time.slice(0, 5)));
    setLoadingSlots(false);
  }, [slug, biz]);

  const handleDateSelect = (date: Date) => {
    setSelDate(date); setSelTime(""); loadSlots(date);
  };

  // Generate time slots from config
  const timeSlots = (() => {
    if (!config) return [];
    const [sh, sm] = config.working_hours_start.split(":").map(Number);
    const [eh, em] = config.working_hours_end.split(":").map(Number);
    const slots: string[] = [];
    let cur = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    while (cur < end) {
      slots.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`);
      cur += HOUR_STEP;
    }
    return slots;
  })();

  if (loadingBiz) return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
    </div>
  );

  if (notFound || !biz) return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-white text-lg font-semibold">Negocio no encontrado</p>
      <p className="text-white/40 text-sm">La URL que ingresaste no corresponde a ningún negocio activo.</p>
    </div>
  );

  const primary = biz.primary_color ?? "#e4c69a";
  const hasPay  = biz.plan !== "basic";

  return (
    <div className="min-h-screen bg-[#0D0D0D]" style={{ "--primary": primary } as React.CSSProperties}>
      {/* ── Header ── */}
      <header className="border-b border-white/5 px-4 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {biz.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={biz.logo_url} alt="logo" className="h-10 w-10 rounded-xl object-contain bg-white/5" />
          ) : (
            <div className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg"
              style={{ background: `${primary}20`, color: primary }}>
              {biz.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-white font-bold text-lg leading-none">{biz.name}</h1>
            {biz.description && <p className="text-white/40 text-xs mt-0.5">{biz.description}</p>}
          </div>
          {/* Social links */}
          <div className="ml-auto flex items-center gap-2">
            {biz.social_links?.instagram && (
              <a href={`https://instagram.com/${biz.social_links.instagram.replace("@","")}`} target="_blank" rel="noreferrer" title="Instagram" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"><LinkIcon className="w-4 h-4" /></a>
            )}
            {biz.social_links?.whatsapp && (
              <a href={`https://wa.me/${biz.social_links.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" title="WhatsApp" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"><Phone className="w-4 h-4" /></a>
            )}
            {biz.social_links?.website && (
              <a href={biz.social_links.website} target="_blank" rel="noreferrer" title="Sitio web" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"><Globe className="w-4 h-4" /></a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Payment view ── */}
        {view === "payment" && service && selDate && selTime && (
          <StripeCheckout
            slug={slug}
            service={service} date={selDate} time={selTime}
            guestName={name} guestEmail={email} guestPhone={phone}
            onSuccess={(c) => { setCode(c); setView("success"); }}
            onBack={() => setView("form")}
          />
        )}

        {/* ── Success view ── */}
        {view === "success" && (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: `${primary}20` }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: primary }} />
            </div>
            <div>
              <h2 className="text-white text-2xl font-bold">¡Turno confirmado!</h2>
              <p className="text-white/40 text-sm mt-1">Te enviamos los detalles a {email}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-5 text-center">
              <p className="text-white/40 text-xs mb-1">Código de confirmación</p>
              <p className="text-3xl font-bold font-mono" style={{ color: primary }}>#{code}</p>
            </div>
            <div className="text-white/40 text-sm space-y-1">
              <p className="capitalize">{selDate && format(selDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
              <p>{selTime} hs · {service?.name}</p>
            </div>
            <button onClick={() => { setSelDate(null); setSelTime(""); setView("form"); }}
              className="text-sm text-white/40 hover:text-white transition-colors mt-2">
              Reservar otro turno
            </button>
          </div>
        )}

        {/* ── Main form view ── */}
        {view === "form" && (
          <div className="space-y-6">
            {/* Service selector */}
            <Section num={1} title="Servicio" active={true}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((s) => (
                  <button key={s.id} onClick={() => { setService(s); setSelDate(null); setSelTime(""); }}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      service?.id === s.id
                        ? "border-[var(--primary)] bg-[var(--primary)]/5"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`} style={{ "--primary": primary } as React.CSSProperties}>
                    <p className="text-white font-medium text-sm">{s.name}</p>
                    <p className="text-white/40 text-xs mt-0.5">{s.duration_minutes} min · <span style={{ color: primary }}>{fmt(s.price)}</span></p>
                    {s.description && <p className="text-white/30 text-xs mt-1">{s.description}</p>}
                  </button>
                ))}
              </div>
            </Section>

            {/* Calendar */}
            <Section num={2} title="Fecha" active={!!service}>
              {service && (
                <BookingCalendar
                  primary={primary}
                  month={month}
                  onMonthChange={setMonth}
                  selDate={selDate}
                  fullyBooked={fullyBooked}
                  workingDays={config?.working_days ?? ["monday","tuesday","wednesday","thursday","friday","saturday"]}
                  onSelect={handleDateSelect}
                />
              )}
            </Section>

            {/* Time */}
            <Section num={3} title="Horario" active={!!selDate}>
              {selDate && (
                loadingSlots ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-white/40 animate-spin" /></div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {timeSlots.length === 0 && <p className="text-white/30 text-sm">Sin horarios disponibles</p>}
                    {timeSlots.map((t) => {
                      const busy = bookedSlots.includes(t);
                      return (
                        <button key={t} disabled={busy} onClick={() => setSelTime(t)}
                          className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                            busy ? "border-white/5 text-white/20 cursor-not-allowed line-through"
                            : selTime === t ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                            : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
                          }`} style={{ "--primary": primary } as React.CSSProperties}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </Section>

            {/* Client data */}
            <Section num={4} title="Tus datos" active={!!selTime}>
              {selTime && (
                <div className="space-y-3">
                  <ClientField Icon={User}  placeholder="Nombre completo" value={name}  onChange={setName}  />
                  <ClientField Icon={Mail}  placeholder="Email"           value={email} onChange={setEmail} type="email" />
                  <ClientField Icon={Phone} placeholder="Teléfono"        value={phone} onChange={setPhone} type="tel" />
                </div>
              )}
            </Section>

            {/* Confirm button */}
            {selTime && name && email && phone && (
              <button
                onClick={() => {
                  if (hasPay) { setView("payment"); }
                  else {
                    // Plan básico: free booking (no payment)
                    const pro = professionals[0];
                    fetch("/api/public/appointments", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        slug,
                        serviceId: service!.id,
                        professionalId: pro?.id,
                        date: selDate ? format(selDate, "yyyy-MM-dd") : "",
                        time: selTime,
                        guestName: name, guestEmail: email, guestPhone: phone,
                      }),
                    })
                      .then((r) => r.json())
                      .then((d) => { if (d.confirmationCode) { setCode(d.confirmationCode); setView("success"); } });
                  }
                }}
                className="w-full py-4 rounded-2xl font-bold text-base text-[#0D0D0D] transition-all hover:opacity-90 hover:shadow-lg"
                style={{ background: `linear-gradient(135deg, ${primary}, ${primary}aa)` }}
              >
                {hasPay ? `Continuar al pago · ${fmt(service?.price ?? 0)}` : "Confirmar turno"}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Section({ num, title, active, children }: { num: number; title: string; active: boolean; children?: React.ReactNode }) {
  return (
    <div className={`bg-white/[0.03] border border-white/10 rounded-2xl p-5 transition-opacity ${active ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-6 h-6 rounded-full bg-white/10 text-white/60 text-xs font-bold flex items-center justify-center">{num}</span>
        <h2 className="text-white font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ClientField({ Icon, placeholder, value, onChange, type = "text" }: {
  Icon: typeof User; placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-all" />
    </div>
  );
}

function BookingCalendar({ primary, month, onMonthChange, selDate, fullyBooked, workingDays, onSelect }: {
  primary: string;
  month: Date;
  onMonthChange: (m: Date) => void;
  selDate: Date | null;
  fullyBooked: string[];
  workingDays: string[];
  onSelect: (d: Date) => void;
}) {
  const today = startOfDay(new Date());
  const days = getDaysInMonth(month);
  const firstDow = getDay(startOfMonth(month));
  const offset = firstDow === 0 ? 6 : firstDow - 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(subMonths(month, 1))}
          className="w-8 h-8 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/20 flex items-center justify-center transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-white text-sm font-medium capitalize">
          {format(month, "MMMM yyyy", { locale: es })}
        </span>
        <button onClick={() => onMonthChange(addMonths(month, 1))}
          className="w-8 h-8 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/20 flex items-center justify-center transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {["Lu","Ma","Mi","Ju","Vi","Sá","Do"].map((d) => (
          <div key={d} className="text-white/30 text-xs py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
          const iso  = format(date, "yyyy-MM-dd");
          const dow  = DAY_KEYS[date.getDay()];
          const past = isBefore(date, today);
          const full = fullyBooked.includes(iso);
          const noWork = !workingDays.includes(dow);
          const disabled = past || full || noWork;
          const isSelected = selDate && format(selDate, "yyyy-MM-dd") === iso;
          const isToday = format(today, "yyyy-MM-dd") === iso;

          return (
            <button key={iso} disabled={disabled} onClick={() => onSelect(date)}
              className={`h-9 w-full rounded-xl text-sm font-medium transition-all ${
                isSelected
                  ? "text-[#0D0D0D] font-bold shadow-lg"
                  : disabled
                    ? full ? "text-white/15 line-through" : "text-white/15"
                    : isToday
                      ? "border border-white/20 text-white hover:bg-white/10"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              style={isSelected ? { background: primary } : {}}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
