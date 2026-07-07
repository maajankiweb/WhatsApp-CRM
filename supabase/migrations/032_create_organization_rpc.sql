-- ============================================================
-- 032_create_organization_rpc.sql — Create Organization RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  p_name TEXT,
  p_slug TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_reserved_slugs TEXT[] := ARRAY['app', 'api', 'www', 'admin', 'auth', 'static'];
BEGIN
  -- 1. Resolve current user ID from Supabase session
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthenticated',
      'message', 'User must be authenticated to create an organization.'
    );
  END IF;

  -- 2. Server-side minimum length check
  IF length(p_slug) < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'slug_too_short',
      'message', 'Slug must be at least 3 characters.'
    );
  END IF;

  -- 2.5 Check reserved slugs
  IF p_slug = ANY(v_reserved_slugs) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'slug_reserved',
      'message', 'This slug is reserved and cannot be used.'
    );
  END IF;

  -- 3. Basic format check (alphanumeric and hyphens only, lowercase)
  IF NOT (p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_slug_format',
      'message', 'Slug must contain only lowercase alphanumeric characters and hyphens, and cannot start or end with a hyphen.'
    );
  END IF;

  -- 4. Check if slug exists BEFORE insert (fast path check)
  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = p_slug) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'slug_taken',
      'message', 'This slug is already taken.'
    );
  END IF;

  -- 5. Atomicity & concurrent race-condition handling using unique violation catch
  BEGIN
    INSERT INTO public.organizations (name, slug, plan, subscription_status)
    VALUES (p_name, p_slug, 'free', 'trialing')
    RETURNING id INTO v_org_id;

    INSERT INTO public.user_organizations (user_id, organization_id, role)
    VALUES (v_user_id, v_org_id, 'owner');

    RETURN jsonb_build_object(
      'success', true,
      'org_id', v_org_id,
      'org_slug', p_slug
    );
  EXCEPTION 
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'slug_taken',
        'message', 'This slug is already taken.'
      );
    WHEN OTHERS THEN
      RAISE WARNING 'create_organization_with_owner failed: %', SQLERRM;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'unknown_error',
        'message', 'Something went wrong. Please try again.'
      );
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_organization_with_owner(TEXT, TEXT) FROM anon, public;
