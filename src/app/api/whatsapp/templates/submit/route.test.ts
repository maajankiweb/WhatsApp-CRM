import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { submitMessageTemplate } from '@/lib/whatsapp/meta-api';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/whatsapp/encryption', () => ({
  decrypt: vi.fn().mockReturnValue('mock-access-token'),
}));

vi.mock('@/lib/whatsapp/meta-api', () => ({
  submitMessageTemplate: vi.fn(),
}));

vi.mock('@/lib/whatsapp/template-header-handle', () => ({
  ensureImageHeaderHandle: vi.fn(),
}));

const makeChainableMock = (data: any) => {
  const chain: any = {
    select: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation(() => chain),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    upsert: vi.fn().mockImplementation(() => chain),
  };
  chain.then = (onfulfilled: any) => Promise.resolve({ data, error: null }).then(onfulfilled);
  return chain;
};

describe('POST /api/whatsapp/templates/submit', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  const oldEnv = process.env.WHATSAPP_TEMPLATES_DRY_RUN;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  afterEach(() => {
    process.env.WHATSAPP_TEMPLATES_DRY_RUN = oldEnv;
  });

  const createReq = (body: unknown) => {
    return new NextRequest('https://app.test/api/whatsapp/templates/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('returns 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = createReq({});
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 if profile has no organization/account linked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeChainableMock(null);
      }
      return makeChainableMock({});
    });

    const req = createReq({});
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('profile is not linked to an account');
  });

  it('validates template fields correctly (e.g. invalid name)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeChainableMock({ account_id: 'org-123' });
      }
      return makeChainableMock({});
    });

    const req = createReq({
      name: 'Invalid-Name-With-Hyphens',
      category: 'Marketing',
      body_text: 'Hello world',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('name');
  });

  it('submits template successfully in dry-run mode', async () => {
    process.env.WHATSAPP_TEMPLATES_DRY_RUN = 'true';

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeChainableMock({ account_id: 'org-123' });
      }
      if (table === 'message_templates') {
        return makeChainableMock({ id: 'tmpl-999', name: 'valid_name', status: 'PENDING' });
      }
      return makeChainableMock({});
    });

    const req = createReq({
      name: 'valid_name',
      category: 'Marketing',
      language: 'en_US',
      body_text: 'Hello world',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.dry_run).toBe(true);
    expect(data.template.id).toBe('tmpl-999');
  });

  it('calls Meta API and saves template successfully in production mode', async () => {
    process.env.WHATSAPP_TEMPLATES_DRY_RUN = 'false';

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });

    const mockConfig = {
      waba_id: 'waba-777',
      access_token: 'encrypted-token-xyz',
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeChainableMock({ account_id: 'org-123' });
      }
      if (table === 'whatsapp_config') {
        return makeChainableMock(mockConfig);
      }
      if (table === 'message_templates') {
        return makeChainableMock({ id: 'tmpl-555', name: 'marketing_template', status: 'APPROVED' });
      }
      return makeChainableMock({});
    });

    vi.mocked(submitMessageTemplate).mockResolvedValue({
      id: 'meta-id-123',
      status: 'APPROVED',
    });

    const req = createReq({
      name: 'marketing_template',
      category: 'Marketing',
      language: 'en_US',
      body_text: 'Welcome {{1}} to our store',
      sample_values: { body: ['John'] },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.template.status).toBe('APPROVED');
  });
});
