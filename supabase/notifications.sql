-- ============================================================================
-- TurnosPro — Sistema de Notificaciones (WhatsApp + Email backup)
-- ============================================================================

-- 1) Tabla de configuración (singleton row id=1)
CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  confirmation_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_24h_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_1h_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  email_backup_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO notification_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2) Log de notificaciones enviadas
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('confirmation','reminder_24h','reminder_1h')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','email')),
  status TEXT NOT NULL CHECK (status IN ('sent','failed','read')),
  recipient TEXT NOT NULL,
  message TEXT,
  error TEXT,
  provider_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_appt ON notification_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);

-- 3) Flags en appointments para evitar reenvíos
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS confirmation_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guest_phone_e164    TEXT;

-- Service role tiene acceso completo (sin RLS necesario para estas tablas
-- ya que sólo se acceden desde el backend con la service key).
ALTER TABLE notification_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs DISABLE ROW LEVEL SECURITY;
