"use client";

import { CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      router.push("/studio");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/studio`;
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
      });
      if (sendError) throw sendError;
      setSent(true);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {!supabase && (
        <div className="notice">
          当前是无需账号的演示模式。连接 Supabase 后，这里会自动启用邮箱验证码登录。
        </div>
      )}
      {error && <div className="notice error">{error}</div>}
      {sent && (
        <div className="notice">
          <strong style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
            <CheckCircle2 size={15} /> 登录邮件已发送
          </strong>
          打开发送到 {email} 的邮件并点击登录按钮，即可回到工坊。
        </div>
      )}
      <div className="field">
        <label htmlFor="email">邮箱地址</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required={Boolean(supabase)}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <button className="btn btn-primary" disabled={loading} type="submit">
        {loading ? (
          <LoaderCircle className="animate-spin" size={15} />
        ) : (
          <Mail size={15} />
        )}
        {!supabase ? "进入演示工作区" : sent ? "重新发送登录邮件" : "发送登录邮件"}
      </button>
    </form>
  );
}
