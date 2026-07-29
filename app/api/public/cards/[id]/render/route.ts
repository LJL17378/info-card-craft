import { NextRequest } from "next/server";
import { workflowConfigSchema, type PublishedSnapshot } from "@/lib/card-schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTemplate } from "@/lib/templates";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { executeWorkflow } from "@/lib/workflow";

export const runtime = "nodejs";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    Vary: "Origin",
  };
}

function demoSnapshot(id: string): PublishedSnapshot | null {
  const key =
    id === "demo-bilibili"
      ? "bilibili-user"
      : id === "demo-github"
        ? "github-user"
        : id === "demo-json"
          ? "custom-json"
          : null;
  if (!key) return null;
  return {
    cardId: id,
    version: 1,
    config: getTemplate(key).config,
    publishedAt: "2026-07-29T00:00:00.000Z",
  };
}

async function getSnapshot(id: string, version?: number) {
  const demo = demoSnapshot(id);
  if (demo) return demo;
  const admin = createAdminSupabaseClient();
  if (!admin) return null;

  let selectedVersion = version;
  if (!selectedVersion) {
    const { data: card } = await admin
      .from("cards")
      .select("current_version,status")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    selectedVersion = card?.current_version ?? undefined;
  }
  if (!selectedVersion) return null;
  const { data } = await admin
    .from("card_versions")
    .select("card_id,version,snapshot,published_at")
    .eq("card_id", id)
    .eq("version", selectedVersion)
    .maybeSingle();
  if (!data) return null;
  return {
    cardId: data.card_id,
    version: data.version,
    config: workflowConfigSchema.parse(data.snapshot),
    publishedAt: data.published_at,
  } satisfies PublishedSnapshot;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rate = checkRateLimit(`render:${ip}:${id}`, 90);
  if (!rate.allowed) {
    return Response.json(
      { error: "卡片刷新过于频繁" },
      {
        status: 429,
        headers: { ...corsHeaders(), "Retry-After": String(rate.retryAfter) },
      },
    );
  }
  try {
    const versionValue = request.nextUrl.searchParams.get("version");
    const version = versionValue ? Number(versionValue) : undefined;
    const snapshot = await getSnapshot(id, version);
    if (!snapshot) {
      return Response.json(
        { error: "卡片不存在或尚未发布" },
        { status: 404, headers: corsHeaders() },
      );
    }
    const inputs = Object.fromEntries(
      snapshot.config.inputs.map((input) => [
        input.key,
        request.nextUrl.searchParams.get(`input-${input.key}`) ??
          input.defaultValue ??
          "",
      ]),
    );
    const result = await executeWorkflow(snapshot.config, inputs);
    return Response.json(
      {
        cardId: id,
        version: snapshot.version,
        data: result.data,
        theme: snapshot.config.theme,
      },
      {
        headers: {
          ...corsHeaders(),
          "Cache-Control":
            "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "卡片数据加载失败" },
      { status: 502, headers: corsHeaders() },
    );
  }
}
