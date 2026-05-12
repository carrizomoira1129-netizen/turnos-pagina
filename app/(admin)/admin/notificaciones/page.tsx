"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell, MessageCircle, Mail, Clock, CheckCircle2, XCircle,
  Loader2, Save, Check, AlertCircle, Hash,
} from "lucide-react";

interface Settings {
  confirmation_enabled: boolean;
  reminder_24h_enabled: boolean;
  reminder_1h_enabled: boolean;
  email_backup_enabled: boolean;
}

interface Log {
  id: string;
  appointment_id: string;
  type: "confirmation" | "reminder_24h" | "reminder_1h";
  channel: "whatsapp" | "email";
  status: "sent" | "failed" | "read";
  recipient: string;
  message: string;
  error: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<Log["type"], string> = {
  confirmation: "Confirmación",
  reminder_24h: "Recordatorio 24h",
  reminder_1h:  "Recordatorio 1h",
};

const TOGGLES: Array<{ key: keyof Settings; label: string; desc: string; Icon: typeof Bell }> = [
  { key: "confirmation_enabled", label: "Confirmación inmediata",
    desc: "Enviar WhatsApp ni bien se confirma la reserva", Icon: CheckCircle2 },
  { key: "reminder_24h_enabled", label: "Recordatorio 24 horas antes",
    desc: "Aviso el día anterior al turno", Icon: Clock },
  { key: "reminder_1h_enabled",  label: "Recordatorio 1 hora antes",
    desc: "Último aviso antes del turno", Icon: Bell },
  { key: "email_backup_enabled", label: "Email de respaldo",
    desc: "Si WhatsApp falla, enviar por email automáticamente", Icon: Mail },
];

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${
        on ? "bg-[#e4c69a]" : "bg-white/10"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function NotificacionesPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logs, setLogs]         = useState<Log[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/notifications/settings").then((r) => r.json()),
      fetch("/api/admin/notifications/logs").then((r) => r.json()),
    ])
      .then(([s, l]) => { setSettings(s); setLogs(l.logs ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: keyof Settings, v: boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: v });
    setSaved(false);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const r = await fetch("/api/admin/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const stats = {
    sent:   logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-14 md:pt-0 p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
        <p className="text-white/40 text-sm mt-1">
          WhatsApp automático para tus clientes — con email de respaldo
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-xs">Enviadas</p>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.sent}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-xs">Fallidas</p>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.failed}</p>
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-white font-semibold">Configuración de envíos</h2>
        </div>
        <div className="divide-y divide-white/5">
          {TOGGLES.map(({ key, label, desc, Icon }) => (
            <div key={key} className="px-6 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-[#e4c69a]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-white/40 text-xs mt-0.5">{desc}</p>
              </div>
              <Toggle on={!!settings?.[key]} onChange={(v) => toggle(key, v)} />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-white/5">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e4c69a] text-[#0D0D0D] font-semibold text-sm hover:bg-[#d4b68a] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" />
              : saved ? <Check className="w-4 h-4" />
              : <Save className="w-4 h-4" />}
            {saved ? "¡Guardado!" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white font-semibold">Historial de notificaciones</h2>
          <span className="text-white/30 text-xs">últimas {logs.length}</span>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">Todavía no se enviaron notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
            {logs.map((l) => {
              const sent   = l.status === "sent";
              const failed = l.status === "failed";
              const cls = sent
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : failed
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-400";
              return (
                <div key={l.id} className="px-6 py-3 flex items-center gap-4 flex-wrap hover:bg-white/[0.02]">
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${cls}`}>
                    {sent ? <CheckCircle2 className="w-3 h-3" /> : failed ? <XCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {sent ? "Enviado" : failed ? "Fallido" : "Leído"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white/40 flex-shrink-0">
                    {l.channel === "whatsapp"
                      ? <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                      : <Mail className="w-3.5 h-3.5 text-blue-400" />}
                    {l.channel === "whatsapp" ? "WhatsApp" : "Email"}
                  </span>
                  <span className="text-white/50 text-xs flex-shrink-0">{TYPE_LABEL[l.type]}</span>
                  <span className="text-white/30 text-xs font-mono flex-shrink-0">{l.recipient}</span>
                  <span className="flex items-center gap-1 text-white/20 text-xs font-mono flex-shrink-0">
                    <Hash className="w-3 h-3" />
                    {l.appointment_id?.split("-")[0].toUpperCase()}
                  </span>
                  <span className="text-white/30 text-xs ml-auto flex-shrink-0">
                    {format(parseISO(l.created_at), "d MMM HH:mm", { locale: es })}
                  </span>
                  {failed && l.error && (
                    <p className="w-full text-red-400/70 text-xs pl-1">{l.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cron instructions */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-white/60 space-y-1.5">
            <p className="font-medium text-white/80">Configuración de recordatorios automáticos</p>
            <p>Los recordatorios se envían desde un endpoint de cron. Configurá un cron job que llame cada 15 minutos a:</p>
            <code className="block bg-black/30 rounded px-2 py-1 text-[#e4c69a] font-mono text-xs">
              GET /api/cron/reminders<br />
              Authorization: Bearer $CRON_SECRET
            </code>
            <p className="text-white/40">Recomendado: Vercel Cron, GitHub Actions, o cron-job.org</p>
          </div>
        </div>
      </div>
    </div>
  );
}
