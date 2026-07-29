import { z } from "zod";

export const templateKeySchema = z.enum([
  "bilibili-user",
  "github-user",
  "custom-json",
  "multi-source-profile",
  "api-dashboard",
  "nowcoder-user",
  "zhihu-user",
  "leetcode-user",
  "douyin-profile",
  "xiaohongshu-profile",
]);

const valueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const inputFieldSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1).max(60),
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean().default(false),
  defaultValue: valueSchema.optional(),
  previewValue: valueSchema.optional(),
});

export const formatterSchema = z.object({
  type: z.enum([
    "compact-number",
    "date",
    "truncate",
    "fallback",
    "prefix",
    "suffix",
    "join",
    "uppercase",
    "lowercase",
  ]),
  value: z.union([z.string(), z.number()]).optional(),
});

export const fieldBindingSchema = z.object({
  path: z.string().max(300),
  fallback: valueSchema.optional(),
  formatters: z.array(formatterSchema).max(6).default([]),
});

export const statBindingSchema = z.object({
  label: z.string().min(1).max(40),
  value: fieldBindingSchema,
});

export const requestConfigSchema = z.object({
  id: z.string().min(1).max(32).regex(/^[a-z][a-z0-9-]*$/).default("main"),
  name: z.string().min(1).max(60).default("数据源"),
  type: z.enum([
    "http",
    "bilibili-profile",
    "nowcoder-profile",
    "zhihu-profile",
    "leetcode-profile",
    "manual-profile",
  ]).default("http"),
  url: z.string().max(2048),
  query: z.record(z.string(), z.string()).default({}),
  failureMode: z.enum(["abort", "continue"]).default("abort"),
});

export const mappingSchema = z.object({
  avatar: fieldBindingSchema.optional(),
  title: fieldBindingSchema,
  subtitle: fieldBindingSchema.optional(),
  badge: fieldBindingSchema.optional(),
  description: fieldBindingSchema.optional(),
  background: fieldBindingSchema.optional(),
  url: fieldBindingSchema.optional(),
  stats: z.array(statBindingSchema).max(8).default([]),
});

const blockBase = {
  id: z.string().min(1).max(50),
  hidden: z.boolean().default(false),
};

export const cardBlockSchema = z.discriminatedUnion("type", [
  z.object({
    ...blockBase,
    type: z.literal("hero"),
    avatar: fieldBindingSchema.optional(),
    avatarFrame: fieldBindingSchema.optional(),
    title: fieldBindingSchema,
    subtitle: fieldBindingSchema.optional(),
    badge: fieldBindingSchema.optional(),
    background: fieldBindingSchema.optional(),
    align: z.enum(["left", "center"]).default("left"),
  }),
  z.object({
    ...blockBase,
    type: z.literal("text"),
    label: z.string().max(40).default(""),
    content: fieldBindingSchema,
  }),
  z.object({
    ...blockBase,
    type: z.literal("stats"),
    columns: z.number().int().min(1).max(4).default(3),
    items: z.array(statBindingSchema).min(1).max(12),
  }),
  z.object({
    ...blockBase,
    type: z.literal("image"),
    src: fieldBindingSchema,
    alt: z.string().max(100).default(""),
    ratio: z.enum(["wide", "square", "auto"]).default("wide"),
  }),
  z.object({
    ...blockBase,
    type: z.literal("links"),
    items: z.array(z.object({
      label: z.string().min(1).max(40),
      url: fieldBindingSchema,
      style: z.enum(["primary", "secondary", "text"]).default("primary"),
    })).min(1).max(6),
  }),
  z.object({
    ...blockBase,
    type: z.literal("divider"),
  }),
]);

export const themeSchema = z.object({
  direction: z.enum(["horizontal", "vertical"]).default("horizontal"),
  mode: z.enum(["light", "dark"]).default("light"),
  preset: z.enum([
    "editorial",
    "minimal",
    "glass",
    "poster",
    "github",
    "bilibili",
    "nowcoder",
    "zhihu",
    "leetcode",
    "douyin",
    "xiaohongshu",
  ]).default("editorial"),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ff6b84"),
  surface: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#fffdf9"),
  text: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#202126"),
  radius: z.number().min(0).max(40).default(22),
  density: z.enum(["compact", "comfortable", "airy"]).default("comfortable"),
  shadow: z.boolean().default(true),
  border: z.boolean().default(true),
  width: z.number().int().min(280).max(760).default(560),
  blockGap: z.number().int().min(0).max(32).default(12),
});

export const workflowConfigSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).default(""),
  template: templateKeySchema,
  inputs: z.array(inputFieldSchema).min(1).max(12),
  // `request` and `mapping` keep already-published v1 snapshots renderable.
  request: z.object({
    url: z.string().max(2048),
    query: z.record(z.string(), z.string()).default({}),
  }).optional(),
  requests: z.array(requestConfigSchema).max(6).default([]),
  mapping: mappingSchema,
  layout: z.object({
    blocks: z.array(cardBlockSchema).min(1).max(16),
  }).optional(),
  theme: themeSchema,
}).superRefine((config, context) => {
  if (config.requests.length === 0 && !config.request) {
    context.addIssue({
      code: "custom",
      path: ["requests"],
      message: "至少需要一个数据源",
    });
  }
  const ids = config.requests.map((request) => request.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: "custom",
      path: ["requests"],
      message: "数据源标识不能重复",
    });
  }
});

const resolvedBlockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("hero"),
    avatar: z.string(),
    avatarFrame: z.string(),
    title: z.string(),
    subtitle: z.string(),
    badge: z.string(),
    background: z.string(),
    align: z.enum(["left", "center"]),
  }),
  z.object({
    id: z.string(),
    type: z.literal("text"),
    label: z.string(),
    content: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("stats"),
    columns: z.number(),
    items: z.array(z.object({ label: z.string(), value: z.string() })),
  }),
  z.object({
    id: z.string(),
    type: z.literal("image"),
    src: z.string(),
    alt: z.string(),
    ratio: z.enum(["wide", "square", "auto"]),
  }),
  z.object({
    id: z.string(),
    type: z.literal("links"),
    items: z.array(z.object({
      label: z.string(),
      url: z.string(),
      style: z.enum(["primary", "secondary", "text"]),
    })),
  }),
  z.object({ id: z.string(), type: z.literal("divider") }),
]);

export const cardDataSchema = z.object({
  identity: z.object({
    avatar: z.string().default(""),
    title: z.string().default("未命名卡片"),
    subtitle: z.string().default(""),
    badge: z.string().default(""),
  }),
  content: z.object({
    description: z.string().default(""),
    background: z.string().default(""),
  }),
  stats: z.array(z.object({ label: z.string(), value: z.string() })).max(12).default([]),
  actions: z.object({
    label: z.string().default("查看详情"),
    url: z.string().default(""),
  }),
  blocks: z.array(resolvedBlockSchema).max(16).default([]),
});

export type TemplateKey = z.infer<typeof templateKeySchema>;
export type InputField = z.infer<typeof inputFieldSchema>;
export type FieldBinding = z.infer<typeof fieldBindingSchema>;
export type Formatter = z.infer<typeof formatterSchema>;
export type RequestConfig = z.infer<typeof requestConfigSchema>;
export type CardBlock = z.infer<typeof cardBlockSchema>;
export type WorkflowConfig = z.infer<typeof workflowConfigSchema>;
export type CardData = z.infer<typeof cardDataSchema>;
export type ResolvedBlock = z.infer<typeof resolvedBlockSchema>;
export type CardTheme = z.infer<typeof themeSchema>;

export type StoredCard = {
  id: string;
  ownerId?: string;
  name: string;
  description: string;
  template: TemplateKey;
  status: "draft" | "published";
  draftConfig: WorkflowConfig;
  currentVersion: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PublishedSnapshot = {
  cardId: string;
  version: number;
  config: WorkflowConfig;
  publishedAt: string;
};
