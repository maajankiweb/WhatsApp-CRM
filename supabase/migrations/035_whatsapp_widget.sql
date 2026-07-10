-- ============================================================
-- 035_whatsapp_widget.sql — Interactive WhatsApp Chat Widget
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bubble_text TEXT NOT NULL DEFAULT 'Chat with us',
  welcome_message TEXT NOT NULL DEFAULT 'Hi! How can we help you today?',
  agent_phone TEXT NOT NULL,
  avatar_url TEXT,
  position TEXT NOT NULL DEFAULT 'right' CHECK (position IN ('left', 'right')),
  theme_color TEXT NOT NULL DEFAULT '#25D366',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Index for org lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_widgets_org 
  ON public.whatsapp_widgets(organization_id);

ALTER TABLE public.whatsapp_widgets ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (idempotency)
DO $$
BEGIN
  DROP POLICY IF EXISTS whatsapp_widgets_select_public ON public.whatsapp_widgets;
  DROP POLICY IF EXISTS whatsapp_widgets_insert ON public.whatsapp_widgets;
  DROP POLICY IF EXISTS whatsapp_widgets_update ON public.whatsapp_widgets;
  DROP POLICY IF EXISTS whatsapp_widgets_delete ON public.whatsapp_widgets;
END $$;

-- Policies:
-- SELECT is public/anonymous so the widget script can retrieve configs
CREATE POLICY whatsapp_widgets_select_public ON public.whatsapp_widgets
  FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE are admin/agent operations
CREATE POLICY whatsapp_widgets_insert ON public.whatsapp_widgets
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'agent'));

CREATE POLICY whatsapp_widgets_update ON public.whatsapp_widgets
  FOR UPDATE USING (public.is_organization_member(organization_id, 'agent'));

CREATE POLICY whatsapp_widgets_delete ON public.whatsapp_widgets
  FOR DELETE USING (public.is_organization_member(organization_id, 'agent'));

-- Trigger for updating updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.whatsapp_widgets;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.whatsapp_widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for whatsapp_widgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_widgets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_widgets;
  END IF;
END $$;
