-- TurnosPro Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Business configuration
CREATE TABLE IF NOT EXISTS business_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'TurnosPro',
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  working_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday'],
  working_hours_start TIME DEFAULT '10:00',
  working_hours_end TIME DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Professionals table
CREATE TABLE IF NOT EXISTS professionals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT,
  photo_url TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Appointments policies
CREATE POLICY "Users can view own appointments" ON appointments FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users can create own appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can update own appointments" ON appointments FOR UPDATE USING (auth.uid() = client_id);

-- Services: public read
CREATE POLICY "Anyone can view active services" ON services FOR SELECT USING (is_active = TRUE);

-- Professionals: public read
CREATE POLICY "Anyone can view active professionals" ON professionals FOR SELECT USING (is_active = TRUE);

-- Business config: public read
CREATE POLICY "Anyone can view business config" ON business_config FOR SELECT USING (TRUE);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==================== SEED DATA ====================

-- Business config
INSERT INTO business_config (name, phone, email, address, working_days, working_hours_start, working_hours_end)
VALUES (
  'TurnosPro',
  '+54 11 0000-0000',
  'info@turnospro.com',
  'Buenos Aires, Argentina',
  ARRAY['monday','tuesday','wednesday','thursday','friday','saturday'],
  '10:00',
  '18:00'
);

-- Services
INSERT INTO services (name, description, duration_minutes, price, is_active) VALUES
('Consulta General', 'Consulta estándar de 60 minutos con nuestros profesionales especializados.', 60, 3000.00, TRUE),
('Tratamiento Premium', 'Sesión completa de tratamiento premium con atención personalizada y seguimiento.', 90, 5000.00, TRUE),
('Sesión Express', 'Consulta rápida y eficiente de 30 minutos para necesidades específicas.', 30, 2000.00, TRUE);

-- Professionals
INSERT INTO professionals (name, specialty, bio, is_active) VALUES
('Dra. Laura Martínez', 'Especialista Senior', 'Más de 10 años de experiencia en el área. Especializada en atención personalizada y tratamientos de alta complejidad.', TRUE),
('Dr. Carlos Rodríguez', 'Consultor General', 'Profesional certificado con amplia trayectoria en consultas generales y diagnóstico temprano.', TRUE),
('Lic. Ana González', 'Terapeuta Express', 'Especialista en sesiones cortas de alto impacto, con enfoque en soluciones rápidas y efectivas.', TRUE);
