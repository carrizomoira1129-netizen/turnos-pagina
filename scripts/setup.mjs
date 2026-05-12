#!/usr/bin/env node
// scripts/setup.mjs
// Ejecutar UNA sola vez luego de supabase/multi_tenant.sql:
//   node scripts/setup.mjs
//
// ¿Qué hace?
//  1. Crea el bucket "business-assets" en Supabase Storage (público)
//  2. Marca is_super_admin = true para todos los perfiles con role = 'admin'

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Leer .env.local ──────────────────────────────────────────────────────────
function readEnv() {
  const path = resolve(__dir, "../.env.local");
  const raw  = readFileSync(path, "utf8");
  const env  = {};
  for (const line of raw.split("\n")) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;
    const idx = clean.indexOf("=");
    if (idx === -1) continue;
    const key = clean.slice(0, idx).trim();
    const val = clean.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
  return env;
}

const env = readEnv();
const SUPABASE_URL      = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || SUPABASE_URL.startsWith("your_")) {
  console.error("❌  Faltan credenciales en .env.local");
  console.error("    Completá NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY primero.");
  process.exit(1);
}

const headers = {
  "Content-Type":  "application/json",
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "apikey":        SERVICE_ROLE_KEY,
};

// ── 1. Crear bucket business-assets ─────────────────────────────────────────
async function createBucket() {
  const url = `${SUPABASE_URL}/storage/v1/bucket`;

  // Ver si ya existe
  const listRes = await fetch(url, { headers });
  const buckets = await listRes.json();
  if (Array.isArray(buckets) && buckets.find((b) => b.name === "business-assets")) {
    console.log("ℹ️   Bucket 'business-assets' ya existe — OK");
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id:     "business-assets",
      name:   "business-assets",
      public: true,
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log("✅  Bucket 'business-assets' creado (público)");
  } else {
    // "already exists" es OK
    if (data?.error === "The resource already exists") {
      console.log("ℹ️   Bucket 'business-assets' ya existe — OK");
    } else {
      console.error("❌  Error al crear bucket:", data);
      process.exit(1);
    }
  }
}

// ── 2. Marcar is_super_admin = true ─────────────────────────────────────────
async function markSuperAdmin() {
  // Buscar todos los perfiles con role = 'admin'
  const selectUrl = `${SUPABASE_URL}/rest/v1/profiles?role=eq.admin&select=id,full_name`;
  const res = await fetch(selectUrl, { headers });
  const profiles = await res.json();

  if (!Array.isArray(profiles) || profiles.length === 0) {
    console.log("⚠️   No se encontraron perfiles con role='admin'.");
    console.log("    Registrá tu negocio primero en /registro-negocio.");
    return;
  }

  for (const p of profiles) {
    const patchUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${p.id}`;
    const patchRes = await fetch(patchUrl, {
      method:  "PATCH",
      headers: { ...headers, "Prefer": "return=minimal" },
      body:    JSON.stringify({ is_super_admin: true }),
    });

    if (patchRes.ok || patchRes.status === 204) {
      console.log(`✅  Super admin activado para: ${p.full_name ?? p.id}`);
    } else {
      const err = await patchRes.text();
      console.error(`❌  Error actualizando ${p.id}:`, err);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log("🚀  TurnosPro — Setup inicial\n");

try {
  await createBucket();
  await markSuperAdmin();
  console.log("\n✨  Setup completado. Podés acceder a /super-admin con tu usuario admin.");
} catch (err) {
  console.error("❌  Error inesperado:", err.message);
  process.exit(1);
}
