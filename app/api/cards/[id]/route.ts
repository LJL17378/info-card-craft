import { z } from "zod";
import { workflowConfigSchema } from "@/lib/card-schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const bodySchema = z.object({ config: workflowConfigSchema });

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { config } = bodySchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    if (!supabase) return Response.json({ mode: "demo", saved: true });
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return Response.json({ error: "未登录" }, { status: 401 });
    const { error } = await supabase.from("cards").upsert(
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
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ mode: "database", saved: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return Response.json({ error: "保存卡片失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return Response.json({ mode: "demo", deleted: true });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "未登录" }, { status: 401 });
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ mode: "database", deleted: true });
}
