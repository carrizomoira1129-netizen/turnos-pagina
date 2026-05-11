"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-[#e4c69a]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">¡Cuenta creada!</h2>
          <p className="text-white/50 mb-8">
            Revisá tu email para confirmar tu cuenta y luego podés iniciar sesión.
          </p>
          <Link
            href="/login"
            className="inline-block bg-[#e4c69a] hover:bg-[#d4b68a] text-[#0D0D0D] font-semibold px-8 py-3 rounded-xl transition-all"
          >
            Ir al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#e4c69a]/10 border border-[#e4c69a]/30 flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-[#e4c69a]" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TurnosPro</h1>
          <p className="text-white/40 text-sm mt-1">Sistema de reserva de turnos</p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Crear cuenta</h2>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Juan Pérez"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e4c69a]/50 focus:ring-1 focus:ring-[#e4c69a]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e4c69a]/50 focus:ring-1 focus:ring-[#e4c69a]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e4c69a]/50 focus:ring-1 focus:ring-[#e4c69a]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e4c69a] hover:bg-[#d4b68a] disabled:opacity-50 disabled:cursor-not-allowed text-[#0D0D0D] font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-sm mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-[#e4c69a] hover:text-[#e4c69a]/80 transition-colors">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
