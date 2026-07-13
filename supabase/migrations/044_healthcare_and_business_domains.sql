-- ============================================================
-- 044_healthcare_and_business_domains.sql
-- Database schema for Healthcare (Clinic Booking) and General Business modules.
-- Adds tables, indexes, and RLS policies isolated by organization_id.
-- ============================================================

-- 1. CLINIC/HEALTHCARE MODULES
-- ─────────────────────────────────────────────────────────────

-- clinics
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_name TEXT NOT NULL,
  clinic_type TEXT,
  clinic_description TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  google_map_link TEXT,
  date_exceptions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- clinic_timings
CREATE TABLE IF NOT EXISTS public.clinic_timings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL, -- e.g., 'Monday', 'Tuesday'
  opening_time TEXT, -- '09:00'
  closing_time TEXT, -- '18:00'
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  lunch_break_start TEXT, -- '13:00'
  lunch_break_end TEXT, -- '14:00'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinic_id, day_name)
);

-- doctors
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  specialization TEXT,
  qualification TEXT,
  experience TEXT,
  available_days JSONB DEFAULT '[]'::jsonb, -- e.g., ["Monday", "Tuesday"]
  available_start_time TEXT, -- '09:00'
  available_end_time TEXT, -- '17:00'
  consultation_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  languages_spoken TEXT,
  profile_photo TEXT,
  weekly_slots JSONB DEFAULT '{}'::jsonb,
  date_exceptions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- clinic_services
CREATE TABLE IF NOT EXISTS public.clinic_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  description TEXT,
  starting_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  duration INTEGER NOT NULL DEFAULT 30, -- in minutes
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- clinic_faqs
CREATE TABLE IF NOT EXISTS public.clinic_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT, -- comma separated terms
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL, -- '09:30'
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  reminders_sent JSONB DEFAULT '[]'::jsonb,
  feedback_sent BOOLEAN NOT NULL DEFAULT FALSE,
  followup_sent BOOLEAN NOT NULL DEFAULT FALSE,
  patient_name TEXT,
  patient_age TEXT,
  reason_for_visit TEXT,
  sheets_synced BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- patient_intakes
CREATE TABLE IF NOT EXISTS public.patient_intakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  symptoms TEXT,
  allergies TEXT,
  current_medications TEXT,
  medical_history TEXT,
  urgency_level TEXT, -- 'emergency', 'routine'
  triage_result JSONB DEFAULT '{}'::jsonb,
  collected_via TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- patient_feedback
CREATE TABLE IF NOT EXISTS public.patient_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- clinic_ai_settings
CREATE TABLE IF NOT EXISTS public.clinic_ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE UNIQUE,
  ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_tone TEXT NOT NULL DEFAULT 'polite',
  supported_languages JSONB DEFAULT '["English", "Hindi"]'::jsonb,
  greeting_message TEXT,
  after_hours_message TEXT,
  escalation_keywords JSONB DEFAULT '["agent", "human", "talk to agent"]'::jsonb,
  emergency_keywords JSONB DEFAULT '["chest pain", "heart attack", "accident", "bleeding"]'::jsonb,
  human_handover_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. GENERAL BUSINESS MODULE
-- ─────────────────────────────────────────────────────────────

-- business_profiles
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  business_type TEXT NOT NULL, -- 'hotel', 'education', 'realestate', 'retail'
  business_name TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  google_map_link TEXT,
  description TEXT,
  institution_type TEXT,
  property_type TEXT,
  working_hours JSONB DEFAULT '{}'::jsonb,
  date_exceptions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- business_services
CREATE TABLE IF NOT EXISTS public.business_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2),
  duration_minutes INTEGER,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- business_staff
CREATE TABLE IF NOT EXISTS public.business_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  specialization TEXT,
  qualification TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  extra_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- business_faqs
CREATE TABLE IF NOT EXISTS public.business_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- business_ai_settings
CREATE TABLE IF NOT EXISTS public.business_ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE UNIQUE,
  ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_tone TEXT NOT NULL DEFAULT 'polite and professional',
  supported_languages JSONB DEFAULT '["English", "Hindi"]'::jsonb,
  greeting_message TEXT,
  after_hours_message TEXT,
  escalation_keywords JSONB DEFAULT '["agent", "human"]'::jsonb,
  human_handover_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- business_enquiries
CREATE TABLE IF NOT EXISTS public.business_enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_phone TEXT,
  enquiry_type TEXT, -- 'booking', 'admission', 'pricing'
  preferred_date DATE,
  preferred_time TEXT, -- '14:00'
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- business_ai_logs
CREATE TABLE IF NOT EXISTS public.business_ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  user_message TEXT,
  ai_response TEXT,
  detected_intent TEXT,
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES ON organization_id
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clinics_org ON public.clinics(organization_id);
CREATE INDEX IF NOT EXISTS idx_clinic_timings_org ON public.clinic_timings(organization_id);
CREATE INDEX IF NOT EXISTS idx_doctors_org ON public.doctors(organization_id);
CREATE INDEX IF NOT EXISTS idx_clinic_services_org ON public.clinic_services(organization_id);
CREATE INDEX IF NOT EXISTS idx_clinic_faqs_org ON public.clinic_faqs(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_patient_intakes_org ON public.patient_intakes(organization_id);
CREATE INDEX IF NOT EXISTS idx_patient_feedback_org ON public.patient_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_clinic_ai_settings_org ON public.clinic_ai_settings(organization_id);

CREATE INDEX IF NOT EXISTS idx_business_profiles_org ON public.business_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_services_org ON public.business_services(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_staff_org ON public.business_staff(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_faqs_org ON public.business_faqs(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_ai_settings_org ON public.business_ai_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_enquiries_org ON public.business_enquiries(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_ai_logs_org ON public.business_ai_logs(organization_id);

-- 4. ROW-LEVEL SECURITY POLICIES
-- ─────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_timings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_ai_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_ai_logs ENABLE ROW LEVEL SECURITY;

-- Define Policies

-- Clinics
CREATE POLICY clinics_select ON public.clinics FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY clinics_all ON public.clinics FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- Clinic Timings
CREATE POLICY timings_select ON public.clinic_timings FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY timings_all ON public.clinic_timings FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- Doctors
CREATE POLICY doctors_select ON public.doctors FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY doctors_all ON public.doctors FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- Clinic Services
CREATE POLICY services_select ON public.clinic_services FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY services_all ON public.clinic_services FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- Clinic FAQs
CREATE POLICY faqs_select ON public.clinic_faqs FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY faqs_all ON public.clinic_faqs FOR ALL USING (public.is_organization_member(organization_id, 'agent'));

-- Appointments
CREATE POLICY appointments_select ON public.appointments FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY appointments_all ON public.appointments FOR ALL USING (public.is_organization_member(organization_id, 'agent'));

-- Patient Intakes
CREATE POLICY intakes_select ON public.patient_intakes FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY intakes_all ON public.patient_intakes FOR ALL USING (public.is_organization_member(organization_id, 'agent'));

-- Patient Feedback
CREATE POLICY feedback_select ON public.patient_feedback FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY feedback_all ON public.patient_feedback FOR ALL USING (public.is_organization_member(organization_id, 'agent'));

-- Clinic AI Settings
CREATE POLICY ai_select ON public.clinic_ai_settings FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY ai_all ON public.clinic_ai_settings FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- Business Profile
CREATE POLICY b_profile_select ON public.business_profiles FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY b_profile_all ON public.business_profiles FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- Business Services
CREATE POLICY b_services_select ON public.business_services FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY b_services_all ON public.business_services FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- Business Staff
CREATE POLICY b_staff_select ON public.business_staff FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY b_staff_all ON public.business_staff FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- Business FAQs
CREATE POLICY b_faqs_select ON public.business_faqs FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY b_faqs_all ON public.business_faqs FOR ALL USING (public.is_organization_member(organization_id, 'agent'));

-- Business AI Settings
CREATE POLICY b_ai_select ON public.business_ai_settings FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY b_ai_all ON public.business_ai_settings FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- Business Enquiries
CREATE POLICY b_enquiries_select ON public.business_enquiries FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY b_enquiries_all ON public.business_enquiries FOR ALL USING (public.is_organization_member(organization_id, 'agent'));

-- Business AI Logs
CREATE POLICY b_ai_logs_select ON public.business_ai_logs FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY b_ai_logs_all ON public.business_ai_logs FOR ALL USING (public.is_organization_member(organization_id, 'agent'));

-- 5. CONVERSATION BOOKING MEMORY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS booking_stage TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS booking_state JSONB DEFAULT '{}'::jsonb;
