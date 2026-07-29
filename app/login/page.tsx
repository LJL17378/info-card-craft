import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { SiteNav } from "@/components/site-nav";

export const metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <>
      <SiteNav />
      <main className="login-wrap">
        <section className="login-card surface">
          <Link className="brand" href="/">
            <span className="brand-mark">C</span>
          </Link>
          <h1>回到你的工坊。</h1>
          <p className="muted" style={{ lineHeight: 1.7, fontSize: 14 }}>
            无需密码，我们会向你的邮箱发送一次性验证码。
          </p>
          <LoginForm />
        </section>
      </main>
    </>
  );
}
