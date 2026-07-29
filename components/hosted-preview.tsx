"use client";

import { ArrowLeft, Clipboard, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CardPreview } from "@/components/card-preview";
import type { CardData, CardTheme, WorkflowConfig } from "@/lib/card-schema";
import { getLocalCard } from "@/lib/local-store";

export function HostedPreview({ cardId }: { cardId: string }) {
  const [data, setData] = useState<CardData | null>(null);
  const [theme, setTheme] = useState<CardTheme | null>(null);
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    if (!config || typeof window === "undefined") return "";
    const attrs = config.inputs
      .map((input) => `  input-${input.key}="${input.previewValue ?? input.defaultValue ?? ""}"`)
      .join("\n");
    return `<script type="module" src="${window.location.origin}/embed.js"></script>\n\n<info-card-craft\n  card-id="${cardId}"\n${attrs}>\n</info-card-craft>`;
  }, [cardId, config]);

  useEffect(() => {
    const local = getLocalCard(cardId);
    const configTimer = window.setTimeout(() => {
      if (local) setConfig(local.draftConfig);
    }, 0);
    const inputSource = local?.draftConfig;
    const query = new URLSearchParams();
    if (inputSource) {
      for (const input of inputSource.inputs) {
        query.set(`input-${input.key}`, String(input.previewValue ?? input.defaultValue ?? ""));
      }
    }
    fetch(`/api/public/cards/${encodeURIComponent(cardId)}/render?${query}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setData(payload.data);
        setTheme(payload.theme);
        if (!local && cardId === "demo-bilibili") {
          const { getTemplate } = await import("@/lib/templates");
          setConfig(getTemplate("bilibili-user").config);
        } else if (!local && cardId === "demo-github") {
          const { getTemplate } = await import("@/lib/templates");
          setConfig(getTemplate("github-user").config);
        }
      })
      .catch(async (fetchError) => {
        if (!local) {
          setError(fetchError instanceof Error ? fetchError.message : "加载失败");
          return;
        }
        try {
          const inputs = Object.fromEntries(
            local.draftConfig.inputs.map((input) => [
              input.key,
              input.previewValue ?? input.defaultValue ?? "",
            ]),
          );
          const response = await fetch("/api/workflows/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: local.draftConfig, inputs }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error);
          setData(payload.data);
          setTheme(local.draftConfig.theme);
        } catch (fallbackError) {
          setError(fallbackError instanceof Error ? fallbackError.message : "加载失败");
        }
      });
    return () => window.clearTimeout(configTimer);
  }, [cardId]);

  return (
    <main className="shell" style={{ padding: "32px 0 70px" }}>
      <div className="editor-top">
        <Link className="btn btn-secondary" href="/studio">
          <ArrowLeft size={14} /> 返回工坊
        </Link>
        {config && (
          <button
            className="btn btn-primary"
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            type="button"
          >
            <Clipboard size={14} /> {copied ? "已复制" : "复制嵌入代码"}
          </button>
        )}
      </div>
      <section
        className="preview-panel"
        style={{ minHeight: "min(640px, calc(100vh - 140px))", borderRadius: 28 }}
      >
        <div className="preview-toolbar">
          <div className="traffic-lights">
            <i style={{ background: "#ff5f57" }} />
            <i style={{ background: "#febc2e" }} />
            <i style={{ background: "#28c840" }} />
          </div>
          <span className="muted" style={{ fontSize: 11 }}>公开托管预览</span>
        </div>
        <div className="preview-canvas">
          {error ? (
            <div className="notice error">{error}</div>
          ) : data && theme ? (
            <CardPreview data={data} theme={theme} />
          ) : (
            <LoaderCircle className="animate-spin" size={24} />
          )}
        </div>
      </section>
      {code && (
        <div style={{ maxWidth: 760, margin: "26px auto 0" }}>
          <div className="code-window">
            <div className="code-window-head">
              <div className="traffic-lights">
                <i style={{ background: "#ff5f57" }} />
                <i style={{ background: "#febc2e" }} />
                <i style={{ background: "#28c840" }} />
              </div>
              <span style={{ fontSize: 10, color: "#aaa7b4" }}>embed.html</span>
            </div>
            <pre>{code}</pre>
          </div>
        </div>
      )}
    </main>
  );
}
