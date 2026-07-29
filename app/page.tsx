import { ArrowRight, Braces, Cable, LayoutTemplate, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CardPreview } from "@/components/card-preview";
import { SiteNav } from "@/components/site-nav";
import { getTemplate, templates } from "@/lib/templates";

const workflowSteps = ["定义参数", "编排接口", "检查响应", "组合区块", "设计卡片", "发布嵌入"];

export default function HomePage() {
  const heroTheme = getTemplate("bilibili-user").config.theme;
  return (
    <>
      <SiteNav />
      <main>
        <section className="shell hero">
          <div>
            <div className="eyebrow">API → CARD → BLOG</div>
            <h1 className="display">把流动的数据，做成博客的一部分。</h1>
            <p className="lede">
              编排多个公开 API，把跨接口字段组合成自由内容区块，再发布为动态卡片。
              不用写组件，也不必被某个博客框架绑定。
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/studio/new">
                开始做一张卡片 <ArrowRight size={16} />
              </Link>
              <Link className="btn btn-secondary" href="/preview/demo-bilibili">
                查看在线示例
              </Link>
            </div>
          </div>
          <div className="hero-stage">
            <span className="floating-note one">
              <Cable size={13} style={{ display: "inline", marginRight: 6 }} />
              数据自动更新
            </span>
            <span className="floating-note two">
              <ShieldCheck size={13} style={{ display: "inline", marginRight: 6 }} />
              Shadow DOM 隔离
            </span>
            <div style={{ position: "relative", zIndex: 2, transform: "rotate(2deg)" }}>
              <CardPreview
                theme={heroTheme}
                data={{
                  identity: {
                    avatar: "",
                    title: "dogz警犬儿",
                    subtitle: "用作品记录热爱",
                    badge: "LV6",
                  },
                  content: {
                    description: "“致朦盖上的擦伤，童年的时光和青春心事。”",
                    background: "",
                  },
                  stats: [
                    { label: "关注", value: "986" },
                    { label: "粉丝", value: "31万" },
                    { label: "获赞", value: "98万" },
                    { label: "投稿", value: "212" },
                  ],
                  actions: { label: "查看主页", url: "https://space.bilibili.com/7900967" },
                  blocks: [],
                }}
              />
            </div>
          </div>
        </section>

        <section className="shell workflow-strip" id="workflow">
          <div className="eyebrow">A GUIDED WORKFLOW</div>
          <h2 className="section-title" style={{ marginTop: 10 }}>
            六步，从接口到博客。
          </h2>
          <div className="steps-row">
            {workflowSteps.map((step, index) => (
              <div className="step-chip surface" key={step}>
                <span className="step-number">{index + 1}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="templates-section" id="templates">
          <div className="shell">
            <div className="eyebrow">START WITH A TEMPLATE</div>
            <h2 className="section-title" style={{ marginTop: 10 }}>
              不从空白画布开始。
            </h2>
            <p className="lede" style={{ fontSize: 15, marginTop: 14 }}>
              先选一个接近目标的模板，再把内容、布局和风格改成你自己的。
            </p>
            <div className="template-grid">
              {templates.map((template) => (
                <Link
                  className="template-tile surface"
                  href={`/studio/new?template=${template.key}`}
                  key={template.key}
                >
                  <span className="template-icon" style={{ background: template.accent }}>
                    {template.key === "custom-json" ? <Braces size={21} /> : template.icon}
                  </span>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="shell" style={{ padding: "82px 0" }}>
          <div
            className="surface"
            style={{
              borderRadius: 30,
              padding: "clamp(28px, 6vw, 70px)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 30,
            }}
          >
            <div>
              <LayoutTemplate size={28} color="var(--coral)" />
              <h2 className="section-title" style={{ marginTop: 18 }}>
                一段 HTML，处处可用。
              </h2>
              <p className="muted" style={{ lineHeight: 1.7 }}>
                普通 HTML、WordPress、Vue、React、Astro，都使用同一个轻量组件。
              </p>
            </div>
            <Link className="btn btn-coral" href="/studio/new">
              创建卡片 <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="shell footer">
        <span>© 2026 Info Card Craft</span>
        <span>为开放的 Web 而做。</span>
      </footer>
    </>
  );
}
