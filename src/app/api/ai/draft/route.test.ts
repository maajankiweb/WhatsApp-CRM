import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from './route';
import { requireRole } from '@/lib/auth/account';
import { loadAiConfig } from '@/lib/ai/config';
import { buildConversationContext } from '@/lib/ai/context';
import { retrieveKnowledge } from '@/lib/ai/knowledge';
import { generateReply } from '@/lib/ai/generate';

// Mock auth requireRole
vi.mock('@/lib/auth/account', () => ({
  requireRole: vi.fn(),
  toErrorResponse: (err: any) => {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: err.status || 500 }
    );
  },
}));

// Mock rate limiting
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ success: true }),
  RATE_LIMITS: {
    aiDraft: {},
    aiDraftAccount: {},
  },
}));

// Mock AI utility layer
vi.mock('@/lib/ai/config', () => ({ loadAiConfig: vi.fn() }));
vi.mock('@/lib/ai/context', () => ({ buildConversationContext: vi.fn() }));
vi.mock('@/lib/ai/knowledge', () => ({ retrieveKnowledge: vi.fn() }));
vi.mock('@/lib/ai/generate', () => ({ generateReply: vi.fn() }));

describe('POST /api/ai/draft', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation of requireRole (resolving agent+ access)
    vi.mocked(requireRole).mockResolvedValue({
      supabase: mockSupabase as any,
      accountId: 'acct-uuid-123',
      userId: 'user-uuid-999',
      role: 'agent',
      account: { id: 'acct-uuid-123', name: 'Test Org' },
    });
  });

  const createReq = (body: unknown) => {
    return new NextRequest('https://app.test/api/ai/draft', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('returns 400 if conversation_id is missing', async () => {
    const req = createReq({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('conversation_id is required');
  });

  it('returns 404 if conversation is not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    const req = createReq({ conversation_id: 'non-existent-conv' });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Conversation not found');
  });

  it('returns 400 if AI assistant config is missing', async () => {
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'conv-123' }, error: null }),
        }),
      }),
    });

    vi.mocked(loadAiConfig).mockResolvedValue(null);

    const req = createReq({ conversation_id: 'conv-123' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Enable it in Settings');
  });

  it('returns 400 if no messages exist in the conversation context', async () => {
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'conv-123' }, error: null }),
        }),
      }),
    });

    vi.mocked(loadAiConfig).mockResolvedValue({
      provider: 'openai',
      apiKey: 'sk-test-key',
    } as any);

    vi.mocked(buildConversationContext).mockResolvedValue([]);

    const req = createReq({ conversation_id: 'conv-123' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('No messages to draft from yet.');
  });

  it('returns drafted suggestion successfully', async () => {
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'conv-123' }, error: null }),
        }),
      }),
    });

    vi.mocked(loadAiConfig).mockResolvedValue({
      provider: 'openai',
      apiKey: 'sk-test-key',
      systemPrompt: 'You are helpful',
    } as any);

    vi.mocked(buildConversationContext).mockResolvedValue([
      { role: 'user', content: 'What is the price?' },
    ]);

    vi.mocked(retrieveKnowledge).mockResolvedValue([
      { title: 'Pricing', content: 'The product costs $10.' },
    ] as any);

    vi.mocked(generateReply).mockResolvedValue({
      text: 'The price is $10.',
      handoff: false,
      usage: null,
    });

    const req = createReq({ conversation_id: 'conv-123' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.draft).toBe('The price is $10.');

    expect(retrieveKnowledge).toHaveBeenCalledWith(
      expect.anything(),
      'acct-uuid-123',
      expect.any(Object),
      'What is the price?'
    );
  });
});
