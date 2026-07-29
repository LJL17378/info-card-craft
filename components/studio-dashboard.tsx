"use client";

import { Copy, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CardPreview } from "@/components/card-preview";
import type { StoredCard } from "@/lib/card-schema";
import {
  deleteLocalCard,
  listLocalCards,
  mergeRemoteCards,
  subscribeLocalCards,
} from "@/lib/local-store";
import { mapToCardData } from "@/lib/mapping";
import { getSampleResponse } from "@/lib/sample-data";

export function StudioDashboard() {
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const update = () => setCards(listLocalCards());
    update();
    fetch("/api/cards")
      .then((response) => response.json())
      .then((payload) => {
        if (payload.mode === "database" && Array.isArray(payload.cards)) {
          mergeRemoteCards(payload.cards);
        }
      })
      .catch(() => {
        // Local demo mode stays fully usable when the database is unavailable.
      });
    return subscribeLocalCards(update);
  }, []);

  async function copyEmbed(card: StoredCard) {
    const origin = window.location.origin;
    const input = card.draftConfig.inputs[0];
    const code = `<script type="module" src="${origin}/embed.js"></script>\n<info-card-craft card-id="${card.id}" input-${input.key}="${input.previewValue ?? input.defaultValue ?? ""}"></info-card-craft>`;
    await navigator.clipboard.writeText(code);
    setCopied(card.id);
    window.setTimeout(() => setCopied(""), 1600);
  }

  return (
    <>
      <div className="shell page-head">
        <div>
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h1>卡片工坊</h1>
          <p className="muted">管理草稿、发布版本和博客嵌入代码。</p>
        </div>
        <Link className="btn btn-primary" href="/studio/new">
          <Plus size={16} /> 新建卡片
        </Link>
      </div>
      <section className="shell card-grid">
        {cards.map((card) => {
          const data = mapToCardData(
            getSampleResponse(card.template),
            card.draftConfig,
          );
          return (
            <article className="project-card surface" key={card.id}>
              <div
                className="project-thumb"
                style={
                  {
                    "--project-accent": card.draftConfig.theme.accent,
                  } as React.CSSProperties
                }
              >
                <CardPreview
                  compact
                  data={data}
                  theme={card.draftConfig.theme}
                />
              </div>
              <div className="project-body">
                <div className="project-meta">
                  <strong>{card.name}</strong>
                  <span
                    className={`status-dot ${card.status === "published" ? "published" : ""}`}
                  >
                    {card.status === "published"
                      ? `已发布 v${card.currentVersion}`
                      : "草稿"}
                  </span>
                </div>
                <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
                  {card.template === "bilibili-user"
                    ? "B 站用户"
                    : card.template === "github-user"
                      ? "GitHub 用户"
                      : "自定义 JSON"}
                </p>
                <div className="project-actions">
                  <Link
                    className="btn btn-secondary"
                    href={`/studio/editor/${card.id}`}
                  >
                    <Pencil size={13} /> 编辑
                  </Link>
                  {card.status === "published" && (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => copyEmbed(card)}
                        type="button"
                      >
                        <Copy size={13} /> {copied === card.id ? "已复制" : "嵌入"}
                      </button>
                      <Link
                        aria-label="打开预览"
                        className="btn btn-secondary"
                        href={`/preview/${card.id}`}
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </>
                  )}
                  {!card.id.startsWith("demo-") && (
                    <button
                      aria-label="删除卡片"
                      className="btn btn-danger"
                      onClick={() => {
                      if (window.confirm(`删除“${card.name}”？`)) {
                          deleteLocalCard(card.id);
                          void fetch(`/api/cards/${encodeURIComponent(card.id)}`, {
                            method: "DELETE",
                          });
                        }
                      }}
                      type="button"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
