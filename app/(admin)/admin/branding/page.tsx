"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Palette, Upload, Loader2, Save, Check, Globe,
  Link as LinkIcon, Phone, Building2, Sparkles,
} from "lucide-react";

interface Business {
  id: string; slug: string; name: string; niche: string;
  description: string; phone: string; address: string;
  logo_url: string | null;
  primary_color: string; secondary_color: string;
  social_links: Record<string, string>;
  plan: string;
}

export default function BrandingPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [biz, setBiz]       = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch("/api/admin/business")
      .then((r) => r.json())
      .then((d) => setBiz(d.business))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !biz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 text-[#e4c69a] animate-spin" />
      </div>
    );
  }

  const update = <K extends keyof Business>(k: K, v: Business[K]) =>
    setBiz((p) => p ? { ...p, [k]: v } : p);

  const updateSocial = (k: string, v: string) => {
    setBiz((p) => p ? { ...p, social_links: { ...p.social_links, [k]: v } } : p);
  };

  const save = async () => {
    setSaving(true); setError("");
    const r = await fetch("/api/admin/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: biz.name, niche: biz.niche, phone: biz.phone, address: biz.address,
        description: biz.description,
        primary_color: biz.primary_color, secondary_color: biz.secondary_color,
        social_links: biz.social_links,
      }),
    });
    const d = await r.json();
    if (!r.ok) setError(d.error ?? "Error al guardar");
    else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true); setError("");
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/admin/business/logo", { method: "POST", body: fd });
    const d = await r.json();
    if (!r.ok) setError(d.error ?? "Error al subir");
    else update("logo_url", d.logo_url);
    setUploading(false);
  };

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/negocio/${biz.slug}`;

  return (
    <div className="pt-14 md:pt-0 p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Branding</h1>
        <p className="text-white/40 text-sm mt-1">
          Personalizá tu página pública de reservas
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Public URL */}
      <div className="bg-[#e4c69a]/5 border border-[#e4c69a]/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <Globe className="w-4 h-4 text-[#e4c69a]" />
          <span className="text-white/70 text-sm">Tu URL pública:</span>
          <a href={publicUrl} target="_blank" rel="noreferrer"
            className="text-[#e4c69a] font-mono text-sm hover:underline truncate">
            {publicUrl}
          </a>
        </div>
      </div>

      {/* Logo */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#e4c69a]" />
          <h2 className="text-white font-semibold">Logo</h2>
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {biz.logo_url ? (
              <Image src={biz.logo_url} alt="logo" width={96} height={96} className="object-contain w-full h-full" unoptimized />
            ) : (
              <Building2 className="w-8 h-8 text-white/20" />
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Subir logo
            </button>
            <p className="text-white/30 text-xs mt-2">PNG, JPG o SVG. Máximo 2MB.</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Información del negocio</h2>
        <Input label="Nombre" value={biz.name} onChange={(v) => update("name", v)} />
        <Input label="Rubro"  value={biz.niche ?? ""} onChange={(v) => update("niche", v)} />
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Descripción</label>
          <textarea
            value={biz.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            placeholder="Una descripción corta que verán los clientes"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e4c69a]/40 resize-none"
          />
        </div>
        <Input label="Teléfono"  value={biz.phone ?? ""}   onChange={(v) => update("phone", v)} />
        <Input label="Dirección" value={biz.address ?? ""} onChange={(v) => update("address", v)} />
      </div>

      {/* Colors */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-[#e4c69a]" />
          <h2 className="text-white font-semibold">Colores</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorField label="Color primario"   value={biz.primary_color}   onChange={(v) => update("primary_color", v)} />
          <ColorField label="Color secundario" value={biz.secondary_color} onChange={(v) => update("secondary_color", v)} />
        </div>
      </div>

      {/* Social */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Redes sociales</h2>
        <SocialInput Icon={LinkIcon} label="Instagram" value={biz.social_links?.instagram ?? ""} onChange={(v) => updateSocial("instagram", v)} placeholder="@minegocio" />
        <SocialInput Icon={Phone}    label="WhatsApp"  value={biz.social_links?.whatsapp  ?? ""} onChange={(v) => updateSocial("whatsapp", v)}  placeholder="+54 11 0000-0000" />
        <SocialInput Icon={Globe}    label="Website"   value={biz.social_links?.website   ?? ""} onChange={(v) => updateSocial("website", v)}   placeholder="https://..." />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e4c69a] text-[#0D0D0D] font-semibold text-sm hover:bg-[#d4b68a] transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "¡Guardado!" : "Guardar cambios"}
      </button>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1.5">{label}</label>
      <input
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#e4c69a]/40"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-lg bg-transparent border border-white/10 cursor-pointer"
        />
        <input
          value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#e4c69a]/40"
        />
      </div>
    </div>
  );
}

function SocialInput({ Icon, label, value, onChange, placeholder }: {
  Icon: typeof Globe; label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#e4c69a]" />
      </div>
      <div className="flex-1">
        <label className="block text-xs text-white/50 mb-0.5">{label}</label>
        <input
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-transparent border-b border-white/10 px-1 py-1.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e4c69a]/40"
        />
      </div>
    </div>
  );
}
