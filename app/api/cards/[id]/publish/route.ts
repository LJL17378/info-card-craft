import { z } from "zod";
import { workflowConfigSchema } from "@/lib/card-schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const bodySchema = z.object({ config: workflowConfigSchema });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { config } = bodySchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return Response.json({ mode: "demo", version: Date.now() });
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return Response.json({ error: "未登录" }, { status: 401 });

    const { error: saveError } = await supabase.from("cards").upsert(
      {
        id,
        owner_id: auth.user.id,
        name: config.name,
        description: config.description,
        template: config.template,
        draft_config: config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (saveError) {
      return Response.json({ error: saveError.message }, { status: 500 });
    }
    const { data, error } = await supabase.rpc("publish_card", {
      target_card_id: id,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ mode: "database", version: Number(data) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "卡片配置不完整" },
        { status: 400 },
      );
    }
    return Response.json({ error: "发布失败" }, { status: 500 });
  }
}
