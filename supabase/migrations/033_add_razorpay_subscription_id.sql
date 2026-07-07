-- ============================================================
-- 033_add_razorpay_subscription_id.sql — Add razorpay_subscription_id to organizations
-- ============================================================

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;
