-- ============================================================
-- 037_ecommerce_and_payments.sql — Shopify/WooCommerce and Payments Integration
-- ============================================================

-- Ecommerce Integrations Configuration Table
CREATE TABLE IF NOT EXISTS public.ecommerce_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  shopify_shop_url TEXT,
  shopify_access_token TEXT, -- Encrypted access token
  woocommerce_store_url TEXT,
  woocommerce_consumer_key TEXT,
  woocommerce_consumer_secret TEXT, -- Encrypted consumer secret
  abandoned_cart_enabled BOOLEAN NOT NULL DEFAULT false,
  abandoned_cart_message TEXT NOT NULL DEFAULT 'Hi {{name}}, we noticed you left items in your cart. Complete your purchase here: {{checkout_url}}',
  tracking_alerts_enabled BOOLEAN NOT NULL DEFAULT false,
  tracking_message TEXT NOT NULL DEFAULT 'Hi {{name}}, your order has been shipped! Tracking number: {{tracking_number}}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on ecommerce_integrations
ALTER TABLE public.ecommerce_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ecommerce_integrations_select ON public.ecommerce_integrations;
CREATE POLICY ecommerce_integrations_select ON public.ecommerce_integrations
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS ecommerce_integrations_modify ON public.ecommerce_integrations;
CREATE POLICY ecommerce_integrations_modify ON public.ecommerce_integrations
  FOR ALL USING (public.is_organization_member(organization_id, 'admin'))
  WITH CHECK (public.is_organization_member(organization_id, 'admin'));

-- Payment Settings Configuration Table (VPA and keys)
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  razorpay_key_id TEXT,
  razorpay_key_secret TEXT, -- Encrypted client secret
  upi_vpa TEXT,
  upi_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on payment_settings
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_settings_select ON public.payment_settings;
CREATE POLICY payment_settings_select ON public.payment_settings
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS payment_settings_modify ON public.payment_settings;
CREATE POLICY payment_settings_modify ON public.payment_settings
  FOR ALL USING (public.is_organization_member(organization_id, 'admin'))
  WITH CHECK (public.is_organization_member(organization_id, 'admin'));

-- Payment Requests Audit Table
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  payment_method TEXT NOT NULL, -- 'razorpay' | 'upi'
  payment_link_id TEXT, -- Razorpay Payment Link ID
  payment_url TEXT, -- UPI URI or Razorpay checkout short URL
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'expired'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on payment_requests
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_requests_select ON public.payment_requests;
CREATE POLICY payment_requests_select ON public.payment_requests
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS payment_requests_modify ON public.payment_requests;
CREATE POLICY payment_requests_modify ON public.payment_requests
  FOR ALL USING (public.is_organization_member(organization_id, 'admin'))
  WITH CHECK (public.is_organization_member(organization_id, 'admin'));

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.ecommerce_integrations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ecommerce_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.payment_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.payment_requests;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
