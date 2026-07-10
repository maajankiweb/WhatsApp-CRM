-- ============================================================
-- 036_business_hours.sql — Business Hours & OOO Auto-Reply
-- ============================================================

CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  ooo_message TEXT NOT NULL DEFAULT 'Thank you for your message. We are currently closed and will get back to you during our working hours.',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_hours JSONB NOT NULL DEFAULT '{
    "0": {"enabled": false, "open": "09:00", "close": "18:00"},
    "1": {"enabled": true, "open": "09:00", "close": "18:00"},
    "2": {"enabled": true, "open": "09:00", "close": "18:00"},
    "3": {"enabled": true, "open": "09:00", "close": "18:00"},
    "4": {"enabled": true, "open": "09:00", "close": "18:00"},
    "5": {"enabled": true, "open": "09:00", "close": "18:00"},
    "6": {"enabled": false, "open": "09:00", "close": "18:00"}
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- is_organization_member check (similar to tags / custom_fields)
DROP POLICY IF EXISTS business_hours_select ON public.business_hours;
CREATE POLICY business_hours_select ON public.business_hours
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS business_hours_modify ON public.business_hours;
CREATE POLICY business_hours_modify ON public.business_hours
  FOR ALL USING (public.is_organization_member(organization_id, 'admin'))
  WITH CHECK (public.is_organization_member(organization_id, 'admin'));

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.business_hours;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.business_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
