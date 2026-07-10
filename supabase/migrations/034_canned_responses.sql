-- ============================================================
-- 034_canned_responses.sql — Canned Responses (Quick Replies)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, shortcut)
);

-- Index for shortcut lookup per organization
CREATE INDEX IF NOT EXISTS idx_canned_responses_org_shortcut 
  ON public.canned_responses(organization_id, shortcut);

ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on canned_responses (to be clean and idempotent)
DO $$
BEGIN
  DROP POLICY IF EXISTS canned_responses_select ON public.canned_responses;
  DROP POLICY IF EXISTS canned_responses_insert ON public.canned_responses;
  DROP POLICY IF EXISTS canned_responses_update ON public.canned_responses;
  DROP POLICY IF EXISTS canned_responses_delete ON public.canned_responses;
END $$;

-- Policies: any org member can view; agents and above can modify
CREATE POLICY canned_responses_select ON public.canned_responses
  FOR SELECT USING (public.is_organization_member(organization_id));

CREATE POLICY canned_responses_insert ON public.canned_responses
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'agent'));

CREATE POLICY canned_responses_update ON public.canned_responses
  FOR UPDATE USING (public.is_organization_member(organization_id, 'agent'));

CREATE POLICY canned_responses_delete ON public.canned_responses
  FOR DELETE USING (public.is_organization_member(organization_id, 'agent'));

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.canned_responses;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.canned_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for canned_responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'canned_responses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.canned_responses;
  END IF;
END $$;
