"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Braces,
  Check,
  Clipboard,
  Cloud,
  Eye,
  GripVertical,
  ImageIcon,
  LayoutGrid,
  Link2,
  LoaderCircle,
  Plus,
  Save,
  Text,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CardPreview } from "@/components/card-preview";
import type {
  CardBlock,
  FieldBinding,
  InputField,
  RequestConfig,
  WorkflowConfig,
} from "@/lib/card-schema";
import { workflowConfigSchema } from "@/lib/card-schema";
import { getLocalCard, publishLocalCard, saveLocalCard } from "@/lib/local-store";
import { collectJsonPaths, mapToCardData } from "@/lib/mapping";
import { getSampleResponse } from "@/lib/sample-data";

const steps = [
  ["项目", "名称与运行参数"],
  ["数据源", "编排多个公开接口"],
  ["解析", "检查全部响应字段"],
  ["内容", "自由组合卡片区块"],
  ["视觉", "尺寸、质感与布局"],
  ["发布", "生成可嵌入组件"],
] as const;

const blockMeta = {
  hero: { label: "人物标题", icon: UserRound },
  text: { label: "文本内容", icon: Text },
  stats: { label: "指标网格", icon: LayoutGrid },
  image: { label: "图片", icon: ImageIcon },
  links: { label: "操作链接", icon: Link2 },
  divider: { label: "分隔线", icon: GripVertical },
} as const;

function binding(path = "", fallback?: string): FieldBinding {
  return { path, fallback, formatters: [] };
}

function BindingControl({
  label,
  value,
  paths,
  onChange,
}: {
  label: string;
  value?: FieldBinding;
  paths: string[];
  onChange: (value: FieldBinding) => void;
}) {
  return (
    <div className="binding-control" data-path-count={paths.length}>
      <label>{label}</label>
      <div className="binding-fields">
        <input
          list="response-paths"
          value={value?.path ?? ""}
          placeholder="requests.source.field"
          onChange={(event) =>
            onChange({ path: event.target.value, fallback: value?.fallback, formatters: value?.formatters ?? [] })
          }
        />
        <input
          value={String(value?.fallback ?? "")}
          placeholder="空值回退"
          onChange={(event) =>
            onChange({ path: value?.path ?? "", fallback: event.target.value, formatters: value?.formatters ?? [] })
          }
        />
      </div>
    </div>
  );
}

function createBlock(type: CardBlock["type"]): CardBlock {
  const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
  if (type === "hero") {
    return {
      id, type, hidden: false, align: "left",
      title: binding("", "新的标题"),
      subtitle: binding("", "补充说明"),
    };
  }
  if (type === "text") {
    return { id, type, hidden: false, label: "SECTION", content: binding("", "一段自定义内容") };
  }
  if (type === "stats") {
    return {
      id, type, hidden: false, columns: 3,
      items: [{ label: "指标", value: binding("", "—") }],
    };
  }
  if (type === "image") {
    return { id, type, hidden: false, src: binding(""), alt: "", ratio: "wide" };
  }
  if (type === "links") {
    return {
      id, type, hidden: false,
      items: [{ label: "查看详情", url: binding(""), style: "primary" }],
    };
  }
  return { id, type, hidden: false };
}

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
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [cardId, config]);

  const paths = useMemo(
    () => rawData === null ? [] : collectJsonPaths(rawData).map((item) => item.path),
    [rawData],
  );
  const previewData = useMemo(
    () => config && rawData !== null ? mapToCardData(rawData, config) : null,
    [config, rawData],
  );
  const previewInputs = useMemo(
    () => config
      ? Object.fromEntries(config.inputs.map((item) => [
          item.key, item.previewValue ?? item.defaultValue ?? "",
        ]))
      : {},
    [config],
  );
  const embedCode = useMemo(() => {
    if (!config) return "";
    const origin = typeof window === "undefined" ? "https://info-card-craft.vercel.app" : window.location.origin;
    const attrs = config.inputs
      .map((item) => `  input-${item.key}="${item.previewValue ?? item.defaultValue ?? ""}"`)
      .join("\n");
    return `<script type="module"\n  src="${origin}/embed.js">\n</script>\n\n<info-card-craft\n  card-id="${cardId}"\n${attrs}>\n</info-card-craft>`;
  }, [cardId, config]);

  function patch(value: Partial<WorkflowConfig>) {
    setConfig((current) => current ? { ...current, ...value } : current);
  }

  function patchInput(index: number, value: Partial<InputField>) {
    if (!config) return;
    const inputs = [...config.inputs];
    inputs[index] = { ...inputs[index], ...value };
    patch({ inputs });
  }

  function patchRequest(index: number, value: Partial<RequestConfig>) {
    if (!config) return;
    const requests = [...config.requests];
    requests[index] = { ...requests[index], ...value };
    patch({ requests });
  }

  function patchBlock(index: number, value: CardBlock) {
    if (!config?.layout) return;
    const blocks = [...config.layout.blocks];
    blocks[index] = value;
    patch({ layout: { blocks } });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    if (!config?.layout) return;
    const target = index + direction;
    if (target < 0 || target >= config.layout.blocks.length) return;
    const blocks = [...config.layout.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    patch({ layout: { blocks } });
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
      setMessage(`已完成 ${config.requests.length} 个数据源，响应字段树已更新。`);
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
      const local = publishLocalCard(cardId, valid);
      setPublishedVersion(payload.version ?? local.currentVersion);
      setMessage(payload.mode === "demo" ? "演示版本已发布。" : `版本 v${payload.version} 已发布。`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "发布失败");
    } finally {
      setPublishing(false);
    }
  }

  if (!config) {
    return <main className="editor-loading"><LoaderCircle className="animate-spin" size={24} /></main>;
  }

  return (
    <main className="editor-shell">
      <datalist id="response-paths">
        {paths.map((path) => <option key={path} value={path} />)}
      </datalist>
      <header className="editor-top">
        <div className="editor-title">
          <Link className="icon-btn" href="/studio" aria-label="返回工坊"><ArrowLeft size={16} /></Link>
          <div>
            <h1>{config.name}</h1>
            <span>{publishedVersion ? `已发布 v${publishedVersion}` : "草稿"} · 自动保存</span>
          </div>
        </div>
        <div className="editor-actions">
          <button className="btn btn-secondary" onClick={() => {
            saveLocalCard(cardId, config);
            setMessage("草稿已保存。");
          }} type="button"><Save size={14} /> 保存</button>
          <button className="btn btn-primary" onClick={publish} disabled={publishing} type="button">
            {publishing ? <LoaderCircle className="animate-spin" size={14} /> : <Cloud size={14} />}
            发布
          </button>
        </div>
      </header>

      <div className="editor-layout editor-layout-v2">
        <section className="editor-panel surface">
          <aside className="step-sidebar" aria-label="编辑步骤">
            <div className="step-sidebar-title">WORKFLOW</div>
            {steps.map(([label], index) => (
              <button
                aria-label={`${index + 1} ${label}`}
                className={`step-button ${index === step ? "active" : ""}`}
                key={label}
                onClick={() => { setStep(index); setError(""); setMessage(""); }}
                type="button"
              >
                <span>{index + 1}</span><strong>{label}</strong>
                {index < step && <Check size={13} />}
              </button>
            ))}
            <div className="workflow-summary">
              <Braces size={14} />
              <div><strong>{config.requests.length}</strong><span>数据源</span></div>
              <div><strong>{config.layout?.blocks.length ?? 0}</strong><span>内容区块</span></div>
            </div>
          </aside>

          <div className="step-content">
            <div className="step-heading">
              <span>0{step + 1}</span>
              <div><h2>{steps[step][0]}</h2><p>{steps[step][1]}</p></div>
            </div>
            {error && <div className="notice error">{error}</div>}
            {message && <div className="notice success">{message}</div>}

            {step === 0 && (
              <>
                <div className="field">
                  <label htmlFor="card-name">卡片名称</label>
                  <input id="card-name" value={config.name} onChange={(e) => patch({ name: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="card-description">项目描述</label>
                  <textarea id="card-description" value={config.description} onChange={(e) => patch({ description: e.target.value })} />
                </div>
                <div className="subsection-head"><div><strong>运行参数</strong><span>嵌入时通过 input-* 传入</span></div></div>
                {config.inputs.map((input, index) => (
                  <div className="config-card parameter-card" key={`${input.key}-${index}`}>
                    <div className="parameter-card-head">
                      <span>PARAM {String(index + 1).padStart(2, "0")}</span>
                      <strong>{input.label || `参数 ${index + 1}`}</strong>
                    </div>
                    <div className="config-card-grid">
                      <div className="field"><label>参数标识</label><input value={input.key} onChange={(e) => patchInput(index, { key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} /></div>
                      <div className="field"><label>显示名称</label><input value={input.label} onChange={(e) => patchInput(index, { label: e.target.value })} /></div>
                      <div className="field"><label>类型</label><select value={input.type} onChange={(e) => patchInput(index, { type: e.target.value as InputField["type"] })}><option value="string">文本</option><option value="number">数字</option><option value="boolean">布尔</option></select></div>
                      <div className="field"><label>预览值</label><input value={String(input.previewValue ?? "")} onChange={(e) => patchInput(index, { previewValue: e.target.value })} /></div>
                    </div>
                    {config.inputs.length > 1 && <button className="inline-danger" onClick={() => patch({ inputs: config.inputs.filter((_, i) => i !== index) })} type="button"><Trash2 size={12} /> 删除</button>}
                  </div>
                ))}
                {config.inputs.length < 12 && <button className="add-row" onClick={() => patch({ inputs: [...config.inputs, { key: `param-${config.inputs.length + 1}`, label: `参数 ${config.inputs.length + 1}`, type: "string", required: false, previewValue: "" }] })} type="button"><Plus size={14} /> 添加运行参数</button>}
              </>
            )}

            {step === 1 && (
              <>
                <div className="orchestration-note">
                  <strong>按顺序执行</strong>
                  <span>请求中可用 <code>{"{{input.id}}"}</code>，后续请求还可读取 <code>{"{{requests.source.field}}"}</code>。</span>
                </div>
                <div className="source-stack">
                  {config.requests.map((request, index) => (
                    <div className="source-card" key={`${request.id}-${index}`}>
                      <div className="source-rail"><span>{index + 1}</span>{index < config.requests.length - 1 && <i />}</div>
                      <div className="source-content">
                        <div className="source-head">
                          <div><strong>{request.name}</strong><span>响应命名空间：requests.{request.id}</span></div>
                          {request.type === "http" && config.requests.length > 1 && <button className="icon-btn small" aria-label={`删除数据源 ${request.name}`} onClick={() => patch({ requests: config.requests.filter((_, i) => i !== index) })} type="button"><Trash2 size={13} /></button>}
                        </div>
                        <div className="field-row">
                          <div className="field"><label>名称</label><input value={request.name} onChange={(e) => patchRequest(index, { name: e.target.value })} /></div>
                          <div className="field"><label>标识</label><input disabled={request.type !== "http"} value={request.id} onChange={(e) => patchRequest(index, { id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} /></div>
                        </div>
                        <div className="field"><label>HTTPS GET URL</label><textarea disabled={request.type !== "http"} value={request.url} onChange={(e) => patchRequest(index, { url: e.target.value })} spellCheck={false} /></div>
                        <div className="field"><label>失败策略</label><select value={request.failureMode} onChange={(e) => patchRequest(index, { failureMode: e.target.value as RequestConfig["failureMode"] })}><option value="abort">停止整个工作流</option><option value="continue">保留错误并继续</option></select></div>
                      </div>
                    </div>
                  ))}
                </div>
                {config.requests.length < 6 && <button className="add-source" onClick={() => patch({ requests: [...config.requests, { id: `source-${config.requests.length + 1}`, name: `数据源 ${config.requests.length + 1}`, type: "http", url: "https://api.example.com/resource/{{input.id}}", query: {}, failureMode: "abort" }] })} type="button"><Plus size={15} /> 添加下一个接口</button>}
                <button className="btn btn-primary test-button" onClick={testWorkflow} disabled={testing} type="button">{testing ? <LoaderCircle className="animate-spin" size={14} /> : <Eye size={14} />}运行全部数据源</button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="parse-toolbar">
                  <div><strong>统一响应上下文</strong><span>每个接口都保留自己的命名空间，不再互相覆盖。</span></div>
                  <button className="btn btn-secondary" onClick={testWorkflow} disabled={testing} type="button"><Eye size={14} />重新运行</button>
                </div>
                <div className="response-tree">
                  {rawData === null ? <p>运行工作流后查看字段。</p> : collectJsonPaths(rawData).map((item) => (
                    <button
                      className="response-path"
                      key={item.path}
                      onClick={() => {
                        void navigator.clipboard.writeText(item.path);
                        setMessage(`已复制 ${item.path}，可粘贴到任一区块字段。`);
                      }}
                      type="button"
                    >
                      <span><i />{item.path}</span>
                      <em>{String(item.value).slice(0, 80)}</em>
                      <Clipboard size={12} />
                    </button>
                  ))}
                </div>
                <div className="parse-help"><Braces size={16} /><span>解析路径支持对象和数组，例如 <code>requests.repos.0.name</code>。所有字段均可设置空值回退和安全格式化器。</span></div>
              </>
            )}

            {step === 3 && config.layout && (
              <>
                <div className="subsection-head">
                  <div><strong>内容区块</strong><span>从上到下渲染，可自由增删与排序</span></div>
                  <span>{config.layout.blocks.length}/16</span>
                </div>
                <div className="block-stack">
                  {config.layout.blocks.map((block, index) => {
                    const Icon = blockMeta[block.type].icon;
                    return (
                      <div className="block-card" key={block.id}>
                        <div className="block-head">
                          <div><span className="block-icon"><Icon size={14} /></span><strong>{blockMeta[block.type].label}</strong><code>{block.type}</code></div>
                          <div className="block-actions">
                            <button aria-label="上移区块" disabled={index === 0} onClick={() => moveBlock(index, -1)} type="button"><ArrowUp size={13} /></button>
                            <button aria-label="下移区块" disabled={index === config.layout!.blocks.length - 1} onClick={() => moveBlock(index, 1)} type="button"><ArrowDown size={13} /></button>
                            <button aria-label="删除区块" onClick={() => patch({ layout: { blocks: config.layout!.blocks.filter((_, i) => i !== index) } })} type="button"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div className="block-body">
                          {block.type === "hero" && <>
                            <BindingControl label="标题" value={block.title} paths={paths} onChange={(title) => patchBlock(index, { ...block, title })} />
                            <BindingControl label="副标题" value={block.subtitle} paths={paths} onChange={(subtitle) => patchBlock(index, { ...block, subtitle })} />
                            <BindingControl label="头像" value={block.avatar} paths={paths} onChange={(avatar) => patchBlock(index, { ...block, avatar })} />
                            <BindingControl label="头像框" value={block.avatarFrame} paths={paths} onChange={(avatarFrame) => patchBlock(index, { ...block, avatarFrame })} />
                            <BindingControl label="徽章" value={block.badge} paths={paths} onChange={(badge) => patchBlock(index, { ...block, badge })} />
                            <BindingControl label="背景图" value={block.background} paths={paths} onChange={(background) => patchBlock(index, { ...block, background })} />
                          </>}
                          {block.type === "text" && <>
                            <div className="field"><label>区块标签</label><input value={block.label} onChange={(e) => patchBlock(index, { ...block, label: e.target.value })} /></div>
                            <BindingControl label="正文" value={block.content} paths={paths} onChange={(content) => patchBlock(index, { ...block, content })} />
                          </>}
                          {block.type === "stats" && <>
                            <div className="field"><label>列数</label><select value={block.columns} onChange={(e) => patchBlock(index, { ...block, columns: Number(e.target.value) })}><option value="1">1 列</option><option value="2">2 列</option><option value="3">3 列</option><option value="4">4 列</option></select></div>
                            {block.items.map((item, itemIndex) => <div className="stat-editor" key={`${item.label}-${itemIndex}`}>
                              <input value={item.label} aria-label="指标名称" onChange={(e) => {
                                const items = [...block.items]; items[itemIndex] = { ...item, label: e.target.value }; patchBlock(index, { ...block, items });
                              }} />
                              <input list="response-paths" value={item.value.path} aria-label="指标路径" placeholder="requests.source.value" onChange={(e) => {
                                const items = [...block.items]; items[itemIndex] = { ...item, value: { ...item.value, path: e.target.value } }; patchBlock(index, { ...block, items });
                              }} />
                              <button aria-label="删除指标" disabled={block.items.length === 1} onClick={() => patchBlock(index, { ...block, items: block.items.filter((_, i) => i !== itemIndex) })} type="button"><Trash2 size={12} /></button>
                            </div>)}
                            {block.items.length < 12 && <button className="mini-add" onClick={() => patchBlock(index, { ...block, items: [...block.items, { label: "新指标", value: binding("", "—") }] })} type="button"><Plus size={12} /> 添加指标</button>}
                          </>}
                          {block.type === "image" && <BindingControl label="图片 URL" value={block.src} paths={paths} onChange={(src) => patchBlock(index, { ...block, src })} />}
                          {block.type === "links" && <>
                            {block.items.map((item, itemIndex) => <div className="link-editor" key={`${item.label}-${itemIndex}`}>
                              <input value={item.label} aria-label="链接名称" onChange={(e) => {
                                const items = [...block.items]; items[itemIndex] = { ...item, label: e.target.value }; patchBlock(index, { ...block, items });
                              }} />
                              <input list="response-paths" value={item.url.path} aria-label="链接路径" placeholder="requests.source.url" onChange={(e) => {
                                const items = [...block.items]; items[itemIndex] = { ...item, url: { ...item.url, path: e.target.value } }; patchBlock(index, { ...block, items });
                              }} />
                              <select value={item.style} aria-label="链接样式" onChange={(e) => {
                                const items = [...block.items]; items[itemIndex] = { ...item, style: e.target.value as "primary" | "secondary" | "text" }; patchBlock(index, { ...block, items });
                              }}><option value="primary">主按钮</option><option value="secondary">次按钮</option><option value="text">文字</option></select>
                            </div>)}
                          </>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {config.layout.blocks.length < 16 && <div className="block-library">
                  {(Object.keys(blockMeta) as CardBlock["type"][]).map((type) => {
                    const Icon = blockMeta[type].icon;
                    return <button key={type} onClick={() => patch({ layout: { blocks: [...config.layout!.blocks, createBlock(type)] } })} type="button"><Icon size={14} /><span>{blockMeta[type].label}</span><Plus size={12} /></button>;
                  })}
                </div>}
              </>
            )}

            {step === 4 && (
              <>
                <div className="field"><label>视觉预设</label><div className="preset-grid">
                  {([
                    ["editorial", "杂志"],
                    ["minimal", "极简"],
                    ["glass", "玻璃"],
                    ["poster", "海报"],
                    ["github", "GitHub"],
                    ["bilibili", "B 站"],
                    ["nowcoder", "牛客"],
                    ["zhihu", "知乎"],
                    ["leetcode", "力扣"],
                  ] as const).map(([preset, label]) => <button className={config.theme.preset === preset ? "active" : ""} key={preset} onClick={() => patch({ theme: { ...config.theme, preset } })} type="button"><i className={`preset-swatch ${preset}`} /><strong>{label}</strong></button>)}
                </div></div>
                <div className="field-row">
                  <div className="field"><label htmlFor="card-direction">卡片方向</label><select id="card-direction" value={config.theme.direction} onChange={(e) => patch({ theme: { ...config.theme, direction: e.target.value as "horizontal" | "vertical" } })}><option value="horizontal">横向</option><option value="vertical">纵向</option></select></div>
                  <div className="field"><label>内容密度</label><select value={config.theme.density} onChange={(e) => patch({ theme: { ...config.theme, density: e.target.value as "compact" | "comfortable" | "airy" } })}><option value="compact">紧凑</option><option value="comfortable">舒适</option><option value="airy">宽松</option></select></div>
                </div>
                <div className="field-row">
                  <div className="field"><label>强调色</label><input type="color" value={config.theme.accent} onChange={(e) => patch({ theme: { ...config.theme, accent: e.target.value } })} /></div>
                  <div className="field"><label>背景色</label><input type="color" value={config.theme.surface} onChange={(e) => patch({ theme: { ...config.theme, surface: e.target.value } })} /></div>
                  <div className="field"><label>文字色</label><input type="color" value={config.theme.text} onChange={(e) => patch({ theme: { ...config.theme, text: e.target.value } })} /></div>
                </div>
                <div className="slider-field"><label><span>卡片宽度</span><strong>{config.theme.width}px</strong></label><input type="range" min="280" max="760" value={config.theme.width} onChange={(e) => patch({ theme: { ...config.theme, width: Number(e.target.value) } })} /></div>
                <div className="slider-field"><label><span>圆角</span><strong>{config.theme.radius}px</strong></label><input type="range" min="0" max="40" value={config.theme.radius} onChange={(e) => patch({ theme: { ...config.theme, radius: Number(e.target.value) } })} /></div>
                <div className="slider-field"><label><span>区块间距</span><strong>{config.theme.blockGap}px</strong></label><input type="range" min="0" max="32" value={config.theme.blockGap} onChange={(e) => patch({ theme: { ...config.theme, blockGap: Number(e.target.value) } })} /></div>
                <div className="toggle-row">
                  <label><input type="checkbox" checked={config.theme.shadow} onChange={(e) => patch({ theme: { ...config.theme, shadow: e.target.checked } })} /><span>投影</span></label>
                  <label><input type="checkbox" checked={config.theme.border} onChange={(e) => patch({ theme: { ...config.theme, border: e.target.checked } })} /><span>边框</span></label>
                  <label><input type="checkbox" checked={config.theme.mode === "dark"} onChange={(e) => patch({ theme: { ...config.theme, mode: e.target.checked ? "dark" : "light", surface: e.target.checked ? "#101522" : "#fffdf9", text: e.target.checked ? "#f3f6ff" : "#202126" } })} /><span>深色</span></label>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="publish-hero">
                  <span><Cloud size={22} /></span>
                  <div><h3>{publishedVersion ? "发布一个不可变的新版本" : "准备发布第一版"}</h3><p>{config.requests.length} 个数据源 · {config.layout?.blocks.length ?? 0} 个区块 · Shadow DOM 隔离</p></div>
                </div>
                <button className="btn btn-primary publish-button" onClick={publish} disabled={publishing} type="button">{publishing ? <LoaderCircle className="animate-spin" size={14} /> : <Cloud size={14} />}{publishedVersion ? "发布新版本" : "立即发布"}</button>
                <div className="subsection-head code-head"><div><strong>嵌入代码</strong><span>适用于 HTML、React、Vue、Astro 和 WordPress</span></div></div>
                <div className="code-window">
                  <div className="code-window-head"><div className="traffic-lights"><i /><i /><i /></div><button onClick={async () => { await navigator.clipboard.writeText(embedCode); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }} type="button"><Clipboard size={12} />{copied ? "已复制" : "复制"}</button></div>
                  <pre>{embedCode}</pre>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="preview-panel preview-panel-v2">
          <div className="preview-toolbar">
            <div><span className="live-dot" /> LIVE PREVIEW</div>
            <span>{config.theme.width}px · {config.theme.direction === "horizontal" ? "横向" : "纵向"}</span>
          </div>
          <div className="preview-canvas">
            <CardPreview data={previewData ?? undefined} theme={config.theme} />
          </div>
          <div className="preview-status"><span>{config.requests.map((request) => request.id).join(" → ")}</span><strong>{paths.length} fields</strong></div>
        </aside>
      </div>
    </main>
  );
}
