"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type Plan } from "@/lib/plans";
import {
  Building2, Mail, Lock, Phone, MapPin, Briefcase, Eye, EyeOff,
  CheckCircle2, Loader2, ArrowRight, Sparkles,
} from "lucide-react";

const NICHES = [
  "Dentista","Barbería","Peluquería","Spa","Estética","Masajes",
  "Estudio Jurídico","Consultorio Médico","Veterinaria","Otro",
];

export default function RegistroNegocioPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    businessName: "",
    niche: NICHES[0],
    email: "",
    password: "",
    phone: "",
    address: "",
    plan: "basic" as Plan,
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/business/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Error al registrar");

      // Auto sign-in
      const supabase = createClient();
      const { error: sErr } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password,
      });
      if (sErr) throw sErr;

      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/login" className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-[#e4c69a]" />
            <span className="text-white font-bold text-xl">TurnosPro</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Registrá tu negocio</h1>
          <p className="text-white/40 text-sm mt-2">
            Activá tu sistema profesional de reservas en menos de 2 minutos
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((n) => (
            <div key={n} className={`h-1 w-16 rounded-full transition-all ${
              step >= n ? "bg-[#e4c69a]" : "bg-white/10"
            }`} />
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Step 1: business info ── */}
        {step === 1 && (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold mb-4">Datos del negocio</h2>

            <Field label="Nombre del negocio" Icon={Building2}>
              <input
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
                placeholder="Ej: Barbería Central"
                className="input"
              />
            </Field>

            <Field label="Rubro" Icon={Briefcase}>
              <select
                value={form.niche}
                onChange={(e) => update("niche", e.target.value)}
                className="input"
              >
                {NICHES.map((n) => <option key={n} value={n} className="bg-[#0D0D0D]">{n}</option>)}
              </select>
            </Field>

            <Field label="Email del administrador" Icon={Mail}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="admin@minegocio.com"
                className="input"
              />
            </Field>

            <Field label="Contraseña (mín. 6 caracteres)" Icon={Lock}>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className="input pr-10"
                />
                <button type="button" onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <Field label="Teléfono" Icon={Phone}>
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+54 11 0000-0000"
                className="input"
              />
            </Field>

            <Field label="Dirección" Icon={MapPin}>
              <input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Calle 123, Ciudad"
                className="input"
              />
            </Field>

            <button
              onClick={() => {
                if (!form.businessName || !form.email || form.password.length < 6) {
                  setError("Completá nombre, email y contraseña (mín. 6 chars).");
                  return;
                }
                setError(""); setStep(2);
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#e4c69a] text-[#0D0D0D] font-semibold hover:bg-[#d4b68a] transition-all"
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 2: plan selection ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold text-center mb-4">Elegí tu plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(PLANS).map((p) => {
                const selected = form.plan === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => update("plan", p.id)}
                    className={`text-left p-5 rounded-2xl border-2 transition-all ${
                      selected
                        ? "border-[#e4c69a] bg-[#e4c69a]/5"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <p className="text-white font-bold text-lg">{p.name}</p>
                    <p className="text-[#e4c69a] text-2xl font-bold mt-1">
                      ${p.price.toLocaleString("es-AR")}
                      <span className="text-white/30 text-xs font-normal">/mes</span>
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {p.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-1.5 text-xs text-white/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#e4c69a] flex-shrink-0 mt-0.5" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-5 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
              >
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#e4c69a] to-[#d4b68a] text-[#0D0D0D] font-semibold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Crear negocio
              </button>
            </div>
          </div>
        )}

        <p className="text-center mt-6 text-white/30 text-xs">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-[#e4c69a] hover:underline">Iniciar sesión</Link>
        </p>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        :global(.input:focus) { border-color: rgba(228,198,154,0.4); }
        :global(.input::placeholder) { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

function Field({ label, Icon, children }: { label: string; Icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs text-white/50 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}
