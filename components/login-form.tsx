"use client";

import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
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
      if (!sent) {
        const { error: sendError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (sendError) throw sendError;
        setSent(true);
      } else {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        });
        if (verifyError) throw verifyError;
        router.push("/studio");
        router.refresh();
      }
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
      <div className="field">
        <label htmlFor="email">{sent ? "已发送到" : "邮箱地址"}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required={Boolean(supabase)}
          disabled={sent}
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {sent && (
        <div className="field">
          <label htmlFor="token">6 位验证码</label>
          <input
            id="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            required
            placeholder="123456"
            value={token}
            onChange={(event) => setToken(event.target.value.replace(/\D/g, ""))}
          />
        </div>
      )}
      <button className="btn btn-primary" disabled={loading} type="submit">
        {loading ? (
          <LoaderCircle className="animate-spin" size={15} />
        ) : sent ? (
          <ArrowRight size={15} />
        ) : (
          <Mail size={15} />
        )}
        {!supabase ? "进入演示工作区" : sent ? "验证并登录" : "发送登录验证码"}
      </button>
    </form>
  );
}
