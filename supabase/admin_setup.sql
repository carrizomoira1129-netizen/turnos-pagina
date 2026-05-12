-- Admin dashboard SQL notes
-- The admin dashboard uses the Supabase SERVICE ROLE KEY which bypasses RLS.
-- No additional SQL functions are required for the admin API routes.
-- However, this file documents useful helper views you can create optionally.

-- Optional: view for unified clients (guests + auth users)
CREATE OR REPLACE VIEW admin_clients AS
  -- Guest bookings
  SELECT
    guest_email            AS email,
    MAX(guest_name)        AS name,
    MAX(guest_phone)       AS phone,
    COUNT(*)               AS total_appointments,
    MAX(appointment_date)  AS last_appointment,
    'guest'                AS client_type
  FROM appointments
  WHERE guest_email IS NOT NULL
  GROUP BY guest_email
UNION ALL
  -- Auth user bookings
  SELECT
    u.email,
    COALESCE(p.full_name, u.email) AS name,
    p.phone,
    COUNT(a.id)            AS total_appointments,
    MAX(a.appointment_date) AS last_appointment,
    'auth'                 AS client_type
  FROM appointments a
  JOIN auth.users  u ON a.client_id = u.id
  LEFT JOIN profiles p ON a.client_id = p.id
  WHERE a.client_id IS NOT NULL
  GROUP BY u.email, p.full_name, p.phone;

-- Grant this view only to authenticated users (admins use service role which ignores this)
-- GRANT SELECT ON admin_clients TO authenticated;
