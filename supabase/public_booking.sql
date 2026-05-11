-- Public booking migration
-- Run this in Supabase SQL Editor AFTER the main schema.sql

-- 1. Allow client_id to be null (for guest bookings)
ALTER TABLE appointments ALTER COLUMN client_id DROP NOT NULL;

-- 2. Add guest info columns
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS guest_name  TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- 3. Function: get booked time slots for a date (bypasses RLS)
CREATE OR REPLACE FUNCTION get_booked_slots(booking_date DATE)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY_AGG(SUBSTRING(appointment_time::TEXT, 1, 5)),
    ARRAY[]::TEXT[]
  )
  FROM appointments
  WHERE appointment_date = booking_date
    AND status != 'cancelled';
$$;

-- 4. Function: get fully booked dates for a month (all 8 slots taken)
CREATE OR REPLACE FUNCTION get_fully_booked_dates(year INT, month INT)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(appointment_date::TEXT), ARRAY[]::TEXT[])
  FROM (
    SELECT appointment_date, COUNT(*) AS total
    FROM appointments
    WHERE EXTRACT(YEAR  FROM appointment_date) = year
      AND EXTRACT(MONTH FROM appointment_date) = month
      AND status != 'cancelled'
    GROUP BY appointment_date
    HAVING COUNT(*) >= 8
  ) sub;
$$;

-- 5. Function: create guest appointment (bypasses RLS)
CREATE OR REPLACE FUNCTION create_guest_appointment(
  p_service_id  UUID,
  p_date        DATE,
  p_time        TEXT,
  p_guest_name  TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT
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
  -- Prevent double-booking
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE appointment_date = p_date
      AND appointment_time = v_time
      AND status != 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Este horario ya está reservado';
  END IF;

  INSERT INTO appointments (
    service_id, appointment_date, appointment_time,
    guest_name, guest_email, guest_phone, status
  )
  VALUES (
    p_service_id, p_date, v_time,
    p_guest_name, p_guest_email, p_guest_phone, 'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 6. Grant execute to anon role so unauthenticated users can call these
GRANT EXECUTE ON FUNCTION get_booked_slots(DATE)           TO anon;
GRANT EXECUTE ON FUNCTION get_fully_booked_dates(INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION create_guest_appointment(UUID, DATE, TEXT, TEXT, TEXT, TEXT) TO anon;
