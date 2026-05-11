-- Stripe payments migration
-- Run AFTER schema.sql and public_booking.sql

-- 1. Add payment columns to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status           TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','refunded','failed')),
  ADD COLUMN IF NOT EXISTS payment_amount           DECIMAL(10,2);

-- 2. Drop old create_guest_appointment (different signature)
DROP FUNCTION IF EXISTS create_guest_appointment(UUID, DATE, TEXT, TEXT, TEXT, TEXT);

-- 3. Updated create_guest_appointment with professional + payment support
CREATE OR REPLACE FUNCTION create_guest_appointment(
  p_service_id          UUID,
  p_professional_id     UUID,
  p_date                DATE,
  p_time                TEXT,
  p_guest_name          TEXT,
  p_guest_email         TEXT,
  p_guest_phone         TEXT,
  p_payment_intent_id   TEXT    DEFAULT NULL,
  p_payment_amount      DECIMAL DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   UUID;
  v_time TIME := p_time::TIME;
BEGIN
  -- Prevent double-booking for the same professional at the same time
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE appointment_date  = p_date
      AND appointment_time  = v_time
      AND professional_id   = p_professional_id
      AND status           != 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Este horario ya está reservado';
  END IF;

  INSERT INTO appointments (
    service_id, professional_id,
    appointment_date, appointment_time,
    guest_name, guest_email, guest_phone,
    stripe_payment_intent_id, payment_status, payment_amount,
    status
  )
  VALUES (
    p_service_id, p_professional_id,
    p_date, v_time,
    p_guest_name, p_guest_email, p_guest_phone,
    p_payment_intent_id,
    CASE WHEN p_payment_intent_id IS NOT NULL THEN 'paid' ELSE 'unpaid' END,
    p_payment_amount,
    CASE WHEN p_payment_intent_id IS NOT NULL THEN 'confirmed' ELSE 'pending' END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 4. Function: get all paid appointments for the admin payments dashboard
CREATE OR REPLACE FUNCTION get_all_payments()
RETURNS TABLE (
  id                       UUID,
  appointment_date         DATE,
  appointment_time         TEXT,
  payment_amount           DECIMAL,
  payment_status           TEXT,
  stripe_payment_intent_id TEXT,
  guest_name               TEXT,
  guest_email              TEXT,
  service_name             TEXT,
  professional_name        TEXT,
  created_at               TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.appointment_date,
    SUBSTRING(a.appointment_time::TEXT, 1, 5),
    a.payment_amount,
    a.payment_status,
    a.stripe_payment_intent_id,
    COALESCE(a.guest_name,  p.full_name, 'Cliente'),
    COALESCE(a.guest_email, u.email,     ''),
    s.name,
    pr.name,
    a.created_at
  FROM appointments a
  LEFT JOIN services     s  ON a.service_id      = s.id
  LEFT JOIN professionals pr ON a.professional_id = pr.id
  LEFT JOIN profiles     p  ON a.client_id       = p.id
  LEFT JOIN auth.users   u  ON a.client_id       = u.id
  WHERE a.payment_status IN ('paid','refunded')
  ORDER BY a.created_at DESC;
$$;

-- 5. Grants
GRANT EXECUTE ON FUNCTION create_guest_appointment(UUID,UUID,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,DECIMAL) TO anon;
GRANT EXECUTE ON FUNCTION get_all_payments()                                                         TO authenticated;
