-- supabase/schema.sql
-- Run this whole script together in the Supabase SQL Editor

-- 1. CLEAN UP PREVIOUS ARTIFACTS
DROP TABLE IF EXISTS public.ambulance_dispatches CASCADE;
DROP TABLE IF EXISTS public.match_requests CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_rooms CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP FUNCTION IF EXISTS public.update_modified_column() CASCADE;

-- 2. CREATE PRIMARY DATABASE TABLES
CREATE TABLE public.users (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PATIENT','DOCTOR','PHARMACIST','NURSE','LAB_SCIENTIST','ADMIN')),
  phone TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  specialty TEXT,
  license_number TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.chat_rooms (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  professional_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE public.messages (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.bookings (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  professional_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id TEXT UNIQUE REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('CONSULTATION','HOME_VISIT','SAMPLE_COLLECTION','PRESCRIPTION')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','DECLINED','COMPLETED','CANCELLED')),
  scheduled_at TIMESTAMPTZ,
  notes TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.match_requests (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('CONSULTATION','HOME_VISIT','SAMPLE_COLLECTION','PRESCRIPTION')),
  urgency TEXT DEFAULT 'normal',
  description TEXT,
  assigned_pro_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ambulance_dispatches (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  severity TEXT NOT NULL,
  status TEXT DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','DISPATCHED','EN_ROUTE','ARRIVED','COMPLETED')),
  dispatched_at TIMESTAMPTZ DEFAULT now(),
  estimated_arrival TEXT,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- 3. BUILD PERFORMANCE INDEXES
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role_available ON public.users(role, is_available, is_verified);
CREATE INDEX idx_messages_room_id ON public.messages(room_id);
CREATE INDEX idx_bookings_patient_id ON public.bookings(patient_id);
CREATE INDEX idx_bookings_professional_id ON public.bookings(professional_id);
CREATE INDEX idx_chat_rooms_patient ON public.chat_rooms(patient_id);
CREATE INDEX idx_chat_rooms_professional ON public.chat_rooms(professional_id);

-- 4. CREATE SYSTEM TIMESTAMP AUTOMATION
CREATE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. ATTACH TRIGGER AUTOMATION
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_bookings_modtime BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- 6. RECALCULATE API GATEWAY SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
