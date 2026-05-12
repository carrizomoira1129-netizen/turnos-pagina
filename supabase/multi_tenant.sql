-- ============================================================================
-- TurnosPro — Multi-tenant SaaS Migration
-- Ejecutar DESPUÉS de schema.sql, public_booking.sql, stripe_payments.sql,
-- notifications.sql
-- ============================================================================

-- 1) Tabla businesses (raíz de cada tenant)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  niche TEXT,                              -- dentista, barbería, spa, etc.
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#e4c69a',
  secondary_color TEXT DEFAULT '#0D0D0D',
  social_links JSONB DEFAULT '{}'::jsonb,   -- { instagram, facebook, whatsapp, website }
  plan TEXT NOT NULL DEFAULT 'basic'
    CHECK (plan IN ('basic','pro','premium')),
  plan_status TEXT NOT NULL DEFAULT 'active'
    CHECK (plan_status IN ('active','past_due','cancelled')),
  subscription_started_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_plan ON businesses(plan, plan_status);

-- 2) Flag de super admin en profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_profiles_business ON profiles(business_id);

-- 3) Negocio default para preservar datos existentes
INSERT INTO businesses (id, slug, name, email, niche, plan)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'default',
  COALESCE((SELECT name FROM business_config LIMIT 1), 'Negocio principal'),
  'admin@turnospro.local',
  'general',
  'premium'
WHERE NOT EXISTS (
  SELECT 1 FROM businesses WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- 4) Agregar business_id a todas las tablas de dominio + backfill al default
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
UPDATE services SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE services ALTER COLUMN business_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
UPDATE professionals SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE professionals ALTER COLUMN business_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_professionals_business ON professionals(business_id);

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
UPDATE appointments SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE appointments ALTER COLUMN business_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments(business_id);

ALTER TABLE business_config
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
UPDATE business_config SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_config_business ON business_config(business_id);

-- notification_settings y notification_logs también
-- (drop el check id=1 singleton para permitir una fila por business)
ALTER TABLE notification_settings DROP CONSTRAINT IF EXISTS notification_settings_id_check;
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
UPDATE notification_settings SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_business ON notification_settings(business_id);

ALTER TABLE notification_logs
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
UPDATE notification_logs SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;

-- Backfill admin profiles existentes hacia el default business
UPDATE profiles
SET business_id = '00000000-0000-0000-0000-000000000001'
WHERE business_id IS NULL AND role = 'admin';

-- ============================================================================
-- 5) Helpers SECURITY DEFINER (corren con permisos de owner — bypass RLS)
-- ============================================================================

-- Resolver business por slug (público — para landing y endpoints públicos)
CREATE OR REPLACE FUNCTION get_business_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID, slug TEXT, name TEXT, niche TEXT, description TEXT, phone TEXT, address TEXT,
  logo_url TEXT, primary_color TEXT, secondary_color TEXT, social_links JSONB, plan TEXT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT b.id, b.slug, b.name, b.niche, b.description, b.phone, b.address,
         b.logo_url, b.primary_color, b.secondary_color, b.social_links, b.plan
  FROM businesses b
  WHERE b.slug = p_slug AND b.plan_status = 'active';
$$;

-- Servicios activos de un business (público)
CREATE OR REPLACE FUNCTION get_business_services(p_business_id UUID)
RETURNS TABLE (id UUID, name TEXT, description TEXT, duration_minutes INTEGER, price DECIMAL)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, name, description, duration_minutes, price
  FROM services
  WHERE business_id = p_business_id AND is_active = TRUE
  ORDER BY price ASC;
$$;

-- Profesionales de un business (público)
CREATE OR REPLACE FUNCTION get_business_professionals(p_business_id UUID)
RETURNS TABLE (id UUID, name TEXT, specialty TEXT, photo_url TEXT)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, name, specialty, photo_url
  FROM professionals
  WHERE business_id = p_business_id AND is_active = TRUE
  ORDER BY created_at ASC;
$$;

-- Slots ocupados de un business en una fecha
DROP FUNCTION IF EXISTS get_booked_slots(DATE);
CREATE OR REPLACE FUNCTION get_booked_slots(p_business_id UUID, p_date DATE)
RETURNS TABLE (appointment_time TIME)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT a.appointment_time
  FROM appointments a
  WHERE a.business_id = p_business_id
    AND a.appointment_date = p_date
    AND a.status IN ('pending','confirmed');
$$;

-- Fechas completas del mes (para deshabilitarlas en el calendario)
DROP FUNCTION IF EXISTS get_fully_booked_dates(INT, INT);
CREATE OR REPLACE FUNCTION get_fully_booked_dates(
  p_business_id UUID, p_year INT, p_month INT
)
RETURNS TABLE (full_date DATE)
LANGUAGE sql SECURITY DEFINER AS $$
  -- Asume 8 horarios disponibles por día (10:00–17:00)
  SELECT a.appointment_date
  FROM appointments a
  WHERE a.business_id = p_business_id
    AND a.status IN ('pending','confirmed')
    AND EXTRACT(YEAR  FROM a.appointment_date) = p_year
    AND EXTRACT(MONTH FROM a.appointment_date) = p_month
  GROUP BY a.appointment_date
  HAVING COUNT(*) >= 8;
$$;

-- Crear appointment guest (ahora ligado a business)
DROP FUNCTION IF EXISTS create_guest_appointment(UUID,UUID,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,DECIMAL);
CREATE OR REPLACE FUNCTION create_guest_appointment(
  p_business_id UUID,
  p_service_id UUID,
  p_professional_id UUID,
  p_date DATE,
  p_time TEXT,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_payment_intent_id TEXT,
  p_payment_amount DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE business_id = p_business_id
      AND appointment_date = p_date
      AND appointment_time = p_time::TIME
      AND status IN ('pending','confirmed')
  ) THEN
    RAISE EXCEPTION 'Ese horario ya está reservado';
  END IF;

  INSERT INTO appointments (
    business_id, service_id, professional_id, appointment_date, appointment_time,
    guest_name, guest_email, guest_phone,
    stripe_payment_intent_id, payment_amount, payment_status, status
  ) VALUES (
    p_business_id, p_service_id, p_professional_id, p_date, p_time::TIME,
    p_guest_name, p_guest_email, p_guest_phone,
    p_payment_intent_id, p_payment_amount, 'paid', 'confirmed'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Permisos para anon (página pública)
GRANT EXECUTE ON FUNCTION get_business_by_slug(TEXT)                          TO anon;
GRANT EXECUTE ON FUNCTION get_business_services(UUID)                         TO anon;
GRANT EXECUTE ON FUNCTION get_business_professionals(UUID)                    TO anon;
GRANT EXECUTE ON FUNCTION get_booked_slots(UUID, DATE)                        TO anon;
GRANT EXECUTE ON FUNCTION get_fully_booked_dates(UUID, INT, INT)              TO anon;
GRANT EXECUTE ON FUNCTION create_guest_appointment(
  UUID, UUID, UUID, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL)              TO anon;

-- ============================================================================
-- 6) Storage: bucket para logos
-- ============================================================================
-- En Supabase Dashboard → Storage → New bucket:
--   Name: business-assets
--   Public: YES
-- O ejecutar:
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policy: cualquier authenticated puede leer; sólo el owner del business puede escribir
DROP POLICY IF EXISTS "Public read business-assets" ON storage.objects;
CREATE POLICY "Public read business-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "Authenticated write business-assets" ON storage.objects;
CREATE POLICY "Authenticated write business-assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "Authenticated update business-assets" ON storage.objects;
CREATE POLICY "Authenticated update business-assets" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'business-assets');
