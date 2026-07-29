import type { TemplateKey, WorkflowConfig } from "@/lib/card-schema";

export type TemplateDefinition = {
  key: TemplateKey;
  name: string;
  eyebrow: string;
  description: string;
  icon: string;
  accent: string;
  config: WorkflowConfig;
};

const commonTheme = {
  direction: "horizontal" as const,
  mode: "light" as const,
  accent: "#ff6b84",
  surface: "#fffdf9",
  radius: 22,
  density: "comfortable" as const,
  shadow: true,
};

export const templates: TemplateDefinition[] = [
  {
    key: "bilibili-user",
    name: "B 站用户",
    eyebrow: "CREATOR",
    description: "展示 UP 主头像、签名、粉丝与投稿数据。",
    icon: "哔",
    accent: "#fb7299",
    config: {
      name: "我的 B 站名片",
      description: "一张会自动更新的 B 站创作者卡片",
      template: "bilibili-user",
      inputs: [
        {
          key: "uid",
          label: "B 站 UID",
          type: "number",
          required: true,
          defaultValue: 7900967,
          previewValue: 7900967,
        },
      ],
      request: {
        url: "https://api.bilibili.com/x/web-interface/card?mid={{uid}}",
        query: {},
      },
      mapping: {
        avatar: { path: "profile.avatar", formatters: [] },
        title: { path: "profile.name", fallback: "B 站用户", formatters: [] },
        subtitle: { path: "profile.signature", formatters: [{ type: "truncate", value: 56 }] },
        badge: { path: "profile.level", formatters: [{ type: "prefix", value: "LV" }] },
        description: { path: "profile.signature", formatters: [] },
        background: { path: "profile.banner", formatters: [] },
        url: { path: "profile.url", formatters: [] },
        stats: [
          { label: "关注", value: { path: "profile.following", formatters: [{ type: "compact-number" }] } },
          { label: "粉丝", value: { path: "profile.followers", formatters: [{ type: "compact-number" }] } },
          { label: "获赞", value: { path: "profile.likes", formatters: [{ type: "compact-number" }] } },
          { label: "投稿", value: { path: "profile.archiveCount", formatters: [{ type: "compact-number" }] } },
        ],
      },
      theme: { ...commonTheme, accent: "#fb7299" },
    },
  },
  {
    key: "github-user",
    name: "GitHub 用户",
    eyebrow: "DEVELOPER",
    description: "把公开 GitHub 资料和仓库数据放进博客。",
    icon: "GH",
    accent: "#7c5cff",
    config: {
      name: "我的 GitHub 名片",
      description: "展示公开开发者资料",
      template: "github-user",
      inputs: [
        {
          key: "username",
          label: "GitHub 用户名",
          type: "string",
          required: true,
          defaultValue: "torvalds",
          previewValue: "torvalds",
        },
      ],
      request: {
        url: "https://api.github.com/users/{{username}}",
        query: {},
      },
      mapping: {
        avatar: { path: "avatar_url", formatters: [] },
        title: { path: "name", fallback: "GitHub User", formatters: [] },
        subtitle: { path: "login", formatters: [{ type: "prefix", value: "@" }] },
        badge: { path: "type", formatters: [] },
        description: { path: "bio", fallback: "Building in public.", formatters: [{ type: "truncate", value: 88 }] },
        url: { path: "html_url", formatters: [] },
        stats: [
          { label: "仓库", value: { path: "public_repos", formatters: [{ type: "compact-number" }] } },
          { label: "粉丝", value: { path: "followers", formatters: [{ type: "compact-number" }] } },
          { label: "关注", value: { path: "following", formatters: [{ type: "compact-number" }] } },
        ],
      },
      theme: { ...commonTheme, accent: "#7c5cff" },
    },
  },
  {
    key: "custom-json",
    name: "自定义 JSON API",
    eyebrow: "FLEXIBLE",
    description: "连接一个公开 GET 接口，点选字段生成卡片。",
    icon: "{}",
    accent: "#10a37f",
    config: {
      name: "自定义信息卡片",
      description: "来自公开 JSON API 的动态信息",
      template: "custom-json",
      inputs: [
        {
          key: "id",
          label: "资源 ID",
          type: "number",
          required: true,
          defaultValue: 1,
          previewValue: 1,
        },
      ],
      request: {
        url: "https://jsonplaceholder.typicode.com/users/{{id}}",
        query: {},
      },
      mapping: {
        title: { path: "name", fallback: "API 数据", formatters: [] },
        subtitle: { path: "company.name", formatters: [] },
        badge: { path: "username", formatters: [{ type: "prefix", value: "@" }] },
        description: { path: "company.catchPhrase", formatters: [] },
        url: { path: "website", formatters: [{ type: "prefix", value: "https://" }] },
        stats: [
          { label: "城市", value: { path: "address.city", formatters: [] } },
          { label: "邮箱", value: { path: "email", formatters: [] } },
        ],
      },
      theme: { ...commonTheme, accent: "#10a37f" },
    },
  },
];

export function getTemplate(key: TemplateKey) {
  return templates.find((template) => template.key === key) ?? templates[0];
}

export function cloneTemplateConfig(key: TemplateKey): WorkflowConfig {
  return structuredClone(getTemplate(key).config);
}
