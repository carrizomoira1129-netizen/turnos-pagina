"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, Loader2, ArrowLeft, MailCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <MailCheck className="w-16 h-16 text-[#e4c69a]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Email enviado</h2>
          <p className="text-white/50 mb-8">
            Revisá tu bandeja de entrada. Te enviamos un link para restablecer tu contraseña.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[#e4c69a] hover:text-[#e4c69a]/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al login
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
          <h2 className="text-xl font-semibold text-white mb-2">Recuperar contraseña</h2>
          <p className="text-white/40 text-sm mb-6">
            Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e4c69a] hover:bg-[#d4b68a] disabled:opacity-50 disabled:cursor-not-allowed text-[#0D0D0D] font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar link de recuperación"
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}
