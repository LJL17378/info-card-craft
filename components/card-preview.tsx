"use client";

import type { CardData, CardTheme } from "@/lib/card-schema";

const fallbackData: CardData = {
  identity: {
    avatar: "",
    title: "你的动态信息卡片",
    subtitle: "把 API 里的数据，变成博客的一部分。",
    badge: "LIVE",
  },
  content: {
    description: "修改左侧配置，这里会立即显示卡片效果。",
    background: "",
  },
  stats: [
    { label: "数据源", value: "API" },
    { label: "发布", value: "Web Component" },
    { label: "更新", value: "自动" },
  ],
  actions: { label: "查看详情", url: "" },
};

export function CardPreview({
  data = fallbackData,
  theme,
  compact = false,
}: {
  data?: CardData;
  theme: CardTheme;
  compact?: boolean;
}) {
  const dark = theme.mode === "dark";
  const vertical = theme.direction === "vertical";
  const padding = theme.density === "compact" ? 16 : 21;

  return (
    <article
      data-testid="card-preview"
      style={{
        width: vertical ? (compact ? 244 : 310) : compact ? 310 : 520,
        maxWidth: "100%",
        minHeight: vertical ? 420 : 265,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: theme.radius,
        color: dark ? "#f7f5f2" : "#202126",
        background: theme.surface,
        border: `1px solid ${dark ? "rgba(255,255,255,.1)" : "rgba(25,25,30,.09)"}`,
        boxShadow: theme.shadow ? "0 24px 58px rgba(35,32,28,.18)" : "none",
        position: "relative",
      }}
    >
      <div
        style={{
          minHeight: vertical ? 178 : 124,
          padding,
          display: "flex",
          alignItems: "flex-end",
          position: "relative",
          background: data.content.background
            ? `linear-gradient(0deg, rgba(15,15,18,.78), rgba(15,15,18,.06)), url("${data.content.background}") center/cover`
            : `linear-gradient(135deg, ${theme.accent} 0%, color-mix(in srgb, ${theme.accent} 45%, #272832) 100%)`,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 13,
            alignItems: "center",
            position: "relative",
            color: "white",
            minWidth: 0,
          }}
        >
          {data.identity.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.identity.avatar}
              alt=""
              width={vertical ? 64 : 58}
              height={vertical ? 64 : 58}
              style={{
                width: vertical ? 64 : 58,
                height: vertical ? 64 : 58,
                borderRadius: 18,
                objectFit: "cover",
                border: "3px solid rgba(255,255,255,.82)",
                flex: "0 0 auto",
              }}
            />
          ) : (
            <span
              style={{
                width: vertical ? 64 : 58,
                height: vertical ? 64 : 58,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,.2)",
                border: "2px solid rgba(255,255,255,.65)",
                fontWeight: 850,
                fontSize: 22,
                flex: "0 0 auto",
              }}
            >
              {data.identity.title.slice(0, 1)}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <strong
                style={{
                  fontSize: vertical ? 19 : 21,
                  lineHeight: 1.1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {data.identity.title}
              </strong>
              {data.identity.badge && (
                <span
                  style={{
                    padding: "3px 6px",
                    borderRadius: 6,
                    background: theme.accent,
                    fontSize: 9,
                    fontWeight: 850,
                    flex: "0 0 auto",
                  }}
                >
                  {data.identity.badge}
                </span>
              )}
            </div>
            <span style={{ display: "block", opacity: 0.8, fontSize: 11, marginTop: 5 }}>
              {data.identity.subtitle}
            </span>
          </div>
        </div>
      </div>
      <div style={{ padding, display: "flex", flexDirection: "column", flex: 1 }}>
        {data.content.description && (
          <p
            style={{
              margin: "0 0 15px",
              opacity: 0.68,
              fontSize: 12,
              lineHeight: 1.6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {data.content.description}
          </p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: vertical ? "1fr 1fr" : `repeat(${Math.min(data.stats.length, 4)}, 1fr)`,
            gap: 8,
            marginTop: "auto",
          }}
        >
          {data.stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: "9px 10px",
                borderRadius: 11,
                background: dark ? "rgba(255,255,255,.07)" : "rgba(25,25,30,.045)",
              }}
            >
              <span style={{ display: "block", opacity: 0.55, fontSize: 9, marginBottom: 4 }}>
                {stat.label}
              </span>
              <strong style={{ fontSize: 13 }}>{stat.value || "—"}</strong>
            </div>
          ))}
        </div>
        {data.actions.url && (
          <a
            href={data.actions.url}
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: 13,
              minHeight: 38,
              display: "grid",
              placeItems: "center",
              borderRadius: 11,
              background: theme.accent,
              color: "white",
              fontSize: 11,
              fontWeight: 780,
            }}
          >
            {data.actions.label} ↗
          </a>
        )}
      </div>
    </article>
  );
}
