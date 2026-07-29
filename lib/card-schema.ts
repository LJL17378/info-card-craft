import { z } from "zod";

export const templateKeySchema = z.enum([
  "bilibili-user",
  "github-user",
  "custom-json",
]);

export const inputFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1).max(60),
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean().default(false),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  previewValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
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
  ]),
  value: z.union([z.string(), z.number()]).optional(),
});

export const fieldBindingSchema = z.object({
  path: z.string().max(240),
  fallback: z.union([z.string(), z.number(), z.boolean()]).optional(),
  formatters: z.array(formatterSchema).max(4).default([]),
});

export const statBindingSchema = z.object({
  label: z.string().min(1).max(24),
  value: fieldBindingSchema,
});

export const requestConfigSchema = z.object({
  url: z.string().max(2048),
  query: z.record(z.string(), z.string()).default({}),
});

export const mappingSchema = z.object({
  avatar: fieldBindingSchema.optional(),
  title: fieldBindingSchema,
  subtitle: fieldBindingSchema.optional(),
  badge: fieldBindingSchema.optional(),
  description: fieldBindingSchema.optional(),
  background: fieldBindingSchema.optional(),
  url: fieldBindingSchema.optional(),
  stats: z.array(statBindingSchema).max(6).default([]),
});

export const themeSchema = z.object({
  direction: z.enum(["horizontal", "vertical"]).default("horizontal"),
  mode: z.enum(["light", "dark"]).default("light"),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ff6b84"),
  surface: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#fffdf9"),
  radius: z.number().min(8).max(32).default(22),
  density: z.enum(["compact", "comfortable"]).default("comfortable"),
  shadow: z.boolean().default(true),
});

export const workflowConfigSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).default(""),
  template: templateKeySchema,
  inputs: z.array(inputFieldSchema).min(1).max(8),
  request: requestConfigSchema,
  mapping: mappingSchema,
  theme: themeSchema,
});

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
  stats: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .max(6)
    .default([]),
  actions: z.object({
    label: z.string().default("查看详情"),
    url: z.string().default(""),
  }),
});

export type TemplateKey = z.infer<typeof templateKeySchema>;
export type InputField = z.infer<typeof inputFieldSchema>;
export type FieldBinding = z.infer<typeof fieldBindingSchema>;
export type Formatter = z.infer<typeof formatterSchema>;
export type WorkflowConfig = z.infer<typeof workflowConfigSchema>;
export type CardData = z.infer<typeof cardDataSchema>;
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
