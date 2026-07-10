import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockMaybeSingle = vi.fn();
const mockFrom = vi.fn(() => {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: mockMaybeSingle,
  };
});

const mockSupabase = {
  from: mockFrom,
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockSupabase,
}));

describe("GET /api/public/widget-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if org_id is missing or invalid", async () => {
    const req = new NextRequest("http://localhost/api/public/widget-config");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid organization ID");

    const req2 = new NextRequest(
      "http://localhost/api/public/widget-config?org_id=not-a-uuid"
    );
    const res2 = await GET(req2);
    expect(res2.status).toBe(400);
  });

  it("should return 404 if widget config is not found", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const req = new NextRequest(
      "http://localhost/api/public/widget-config?org_id=12345678-1234-1234-1234-1234567890ab"
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Widget not found");
  });

  it("should return the widget configuration and organization name successfully", async () => {
    // First query mock: whatsapp_widgets
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        bubble_text: "Chat",
        welcome_message: "Hi",
        agent_phone: "12345",
        avatar_url: "http://avatar.com/img.png",
        position: "right",
        theme_color: "#25D366",
        is_active: true,
      },
      error: null,
    });

    // Second query mock: organizations
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        name: "Acme Corp",
      },
      error: null,
    });

    const req = new NextRequest(
      "http://localhost/api/public/widget-config?org_id=12345678-1234-1234-1234-1234567890ab"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({
      name: "Acme Corp",
      bubble_text: "Chat",
      welcome_message: "Hi",
      agent_phone: "12345",
      avatar_url: "http://avatar.com/img.png",
      position: "right",
      theme_color: "#25D366",
      is_active: true,
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cache-Control")).toContain("public");
  });
});
