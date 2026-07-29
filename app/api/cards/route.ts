import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return Response.json({ mode: "demo", cards: [] });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    mode: "database",
    cards: (data ?? []).map((card) => ({
      id: card.id,
      ownerId: card.owner_id,
      name: card.name,
      description: card.description,
      template: card.template,
      status: card.status,
      draftConfig: card.draft_config,
      currentVersion: card.current_version,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
    })),
  });
}
