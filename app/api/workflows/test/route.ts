import { NextRequest } from "next/server";
import { z } from "zod";
import { workflowConfigSchema } from "@/lib/card-schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { SafeFetchError } from "@/lib/safe-fetch";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { executeWorkflow } from "@/lib/workflow";

export const runtime = "nodejs";

const bodySchema = z.object({
  config: workflowConfigSchema,
  inputs: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rate = checkRateLimit(`test:${ip}`, 20);
  if (!rate.allowed) {
    return Response.json(
      { error: "测试请求过于频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    const { data } = (await supabase?.auth.getUser()) ?? {};
    if (!data?.user) {
      return Response.json({ error: "请先登录后再测试数据源" }, { status: 401 });
    }
  }

  try {
    const body = bodySchema.parse(await request.json());
    const result = await executeWorkflow(body.config, body.inputs);
    return Response.json({ ...result, cached: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "工作流配置不完整" },
        { status: 400 },
      );
    }
    const status = error instanceof SafeFetchError ? error.status : 500;
    return Response.json(
      { error: error instanceof Error ? error.message : "工作流执行失败" },
      { status },
    );
  }
}
