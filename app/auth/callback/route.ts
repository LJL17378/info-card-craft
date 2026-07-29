import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") ? requestedNext : "/studio";
  const destination = new URL(next, request.url);

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? {
      error: new Error("Supabase 未配置"),
    };
    if (!error) return NextResponse.redirect(destination);
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("error", "登录链接无效或已经过期");
  return NextResponse.redirect(login);
}
