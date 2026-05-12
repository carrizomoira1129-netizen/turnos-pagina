"use client";

import { useEffect, useState } from "react";
import {
  Settings, Briefcase, Clock, Building2,
  Plus, Pencil, Trash2, Check, X, Loader2, Save,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Service {
  id: string; name: string; description: string;
  duration_minutes: number; price: number; is_active: boolean;
}
interface Config {
  id?: string; name: string; phone: string; email: string; address: string;
  working_days: string[]; working_hours_start: string; working_hours_end: string;
}
type Tab = "negocio" | "servicios" | "horarios";

const ALL_DAYS = [
  { key: "monday",    label: "Lunes"    },
  { key: "tuesday",   label: "Martes"   },
  { key: "wednesday", label: "Miércoles"},
  { key: "thursday",  label: "Jueves"   },
  { key: "friday",    label: "Viernes"  },
  { key: "saturday",  label: "Sábado"   },
  { key: "sunday",    label: "Domingo"  },
];

function fmt(n: number) { return `$${n.toLocaleString("es-AR")}`; }

// ─── Service row ──────────────────────────────────────────────────────────────
function ServiceRow({ svc, onSaved, onDeleted }: {
  svc: Service;
  onSaved:   (s: Service) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({ name: svc.name, description: svc.description ?? "", duration_minutes: svc.duration_minutes, price: svc.price, is_active: svc.is_active });
  const [saving,  setSaving]  = useState(false);
  const [deleting,setDeleting]= useState(false);

  const save = async () => {
    setSaving(true);
    const r = await fetch(`/api/admin/services/${svc.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const d = await r.json();
    if (r.ok) { onSaved(d.service); setEditing(false); }
    setSaving(false);
  };

  const del = async () => {
    if (!confirm("¿Eliminar este servicio?")) return;
    setDeleting(true);
    await fetch(`/api/admin/services/${svc.id}`, { method: "DELETE" });
    onDeleted(svc.id);
  };

  if (editing) {
    return (
      <div className="p-4 bg-[#e4c69a]/5 border border-[#e4c69a]/20 rounded-xl space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-white/40 text-xs mb-1 block">Nombre</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40 transition-all" />
          </div>
          <div className="col-span-2">
            <label className="text-white/40 text-xs mb-1 block">Descripción</label>
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40 transition-all" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Duración (min)</label>
            <input type="number" value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: +e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40 transition-all" />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Precio ($)</label>
            <input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: +e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40 transition-all" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e4c69a] text-[#0D0D0D] text-sm font-semibold hover:bg-[#d4b68a] transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Guardar
          </button>
          <button onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:text-white transition-all">
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/10 rounded-xl hover:border-white/20 transition-all">
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm">{svc.name}</p>
        <p className="text-white/40 text-xs mt-0.5">{svc.description}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-white/30 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{svc.duration_minutes} min</span>
          <span className="text-[#e4c69a] text-xs font-semibold">{fmt(svc.price)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={() => setEditing(true)}
          className="w-8 h-8 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={del} disabled={deleting}
          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400/50 hover:text-red-400 hover:bg-red-500/15 flex items-center justify-center transition-all disabled:opacity-40">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── New service form ─────────────────────────────────────────────────────────
function NewServiceForm({ onCreated }: { onCreated: (s: Service) => void }) {
  const [open,  setOpen]  = useState(false);
  const [form,  setForm]  = useState({ name: "", description: "", duration_minutes: 60, price: 0 });
  const [saving,setSaving]= useState(false);

  const create = async () => {
    if (!form.name) return;
    setSaving(true);
    const r = await fetch("/api/admin/services", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const d = await r.json();
    if (r.ok) { onCreated(d.service); setOpen(false); setForm({ name: "", description: "", duration_minutes: 60, price: 0 }); }
    setSaving(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white hover:border-white/20 text-sm transition-all">
        <Plus className="w-4 h-4" /> Agregar servicio
      </button>
    );
  }

  return (
    <div className="p-4 border border-[#e4c69a]/20 rounded-xl bg-[#e4c69a]/5 space-y-3">
      <p className="text-white text-sm font-semibold">Nuevo servicio</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-white/40 text-xs mb-1 block">Nombre *</label>
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ej: Consulta General"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40 transition-all" />
        </div>
        <div className="col-span-2">
          <label className="text-white/40 text-xs mb-1 block">Descripción</label>
          <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Breve descripción"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40 transition-all" />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">Duración (min)</label>
          <input type="number" value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: +e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40 transition-all" />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">Precio ($)</label>
          <input type="number" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: +e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40 transition-all" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={create} disabled={saving || !form.name}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e4c69a] text-[#0D0D0D] text-sm font-semibold hover:bg-[#d4b68a] transition-all disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Crear
        </button>
        <button onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:text-white transition-all">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const [tab,      setTab]      = useState<Tab>("negocio");
  const [services, setServices] = useState<Service[]>([]);
  const [config,   setConfig]   = useState<Config>({
    name: "", phone: "", email: "", address: "",
    working_days: ["monday","tuesday","wednesday","thursday","friday","saturday"],
    working_hours_start: "10:00", working_hours_end: "18:00",
  });
  const [loadingSvc, setLoadingSvc]   = useState(true);
  const [loadingCfg, setLoadingCfg]   = useState(true);
  const [savingCfg,  setSavingCfg]    = useState(false);
  const [cfgSaved,   setCfgSaved]     = useState(false);

  useEffect(() => {
    fetch("/api/admin/services").then((r) => r.json()).then((d) => { setServices(d.services ?? []); setLoadingSvc(false); });
    fetch("/api/admin/config").then((r) => r.json()).then((d) => { if (d.config) setConfig(d.config); setLoadingCfg(false); });
  }, []);

  const toggleDay = (key: string) =>
    setConfig((p) => ({
      ...p,
      working_days: p.working_days.includes(key)
        ? p.working_days.filter((d) => d !== key)
        : [...p.working_days, key],
    }));

  const saveConfig = async () => {
    setSavingCfg(true);
    await fetch("/api/admin/config", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
    });
    setSavingCfg(false);
    setCfgSaved(true);
    setTimeout(() => setCfgSaved(false), 2500);
  };

  const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: "negocio",   label: "Negocio",   Icon: Building2 },
    { key: "servicios", label: "Servicios", Icon: Briefcase },
    { key: "horarios",  label: "Horarios",  Icon: Clock     },
  ];

  return (
    <div className="pt-14 md:pt-0 p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-white/40 text-sm mt-1">Gestioná los datos del negocio, servicios y horarios</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-2xl p-1 w-fit mb-6">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === key
                ? "bg-[#e4c69a]/10 text-[#e4c69a] border border-[#e4c69a]/20"
                : "text-white/40 hover:text-white"
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl">
        {/* ── Negocio ── */}
        {tab === "negocio" && (
          <div className="space-y-4">
            {loadingCfg ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-[#e4c69a] animate-spin" /></div>
            ) : (
              <>
                {[
                  { key: "name",    label: "Nombre del negocio",  placeholder: "TurnosPro"            },
                  { key: "phone",   label: "Teléfono",             placeholder: "+54 11 0000-0000"     },
                  { key: "email",   label: "Email de contacto",    placeholder: "info@negocio.com"     },
                  { key: "address", label: "Dirección",            placeholder: "Calle 123, Ciudad"    },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm text-white/50 mb-1.5">{label}</label>
                    <input
                      value={(config as unknown as Record<string, string>)[key] ?? ""}
                      onChange={(e) => setConfig((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e4c69a]/40 transition-all"
                    />
                  </div>
                ))}
                <button onClick={saveConfig} disabled={savingCfg}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e4c69a] text-[#0D0D0D] font-semibold text-sm hover:bg-[#d4b68a] transition-all disabled:opacity-50">
                  {savingCfg ? <Loader2 className="w-4 h-4 animate-spin" /> : cfgSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {cfgSaved ? "¡Guardado!" : "Guardar cambios"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Servicios ── */}
        {tab === "servicios" && (
          <div className="space-y-3">
            {loadingSvc ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-[#e4c69a] animate-spin" /></div>
            ) : (
              <>
                {services.map((s) => (
                  <ServiceRow key={s.id} svc={s}
                    onSaved={(updated) => setServices((p) => p.map((x) => x.id === updated.id ? updated : x))}
                    onDeleted={(id) => setServices((p) => p.filter((x) => x.id !== id))}
                  />
                ))}
                <NewServiceForm onCreated={(s) => setServices((p) => [...p, s])} />
              </>
            )}
          </div>
        )}

        {/* ── Horarios ── */}
        {tab === "horarios" && (
          <div className="space-y-6">
            {loadingCfg ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-[#e4c69a] animate-spin" /></div>
            ) : (
              <>
                {/* Working days */}
                <div>
                  <p className="text-white font-medium mb-3 text-sm">Días laborables</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_DAYS.map(({ key, label }) => {
                      const active = config.working_days.includes(key);
                      return (
                        <button key={key} onClick={() => toggleDay(key)}
                          className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                            active
                              ? "bg-[#e4c69a]/10 border-[#e4c69a]/30 text-[#e4c69a]"
                              : "bg-white/[0.02] border-white/10 text-white/30 hover:text-white hover:border-white/20"
                          }`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Working hours */}
                <div>
                  <p className="text-white font-medium mb-3 text-sm">Horario de atención</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Apertura</label>
                      <input type="time" value={config.working_hours_start}
                        onChange={(e) => setConfig((p) => ({ ...p, working_hours_start: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40 transition-all [color-scheme:dark]" />
                    </div>
                    <span className="text-white/30 mt-4">–</span>
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Cierre</label>
                      <input type="time" value={config.working_hours_end}
                        onChange={(e) => setConfig((p) => ({ ...p, working_hours_end: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40 transition-all [color-scheme:dark]" />
                    </div>
                  </div>
                </div>

                <button onClick={saveConfig} disabled={savingCfg}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e4c69a] text-[#0D0D0D] font-semibold text-sm hover:bg-[#d4b68a] transition-all disabled:opacity-50">
                  {savingCfg ? <Loader2 className="w-4 h-4 animate-spin" /> : cfgSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {cfgSaved ? "¡Guardado!" : "Guardar horarios"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
