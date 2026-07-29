"use client";

import { ArrowLeft, Braces, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import type { TemplateKey } from "@/lib/card-schema";
import { createLocalCard } from "@/lib/local-store";
import { templates } from "@/lib/templates";

function NewCardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const created = useRef(false);
  const selected = searchParams.get("template") as TemplateKey | null;

  useEffect(() => {
    if (!selected || created.current) return;
    if (!templates.some((template) => template.key === selected)) return;
    created.current = true;
    const card = createLocalCard(selected);
    void fetch(`/api/cards/${encodeURIComponent(card.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: card.draftConfig }),
    });
    router.replace(`/studio/editor/${card.id}`);
  }, [router, selected]);

  function choose(template: TemplateKey) {
    const card = createLocalCard(template);
    void fetch(`/api/cards/${encodeURIComponent(card.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: card.draftConfig }),
    });
    router.push(`/studio/editor/${card.id}`);
  }

  return (
    <main className="shell" style={{ padding: "36px 0 80px" }}>
      <Link className="btn btn-ghost" href="/studio" style={{ paddingLeft: 0 }}>
        <ArrowLeft size={15} /> 返回工坊
      </Link>
      <div style={{ margin: "44px 0 28px" }}>
        <div className="eyebrow">CHOOSE A STARTING POINT</div>
        <h1 className="section-title" style={{ marginTop: 12 }}>
          先选一张接近目标的卡片。
        </h1>
        <p className="lede" style={{ fontSize: 15, marginTop: 12 }}>
          所有模板都可以修改数据、字段和视觉风格。
        </p>
      </div>
      <section className="template-grid">
        {templates.map((template) => (
          <button
            className="template-tile surface"
            key={template.key}
            onClick={() => choose(template.key)}
            style={{ border: 0, textAlign: "left", cursor: "pointer" }}
            type="button"
          >
            <span className="template-icon" style={{ background: template.accent }}>
              {template.key === "custom-json" ? <Braces size={21} /> : template.icon}
            </span>
            <h3 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {template.name} <ChevronRight size={18} />
            </h3>
            <p>{template.description}</p>
          </button>
        ))}
      </section>
    </main>
  );
}

export default function NewCardPage() {
  return (
    <Suspense
      fallback={
        <main className="shell" style={{ padding: "80px 0" }}>
          <div className="surface" style={{ padding: 32, borderRadius: 24 }}>
            正在打开模板工坊…
          </div>
        </main>
      }
    >
      <NewCardContent />
    </Suspense>
  );
}
