"use client";

import type { CardData, CardTheme, ResolvedBlock } from "@/lib/card-schema";

const fallbackData: CardData = {
  identity: {
    avatar: "",
    title: "你的动态信息卡片",
    subtitle: "多接口编排 · 自由内容区块",
    badge: "LIVE",
  },
  content: { description: "修改工作流，这里会立即显示真实的组合结果。", background: "" },
  stats: [
    { label: "数据源", value: "2" },
    { label: "内容区块", value: "4" },
    { label: "运行时", value: "Web Component" },
  ],
  actions: { label: "查看详情", url: "" },
  blocks: [],
};

function LegacyBlocks(data: CardData): ResolvedBlock[] {
  return [
    {
      id: "legacy-hero",
      type: "hero",
      avatar: data.identity.avatar,
      avatarFrame: "",
      title: data.identity.title,
      subtitle: data.identity.subtitle,
      badge: data.identity.badge,
      background: data.content.background,
      align: "left",
    },
    ...(data.content.description ? [{
      id: "legacy-text",
      type: "text" as const,
      label: "",
      content: data.content.description,
    }] : []),
    ...(data.stats.length ? [{
      id: "legacy-stats",
      type: "stats" as const,
      columns: Math.min(data.stats.length, 4),
      items: data.stats,
    }] : []),
    ...(data.actions.url ? [{
      id: "legacy-link",
      type: "links" as const,
      items: [{ label: data.actions.label, url: data.actions.url, style: "primary" as const }],
    }] : []),
  ];
}

function Block({ block, preset }: { block: ResolvedBlock; preset: CardTheme["preset"] }) {
  if (block.type === "hero") {
    return (
      <section
        className={`craft-block craft-hero align-${block.align}`}
        style={block.background ? {
          backgroundImage: preset === "bilibili"
            ? `url("${block.background}")`
            : `linear-gradient(90deg, rgba(10,12,18,.82), rgba(10,12,18,.2)), url("${block.background}")`,
        } : undefined}
      >
        <span className="craft-avatar-wrap">
          {block.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="craft-avatar" src={block.avatar} alt="" referrerPolicy="no-referrer" />
          ) : <span className="craft-avatar craft-avatar-fallback">{block.title.slice(0, 1)}</span>}
          {block.avatarFrame && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="craft-avatar-frame" src={block.avatarFrame} alt="" referrerPolicy="no-referrer" />
          )}
        </span>
        <div className="craft-identity">
          <div className="craft-title-row">
            <h3>{block.title}</h3>
            {block.badge && <span className="craft-badge">{block.badge}</span>}
          </div>
          {block.subtitle && <p>{block.subtitle}</p>}
        </div>
      </section>
    );
  }
  if (block.type === "text") {
    if (!block.content) return null;
    return (
      <section className="craft-block craft-text">
        {block.label && <span className="craft-label">{block.label}</span>}
        <p>{block.content}</p>
      </section>
    );
  }
  if (block.type === "stats") {
    return (
      <section className="craft-block craft-stats" style={{ gridTemplateColumns: `repeat(${block.columns}, minmax(0, 1fr))` }}>
        {block.items.map((item, index) => (
          <div className="craft-stat" key={`${item.label}-${index}`}>
            <span>{item.label}</span><strong>{item.value || "—"}</strong>
          </div>
        ))}
      </section>
    );
  }
  if (block.type === "image") {
    if (!block.src) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={`craft-block craft-image ratio-${block.ratio}`} src={block.src} alt={block.alt} referrerPolicy="no-referrer" />
    );
  }
  if (block.type === "links") {
    if (!block.items.length) return null;
    return (
      <section className="craft-block craft-links">
        {block.items.map((item, index) => (
          <a className={`craft-link ${item.style}`} href={item.url} target="_blank" rel="noreferrer" key={`${item.label}-${index}`}>
            {item.label}<span>↗</span>
          </a>
        ))}
      </section>
    );
  }
  return <hr className="craft-block craft-divider" />;
}

export function CardPreview({
  data = fallbackData,
  theme,
  compact = false,
}: {
  data?: CardData;
  theme: CardTheme;
  compact?: boolean;
}) {
  const blocks = data.blocks.length ? data.blocks : LegacyBlocks(data);
  const density = theme.density === "compact" ? 14 : theme.density === "airy" ? 24 : 18;
  const width = compact ? Math.min(theme.width, 330) : theme.direction === "vertical" ? Math.min(theme.width, 380) : theme.width;

  return (
    <article
      data-testid="card-preview"
      className={`craft-card preset-${theme.preset} mode-${theme.mode} direction-${theme.direction}`}
      style={{
        "--craft-accent": theme.accent,
        "--craft-surface": theme.surface,
        "--craft-text": theme.text,
        "--craft-radius": `${theme.radius}px`,
        "--craft-pad": `${density}px`,
        "--craft-gap": `${theme.blockGap}px`,
        width,
        maxWidth: "100%",
        border: theme.border ? `1px solid color-mix(in srgb, ${theme.text} 13%, transparent)` : "none",
        boxShadow: theme.shadow ? "0 28px 80px color-mix(in srgb, var(--craft-text) 18%, transparent)" : "none",
      } as React.CSSProperties}
    >
      {blocks.map((block) => <Block block={block} preset={theme.preset} key={block.id} />)}
    </article>
  );
}
