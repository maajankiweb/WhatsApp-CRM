import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("org_id");

  if (
    !orgId ||
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(orgId)
  ) {
    return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
  }

  // Create service-role admin client to bypass organizations RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: widget, error: widgetErr } = await supabase
    .from("whatsapp_widgets")
    .select("bubble_text, welcome_message, agent_phone, avatar_url, position, theme_color, is_active, organization_id")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (widgetErr) {
    console.error("[Widget API] Error fetching widget:", widgetErr);
    return NextResponse.json({ error: "Failed to retrieve widget config" }, { status: 500 });
  }

  if (!widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  // Fetch organization name
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();

  if (orgErr) {
    console.error("[Widget API] Error fetching organization name:", orgErr);
  }

  const responsePayload = {
    name: org?.name || "WhatsApp Support",
    bubble_text: widget.bubble_text,
    welcome_message: widget.welcome_message,
    agent_phone: widget.agent_phone,
    avatar_url: widget.avatar_url,
    position: widget.position,
    theme_color: widget.theme_color,
    is_active: widget.is_active,
  };

  const response = NextResponse.json(responsePayload);
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");

  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
