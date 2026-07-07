-- ============================================================
-- 031_multi_tenant_saas.sql — Multi-tenant SaaS Foundation
--
-- Transitions the database schema to support a multi-tenant SaaS.
-- Introduces `organizations`, `waba_connections`, and `user_organizations`.
-- Adds `organization_id` to all business tables, backfills them from
-- legacy `accounts` data (preserving UUIDs 1-to-1), and enforces RLS.
-- ============================================================

-- ============================================================
-- 1. NEW TABLES
-- ============================================================

-- Organizations (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  subscription_status TEXT NOT NULL DEFAULT 'active',
  razorpay_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WABA Connections (Meta Embedded Signup integration per tenant)
-- Note: phone_number_id must be globally unique to ensure correct webhook routing.
CREATE TABLE IF NOT EXISTS public.waba_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL UNIQUE,
  access_token_encrypted TEXT NOT NULL,
  webhook_verify_token TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for organization lookup on WABA connections
CREATE INDEX IF NOT EXISTS idx_waba_connections_org ON public.waba_connections(organization_id);

-- User-Organization Memberships
CREATE TABLE IF NOT EXISTS public.user_organizations (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'agent', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

-- ============================================================
-- 2. RLS HELPER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_organization_member(
  target_organization_id UUID,
  min_role TEXT DEFAULT 'viewer'
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
      AND uo.organization_id = target_organization_id
      AND CASE uo.role
            WHEN 'owner'  THEN 4
            WHEN 'admin'  THEN 3
            WHEN 'agent'  THEN 2
            WHEN 'viewer' THEN 1
            ELSE 0
          END
        >=
          CASE min_role
            WHEN 'owner'  THEN 4
            WHEN 'admin'  THEN 3
            WHEN 'agent'  THEN 2
            WHEN 'viewer' THEN 1
            ELSE 0
          END
  );
$$;

ALTER FUNCTION public.is_organization_member(UUID, TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID, TEXT) TO authenticated, service_role;

-- ============================================================
-- 3. ADD NULLABLE organization_id COLUMNS (Group A & Group B)
-- ============================================================

-- Group A: Tables with direct tenant mapping (previously carried account_id)
ALTER TABLE public.contacts                       ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.tags                           ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.custom_fields                  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.contact_notes                  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.conversations                  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.whatsapp_config                ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.message_templates              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.pipelines                      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.deals                          ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.broadcasts                     ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.automations                    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.automation_logs                ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.automation_pending_executions  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.flows                          ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.flow_runs                      ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.api_keys                       ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.webhook_endpoints              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.notifications                  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.ai_configs                     ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.ai_knowledge_documents         ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.ai_knowledge_chunks            ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.member_presence                ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Group B: Nested child / join tables (previously resolved tenancy via parent joins)
ALTER TABLE public.contact_tags                   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.contact_custom_values          ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.pipeline_stages                ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.messages                       ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.message_reactions              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.broadcast_recipients           ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.automation_steps               ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.flow_nodes                     ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.flow_run_events                ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================================
-- 4. DATA BACKFILL
-- ============================================================
DO $$
DECLARE
  v_table TEXT;
  v_tables_parent TEXT[] := ARRAY[
    'contacts', 'tags', 'custom_fields', 'contact_notes',
    'conversations', 'whatsapp_config', 'message_templates',
    'pipelines', 'deals', 'broadcasts', 'automations',
    'automation_logs', 'automation_pending_executions',
    'flows', 'flow_runs', 'api_keys', 'webhook_endpoints',
    'notifications', 'ai_configs', 'ai_knowledge_documents',
    'ai_knowledge_chunks', 'member_presence'
  ];
BEGIN
  -- A. Migrate legacy accounts to organizations (preserving IDs for 1-to-1 mapping)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') THEN
    INSERT INTO public.organizations (id, name, slug, created_at)
    SELECT id, name, 'org-' || substring(id::text, 1, 8), created_at
    FROM public.accounts
    ON CONFLICT (id) DO NOTHING;

    -- B. Migrate legacy memberships from profiles to user_organizations
    INSERT INTO public.user_organizations (user_id, organization_id, role)
    SELECT user_id, account_id, COALESCE(account_role::text, 'viewer')
    FROM public.profiles
    WHERE account_id IS NOT NULL AND account_role IS NOT NULL
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  END IF;

  -- C. Backfill organization_id for Parent Tables (copy account_id)
  FOREACH v_table IN ARRAY v_tables_parent LOOP
    EXECUTE format($f$
      UPDATE public.%I
      SET organization_id = account_id
      WHERE organization_id IS NULL AND account_id IS NOT NULL
    $f$, v_table);
  END LOOP;

  -- D. Backfill organization_id for Child/Join Tables (from parent tables)
  
  -- contact_tags
  UPDATE public.contact_tags ct
  SET organization_id = c.organization_id
  FROM public.contacts c
  WHERE ct.contact_id = c.id AND ct.organization_id IS NULL;

  -- contact_custom_values
  UPDATE public.contact_custom_values ccv
  SET organization_id = c.organization_id
  FROM public.contacts c
  WHERE ccv.contact_id = c.id AND ccv.organization_id IS NULL;

  -- pipeline_stages
  UPDATE public.pipeline_stages ps
  SET organization_id = p.organization_id
  FROM public.pipelines p
  WHERE ps.pipeline_id = p.id AND ps.organization_id IS NULL;

  -- messages
  UPDATE public.messages m
  SET organization_id = c.organization_id
  FROM public.conversations c
  WHERE m.conversation_id = c.id AND m.organization_id IS NULL;

  -- message_reactions (links directly to conversation_id)
  UPDATE public.message_reactions mr
  SET organization_id = c.organization_id
  FROM public.conversations c
  WHERE mr.conversation_id = c.id AND mr.organization_id IS NULL;

  -- broadcast_recipients
  UPDATE public.broadcast_recipients br
  SET organization_id = b.organization_id
  FROM public.broadcasts b
  WHERE br.broadcast_id = b.id AND br.organization_id IS NULL;

  -- automation_steps
  UPDATE public.automation_steps ast
  SET organization_id = a.organization_id
  FROM public.automations a
  WHERE ast.automation_id = a.id AND ast.organization_id IS NULL;

  -- flow_nodes
  UPDATE public.flow_nodes fn
  SET organization_id = f.organization_id
  FROM public.flows f
  WHERE fn.flow_id = f.id AND fn.organization_id IS NULL;

  -- flow_run_events
  UPDATE public.flow_run_events fre
  SET organization_id = fr.organization_id
  FROM public.flow_runs fr
  WHERE fre.flow_run_id = fr.id AND fre.organization_id IS NULL;

END $$;

-- ============================================================
-- 5. APPLY NOT NULL CONSTRAINTS
-- ============================================================
ALTER TABLE public.contacts                       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.tags                           ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.custom_fields                  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.contact_notes                  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.conversations                  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.whatsapp_config                ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.message_templates              ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.pipelines                      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.deals                          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.broadcasts                     ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.automations                    ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.automation_logs                ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.automation_pending_executions  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.flows                          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.flow_runs                      ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.api_keys                       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.webhook_endpoints              ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.notifications                  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.ai_configs                     ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.ai_knowledge_documents         ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.ai_knowledge_chunks            ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.member_presence                ALTER COLUMN organization_id SET NOT NULL;

-- Child/Join tables NOT NULL
ALTER TABLE public.contact_tags                   ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.contact_custom_values          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.pipeline_stages                ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.messages                       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.message_reactions              ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.broadcast_recipients           ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.automation_steps               ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.flow_nodes                     ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.flow_run_events                ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================
-- 6. INDEXES ON organization_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contacts_org                ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_org                    ON public.tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_org           ON public.custom_fields(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_org           ON public.contact_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org           ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_org         ON public.whatsapp_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_org       ON public.message_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_org               ON public.pipelines(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_org                   ON public.deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_org              ON public.broadcasts(organization_id);
CREATE INDEX IF NOT EXISTS idx_automations_org             ON public.automations(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_org         ON public.automation_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_pending_org      ON public.automation_pending_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_flows_org                   ON public.flows(organization_id);
CREATE INDEX IF NOT EXISTS idx_flow_runs_org               ON public.flow_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org                ON public.api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org       ON public.webhook_endpoints(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org           ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_configs_org              ON public.ai_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_docs_org       ON public.ai_knowledge_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_org     ON public.ai_knowledge_chunks(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_presence_org         ON public.member_presence(organization_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_org            ON public.contact_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_custom_values_org   ON public.contact_custom_values(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org         ON public.pipeline_stages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_org                ON public.messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_org       ON public.message_reactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_org    ON public.broadcast_recipients(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_steps_org        ON public.automation_steps(organization_id);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_org              ON public.flow_nodes(organization_id);
CREATE INDEX IF NOT EXISTS idx_flow_run_events_org         ON public.flow_run_events(organization_id);

-- ============================================================
-- 7. REWRITE ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- Drop all existing policies on target tables dynamically
-- Note: We DO NOT touch 'profiles', 'accounts', or 'account_invitations' to preserve single-tenant configs.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'contacts', 'tags', 'custom_fields', 'contact_notes',
        'conversations', 'whatsapp_config', 'message_templates',
        'pipelines', 'deals', 'broadcasts', 'automations',
        'automation_logs', 'flows', 'flow_runs', 'contact_tags',
        'contact_custom_values', 'messages', 'pipeline_stages',
        'broadcast_recipients', 'automation_steps', 'flow_nodes',
        'flow_run_events', 'message_reactions', 'api_keys',
        'webhook_endpoints', 'notifications', 'ai_configs',
        'ai_knowledge_documents', 'ai_knowledge_chunks', 'member_presence',
        'organizations', 'user_organizations', 'waba_connections'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waba_connections ENABLE ROW LEVEL SECURITY;

-- organizations
CREATE POLICY organizations_select ON public.organizations FOR SELECT USING (public.is_organization_member(id));
CREATE POLICY organizations_update ON public.organizations FOR UPDATE USING (public.is_organization_member(id, 'admin'));

-- user_organizations
CREATE POLICY user_organizations_select ON public.user_organizations FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY user_organizations_modify ON public.user_organizations FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- waba_connections
CREATE POLICY waba_connections_select ON public.waba_connections FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY waba_connections_modify ON public.waba_connections FOR ALL USING (public.is_organization_member(organization_id, 'admin'));

-- OPERATIONAL TABLES: Select = viewer+, Write = agent+

-- contacts
CREATE POLICY contacts_select ON public.contacts FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY contacts_insert ON public.contacts FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY contacts_update ON public.contacts FOR UPDATE USING (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY contacts_delete ON public.contacts FOR DELETE USING (public.is_organization_member(organization_id, 'agent'));

-- contact_notes
CREATE POLICY contact_notes_select ON public.contact_notes FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY contact_notes_insert ON public.contact_notes FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY contact_notes_update ON public.contact_notes FOR UPDATE USING (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY contact_notes_delete ON public.contact_notes FOR DELETE USING (public.is_organization_member(organization_id, 'agent'));

-- conversations
CREATE POLICY conversations_select ON public.conversations FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY conversations_insert ON public.conversations FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY conversations_update ON public.conversations FOR UPDATE USING (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY conversations_delete ON public.conversations FOR DELETE USING (public.is_organization_member(organization_id, 'agent'));

-- messages
CREATE POLICY messages_select ON public.messages FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY messages_modify ON public.messages FOR ALL USING (public.is_organization_member(organization_id, 'agent')) WITH CHECK (public.is_organization_member(organization_id, 'agent'));

-- deals
CREATE POLICY deals_select ON public.deals FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY deals_insert ON public.deals FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY deals_update ON public.deals FOR UPDATE USING (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY deals_delete ON public.deals FOR DELETE USING (public.is_organization_member(organization_id, 'agent'));

-- broadcasts
CREATE POLICY broadcasts_select ON public.broadcasts FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY broadcasts_insert ON public.broadcasts FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY broadcasts_update ON public.broadcasts FOR UPDATE USING (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY broadcasts_delete ON public.broadcasts FOR DELETE USING (public.is_organization_member(organization_id, 'agent'));

-- broadcast_recipients
CREATE POLICY broadcast_recipients_select ON public.broadcast_recipients FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY broadcast_recipients_modify ON public.broadcast_recipients FOR ALL USING (public.is_organization_member(organization_id, 'agent')) WITH CHECK (public.is_organization_member(organization_id, 'agent'));

-- automations
CREATE POLICY automations_select ON public.automations FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY automations_insert ON public.automations FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY automations_update ON public.automations FOR UPDATE USING (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY automations_delete ON public.automations FOR DELETE USING (public.is_organization_member(organization_id, 'agent'));

-- automation_steps
CREATE POLICY automation_steps_select ON public.automation_steps FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY automation_steps_modify ON public.automation_steps FOR ALL USING (public.is_organization_member(organization_id, 'agent')) WITH CHECK (public.is_organization_member(organization_id, 'agent'));

-- flows
CREATE POLICY flows_select ON public.flows FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY flows_insert ON public.flows FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY flows_update ON public.flows FOR UPDATE USING (public.is_organization_member(organization_id, 'agent'));
CREATE POLICY flows_delete ON public.flows FOR DELETE USING (public.is_organization_member(organization_id, 'agent'));

-- flow_nodes
CREATE POLICY flow_nodes_select ON public.flow_nodes FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY flow_nodes_modify ON public.flow_nodes FOR ALL USING (public.is_organization_member(organization_id, 'agent')) WITH CHECK (public.is_organization_member(organization_id, 'agent'));

-- flow_runs
CREATE POLICY flow_runs_select ON public.flow_runs FOR SELECT USING (public.is_organization_member(organization_id));

-- flow_run_events
CREATE POLICY flow_run_events_select ON public.flow_run_events FOR SELECT USING (public.is_organization_member(organization_id));

-- message_reactions
CREATE POLICY message_reactions_select ON public.message_reactions FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY message_reactions_modify ON public.message_reactions FOR ALL USING (public.is_organization_member(organization_id, 'agent')) WITH CHECK (public.is_organization_member(organization_id, 'agent'));

-- contact_tags
CREATE POLICY contact_tags_select ON public.contact_tags FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY contact_tags_modify ON public.contact_tags FOR ALL USING (public.is_organization_member(organization_id, 'agent')) WITH CHECK (public.is_organization_member(organization_id, 'agent'));

-- contact_custom_values
CREATE POLICY contact_custom_values_select ON public.contact_custom_values FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY contact_custom_values_modify ON public.contact_custom_values FOR ALL USING (public.is_organization_member(organization_id, 'agent')) WITH CHECK (public.is_organization_member(organization_id, 'agent'));

-- notifications
CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY notifications_modify ON public.notifications FOR ALL USING (public.is_organization_member(organization_id, 'agent')) WITH CHECK (public.is_organization_member(organization_id, 'agent'));

-- member_presence
CREATE POLICY member_presence_select ON public.member_presence FOR SELECT USING (public.is_organization_member(organization_id));

-- automation_logs
CREATE POLICY automation_logs_select ON public.automation_logs FOR SELECT USING (public.is_organization_member(organization_id));

-- automation_pending_executions (Select = viewer+)
CREATE POLICY automation_pending_executions_select ON public.automation_pending_executions FOR SELECT USING (public.is_organization_member(organization_id));


-- SETTINGS/ADMIN TABLES: Select = viewer+, Write = admin+

-- tags
CREATE POLICY tags_select ON public.tags FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY tags_insert ON public.tags FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY tags_update ON public.tags FOR UPDATE USING (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY tags_delete ON public.tags FOR DELETE USING (public.is_organization_member(organization_id, 'admin'));

-- custom_fields
CREATE POLICY custom_fields_select ON public.custom_fields FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY custom_fields_insert ON public.custom_fields FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY custom_fields_update ON public.custom_fields FOR UPDATE USING (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY custom_fields_delete ON public.custom_fields FOR DELETE USING (public.is_organization_member(organization_id, 'admin'));

-- whatsapp_config
CREATE POLICY whatsapp_config_select ON public.whatsapp_config FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY whatsapp_config_insert ON public.whatsapp_config FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY whatsapp_config_update ON public.whatsapp_config FOR UPDATE USING (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY whatsapp_config_delete ON public.whatsapp_config FOR DELETE USING (public.is_organization_member(organization_id, 'admin'));

-- message_templates
CREATE POLICY message_templates_select ON public.message_templates FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY message_templates_insert ON public.message_templates FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY message_templates_update ON public.message_templates FOR UPDATE USING (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY message_templates_delete ON public.message_templates FOR DELETE USING (public.is_organization_member(organization_id, 'admin'));

-- pipelines
CREATE POLICY pipelines_select ON public.pipelines FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY pipelines_insert ON public.pipelines FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY pipelines_update ON public.pipelines FOR UPDATE USING (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY pipelines_delete ON public.pipelines FOR DELETE USING (public.is_organization_member(organization_id, 'admin'));

-- pipeline_stages
CREATE POLICY pipeline_stages_select ON public.pipeline_stages FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY pipeline_stages_modify ON public.pipeline_stages FOR ALL USING (public.is_organization_member(organization_id, 'admin')) WITH CHECK (public.is_organization_member(organization_id, 'admin'));

-- api_keys
CREATE POLICY api_keys_select ON public.api_keys FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY api_keys_insert ON public.api_keys FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY api_keys_update ON public.api_keys FOR UPDATE USING (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY api_keys_delete ON public.api_keys FOR DELETE USING (public.is_organization_member(organization_id, 'admin'));

-- webhook_endpoints
CREATE POLICY webhook_endpoints_select ON public.webhook_endpoints FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY webhook_endpoints_insert ON public.webhook_endpoints FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY webhook_endpoints_update ON public.webhook_endpoints FOR UPDATE USING (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY webhook_endpoints_delete ON public.webhook_endpoints FOR DELETE USING (public.is_organization_member(organization_id, 'admin'));

-- ai_configs
CREATE POLICY ai_configs_select ON public.ai_configs FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY ai_configs_insert ON public.ai_configs FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY ai_configs_update ON public.ai_configs FOR UPDATE USING (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY ai_configs_delete ON public.ai_configs FOR DELETE USING (public.is_organization_member(organization_id, 'admin'));

-- ai_knowledge_documents
CREATE POLICY ai_knowledge_documents_select ON public.ai_knowledge_documents FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY ai_knowledge_documents_insert ON public.ai_knowledge_documents FOR INSERT WITH CHECK (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY ai_knowledge_documents_update ON public.ai_knowledge_documents FOR UPDATE USING (public.is_organization_member(organization_id, 'admin'));
CREATE POLICY ai_knowledge_documents_delete ON public.ai_knowledge_documents FOR DELETE USING (public.is_organization_member(organization_id, 'admin'));

-- ai_knowledge_chunks
CREATE POLICY ai_knowledge_chunks_select ON public.ai_knowledge_chunks FOR SELECT USING (public.is_organization_member(organization_id));
CREATE POLICY ai_knowledge_chunks_modify ON public.ai_knowledge_chunks FOR ALL USING (public.is_organization_member(organization_id, 'admin')) WITH CHECK (public.is_organization_member(organization_id, 'admin'));
