"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clipboard,
  Cloud,
  Eye,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CardPreview } from "@/components/card-preview";
import type {
  FieldBinding,
  InputField,
  WorkflowConfig,
} from "@/lib/card-schema";
import { workflowConfigSchema } from "@/lib/card-schema";
import {
  getLocalCard,
  publishLocalCard,
  saveLocalCard,
} from "@/lib/local-store";
import { collectJsonPaths, mapToCardData } from "@/lib/mapping";
import { getSampleResponse } from "@/lib/sample-data";

const steps = [
  ["基础信息", "卡片名字与模板"],
  ["输入参数", "给读者留下变量"],
  ["数据请求", "连接公开 GET API"],
  ["字段解析", "点选并映射数据"],
  ["卡片设计", "布局与视觉风格"],
  ["预览发布", "生成嵌入代码"],
] as const;

const mappingFields: Array<{
  key: keyof WorkflowConfig["mapping"];
  label: string;
}> = [
  { key: "avatar", label: "头像" },
  { key: "title", label: "标题" },
  { key: "subtitle", label: "副标题" },
  { key: "badge", label: "徽章" },
  { key: "description", label: "描述" },
  { key: "background", label: "背景图" },
  { key: "url", label: "跳转链接" },
];

export function CardEditor({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [step, setStep] = useState(0);
  const [rawData, setRawData] = useState<unknown>(null);
  const [testing, setTesting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const card = getLocalCard(cardId);
      if (!card) {
        router.replace("/studio");
        return;
      }
      setConfig(card.draftConfig);
      setPublishedVersion(card.currentVersion);
      setRawData(getSampleResponse(card.template));
      hydrated.current = true;
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [cardId, router]);

  useEffect(() => {
    if (!config || !hydrated.current) return;
    const timeout = window.setTimeout(() => {
      saveLocalCard(cardId, config);
      void fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [cardId, config]);

  const previewData = useMemo(
    () => (config && rawData !== null ? mapToCardData(rawData, config) : null),
    [config, rawData],
  );

  const previewInputs = useMemo(() => {
    if (!config) return {};
    return Object.fromEntries(
      config.inputs.map((input) => [
        input.key,
        input.previewValue ?? input.defaultValue ?? "",
      ]),
    );
  }, [config]);

  const embedCode = useMemo(() => {
    if (!config) return "";
    const attributes = config.inputs
      .map(
        (input) =>
          `  input-${input.key}="${input.previewValue ?? input.defaultValue ?? ""}"`,
      )
      .join("\n");
    const origin =
      typeof window === "undefined"
        ? "https://your-domain.vercel.app"
        : window.location.origin;
    return `<script type="module"\n  src="${origin}/embed.js">\n</script>\n\n<info-card-craft\n  card-id="${cardId}"\n${attributes}>\n</info-card-craft>`;
  }, [cardId, config]);

  function patch(patchValue: Partial<WorkflowConfig>) {
    setConfig((current) => (current ? { ...current, ...patchValue } : current));
  }

  function patchInput(index: number, value: Partial<InputField>) {
    if (!config) return;
    const inputs = [...config.inputs];
    inputs[index] = { ...inputs[index], ...value };
    patch({ inputs });
  }

  function patchBinding(
    key: keyof WorkflowConfig["mapping"],
    value: Partial<FieldBinding>,
  ) {
    if (!config || key === "stats") return;
    const previous = config.mapping[key] as FieldBinding | undefined;
    patch({
      mapping: {
        ...config.mapping,
        [key]: { path: "", formatters: [], ...previous, ...value },
      },
    });
  }

  async function testWorkflow() {
    if (!config) return;
    setTesting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/workflows/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, inputs: previewInputs }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "请求测试失败");
      setRawData(payload.raw);
      setMessage(payload.cached ? "测试成功，使用了缓存数据。" : "测试成功，字段树已更新。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "请求失败");
    } finally {
      setTesting(false);
    }
  }

  async function publish() {
    if (!config) return;
    setPublishing(true);
    setError("");
    try {
      const valid = workflowConfigSchema.parse(config);
      const response = await fetch(`/api/cards/${cardId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: valid }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "发布失败");
      const card = publishLocalCard(cardId, valid);
      setPublishedVersion(payload.version ?? card.currentVersion);
      setMessage(
        payload.mode === "demo"
          ? "已发布演示版本。连接 Supabase 后会自动切换为持久化公开版本。"
          : `版本 v${payload.version} 已发布。`,
      );
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "发布失败");
    } finally {
      setPublishing(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!config) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <LoaderCircle className="animate-spin" size={24} />
      </main>
    );
  }

  return (
    <main className="editor-shell">
      <header className="editor-top">
        <div className="editor-title">
          <Link className="btn btn-secondary" href="/studio" aria-label="返回工坊">
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1>{config.name}</h1>
            <span className="muted" style={{ fontSize: 11 }}>
              {publishedVersion ? `已发布 v${publishedVersion}` : "尚未发布"} · 自动保存
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              saveLocalCard(cardId, config);
              setMessage("草稿已保存。");
            }}
            type="button"
          >
            <Save size={14} /> 保存
          </button>
          <button className="btn btn-coral" onClick={publish} disabled={publishing} type="button">
            {publishing ? <LoaderCircle className="animate-spin" size={14} /> : <Cloud size={14} />}
            发布
          </button>
        </div>
      </header>

      <div className="editor-layout">
        <section className="editor-panel surface">
          <aside className="step-sidebar" aria-label="编辑步骤">
            {steps.map(([label], index) => (
              <button
                aria-label={`${index + 1} ${label}`}
                className={`step-button ${index === step ? "active" : ""}`}
                key={label}
                onClick={() => {
                  setStep(index);
                  setError("");
                  setMessage("");
                }}
                type="button"
              >
                <span>{index + 1}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </aside>
          <div className="step-content">
            <h2>{steps[step][0]}</h2>
            <p>{steps[step][1]}</p>
            {error && <div className="notice error">{error}</div>}
            {message && <div className="notice">{message}</div>}

            {step === 0 && (
              <>
                <div className="field">
                  <label htmlFor="card-name">卡片名称</label>
                  <input
                    id="card-name"
                    value={config.name}
                    onChange={(event) => patch({ name: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="card-description">项目描述</label>
                  <textarea
                    id="card-description"
                    value={config.description}
                    onChange={(event) => patch({ description: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label>模板</label>
                  <div className="input-card">
                    <strong>
                      {config.template === "bilibili-user"
                        ? "B 站用户"
                        : config.template === "github-user"
                          ? "GitHub 用户"
                          : "自定义 JSON API"}
                    </strong>
                    <p className="muted" style={{ fontSize: 11, margin: "6px 0 0" }}>
                      模板决定默认连接器和字段结构，新建后不再切换。
                    </p>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                {config.inputs.map((input, index) => (
                  <div className="input-card" key={`${input.key}-${index}`}>
                    <div className="field-row">
                      <div className="field">
                        <label>参数名</label>
                        <input
                          value={input.key}
                          onChange={(event) =>
                            patchInput(index, {
                              key: event.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, ""),
                            })
                          }
                        />
                      </div>
                      <div className="field">
                        <label>显示名称</label>
                        <input
                          value={input.label}
                          onChange={(event) => patchInput(index, { label: event.target.value })}
                        />
                      </div>
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label>类型</label>
                        <select
                          value={input.type}
                          onChange={(event) =>
                            patchInput(index, {
                              type: event.target.value as InputField["type"],
                            })
                          }
                        >
                          <option value="string">文本</option>
                          <option value="number">数字</option>
                          <option value="boolean">布尔值</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>预览值</label>
                        <input
                          value={String(input.previewValue ?? "")}
                          onChange={(event) =>
                            patchInput(index, { previewValue: event.target.value })
                          }
                        />
                      </div>
                    </div>
                    {config.inputs.length > 1 && (
                      <button
                        className="btn btn-danger"
                        onClick={() =>
                          patch({ inputs: config.inputs.filter((_, itemIndex) => itemIndex !== index) })
                        }
                        type="button"
                      >
                        <Trash2 size={13} /> 删除参数
                      </button>
                    )}
                  </div>
                ))}
                {config.inputs.length < 8 && (
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      patch({
                        inputs: [
                          ...config.inputs,
                          {
                            key: `param-${config.inputs.length + 1}`,
                            label: `参数 ${config.inputs.length + 1}`,
                            type: "string",
                            required: false,
                            defaultValue: "",
                            previewValue: "",
                          },
                        ],
                      })
                    }
                    type="button"
                  >
                    <Plus size={14} /> 添加参数
                  </button>
                )}
              </>
            )}

            {step === 2 && (
              <>
                {config.template !== "custom-json" && (
                  <div className="notice">
                    官方模板使用经过审核的固定公开接口。你仍可以修改输入参数，但不能改变目标域名。
                  </div>
                )}
                <div className="field">
                  <label htmlFor="request-method">请求方式</label>
                  <input id="request-method" value="GET" readOnly />
                </div>
                <div className="field">
                  <label htmlFor="request-url">请求 URL</label>
                  <textarea
                    id="request-url"
                    readOnly={config.template !== "custom-json"}
                    value={config.request.url}
                    onChange={(event) =>
                      patch({ request: { ...config.request, url: event.target.value } })
                    }
                    spellCheck={false}
                  />
                  <span className="muted" style={{ fontSize: 11 }}>
                    使用 {"{{参数名}}"} 插入输入值，仅允许公开 HTTPS 地址。
                  </span>
                </div>
                <button className="btn btn-primary" onClick={testWorkflow} disabled={testing} type="button">
                  {testing ? <LoaderCircle className="animate-spin" size={14} /> : <Eye size={14} />}
                  测试请求
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <div className="mapping-list">
                  {mappingFields.map(({ key, label }) => {
                    const binding = config.mapping[key] as FieldBinding | undefined;
                    return (
                      <div className="mapping-row" key={key}>
                        <label>{label}</label>
                        <input
                          className="control"
                          value={binding?.path ?? ""}
                          placeholder="data.user.name"
                          onChange={(event) => patchBinding(key, { path: event.target.value })}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="field-label" style={{ margin: "20px 0 9px" }}>
                  响应字段树
                </div>
                <div className="json-tree">
                  {rawData === null ? (
                    <p style={{ padding: 8, color: "#aaa7b4", fontSize: 11 }}>
                      先运行一次测试请求。
                    </p>
                  ) : (
                    collectJsonPaths(rawData).map((item) => (
                      <button
                        className="json-path"
                        key={item.path}
                        onClick={() => {
                          void navigator.clipboard.writeText(item.path);
                          setMessage(`已复制字段路径：${item.path}`);
                        }}
                        title="点击复制字段路径"
                        type="button"
                      >
                        <span>{item.path}</span>
                        <em>{String(item.value)}</em>
                      </button>
                    ))
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: 12 }}
                  onClick={testWorkflow}
                  disabled={testing}
                  type="button"
                >
                  {testing ? <LoaderCircle className="animate-spin" size={14} /> : <Eye size={14} />}
                  刷新字段树
                </button>
              </>
            )}

            {step === 4 && (
              <>
                <div className="field">
                  <label>排版方向</label>
                  <div className="segmented">
                    {(["horizontal", "vertical"] as const).map((direction) => (
                      <button
                        className={config.theme.direction === direction ? "active" : ""}
                        key={direction}
                        onClick={() =>
                          patch({ theme: { ...config.theme, direction } })
                        }
                        type="button"
                      >
                        {direction === "horizontal" ? "横向宽卡片" : "纵向窄卡片"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="accent">强调色</label>
                    <input
                      id="accent"
                      type="color"
                      value={config.theme.accent}
                      onChange={(event) =>
                        patch({ theme: { ...config.theme, accent: event.target.value } })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="surface">卡片底色</label>
                    <input
                      id="surface"
                      type="color"
                      value={config.theme.surface}
                      onChange={(event) =>
                        patch({ theme: { ...config.theme, surface: event.target.value } })
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label>明暗模式</label>
                  <div className="segmented">
                    {(["light", "dark"] as const).map((mode) => (
                      <button
                        className={config.theme.mode === mode ? "active" : ""}
                        key={mode}
                        onClick={() =>
                          patch({
                            theme: {
                              ...config.theme,
                              mode,
                              surface: mode === "dark" ? "#202126" : "#fffdf9",
                            },
                          })
                        }
                        type="button"
                      >
                        {mode === "light" ? "浅色" : "深色"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="radius">圆角：{config.theme.radius}px</label>
                  <input
                    id="radius"
                    type="range"
                    min="8"
                    max="32"
                    value={config.theme.radius}
                    onChange={(event) =>
                      patch({
                        theme: { ...config.theme, radius: Number(event.target.value) },
                      })
                    }
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>内容密度</label>
                    <select
                      value={config.theme.density}
                      onChange={(event) =>
                        patch({
                          theme: {
                            ...config.theme,
                            density: event.target.value as "compact" | "comfortable",
                          },
                        })
                      }
                    >
                      <option value="comfortable">舒适</option>
                      <option value="compact">紧凑</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>阴影</label>
                    <select
                      value={config.theme.shadow ? "on" : "off"}
                      onChange={(event) =>
                        patch({
                          theme: { ...config.theme, shadow: event.target.value === "on" },
                        })
                      }
                    >
                      <option value="on">显示</option>
                      <option value="off">关闭</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="publish-box">
                  <strong>发布检查</strong>
                  {[
                    "输入参数已定义",
                    "数据请求使用公开 GET 接口",
                    "标题字段已映射",
                    "卡片主题配置完成",
                  ].map((item) => (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginTop: 10,
                        color: "var(--muted)",
                        fontSize: 12,
                      }}
                    >
                      <Check size={13} color="var(--mint)" /> {item}
                    </div>
                  ))}
                </div>
                <button className="btn btn-coral" onClick={publish} disabled={publishing} type="button">
                  {publishing ? <LoaderCircle className="animate-spin" size={14} /> : <Cloud size={14} />}
                  {publishedVersion ? "发布新版本" : "发布第一版"}
                </button>
                <div className="field-label" style={{ margin: "24px 0 9px" }}>
                  嵌入代码
                </div>
                <div className="code-window">
                  <div className="code-window-head">
                    <div className="traffic-lights">
                      <i style={{ background: "#ff5f57" }} />
                      <i style={{ background: "#febc2e" }} />
                      <i style={{ background: "#28c840" }} />
                    </div>
                    <button
                      className="btn btn-ghost"
                      onClick={copyCode}
                      style={{ minHeight: 30, color: "#c7c5cf", padding: "0 7px" }}
                      type="button"
                    >
                      <Clipboard size={12} /> {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                  <pre>{embedCode}</pre>
                </div>
              </>
            )}

            <div
              style={{
                marginTop: 28,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <button
                className="btn btn-secondary"
                disabled={step === 0}
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                type="button"
              >
                上一步
              </button>
              {step < steps.length - 1 && (
                <button
                  className="btn btn-primary"
                  onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                  type="button"
                >
                  下一步 <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="preview-panel">
          <div className="preview-toolbar">
            <div className="traffic-lights">
              <i style={{ background: "#ff5f57" }} />
              <i style={{ background: "#febc2e" }} />
              <i style={{ background: "#28c840" }} />
            </div>
            <span className="muted" style={{ fontSize: 11 }}>
              实时预览 · {config.theme.direction === "horizontal" ? "横向" : "纵向"}
            </span>
          </div>
          <div className="preview-canvas">
            <CardPreview
              data={previewData ?? undefined}
              theme={config.theme}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
