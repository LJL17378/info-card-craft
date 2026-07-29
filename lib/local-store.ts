"use client";

import type { StoredCard, TemplateKey, WorkflowConfig } from "@/lib/card-schema";
import { cloneTemplateConfig, templates } from "@/lib/templates";

const STORAGE_KEY = "info-card-craft:cards:v3";
const CHANGE_EVENT = "info-card-craft:change";

function now() {
  return new Date().toISOString();
}

function seedCards(): StoredCard[] {
  const createdAt = now();
  return [
    {
      id: "demo-bilibili",
      name: "我的 B 站名片",
      description: "公开演示卡片",
      template: "bilibili-user",
      status: "published",
      draftConfig: cloneTemplateConfig("bilibili-user"),
      currentVersion: 1,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "demo-github",
      name: "GitHub 开发者名片",
      description: "公开演示卡片",
      template: "github-user",
      status: "published",
      draftConfig: cloneTemplateConfig("github-user"),
      currentVersion: 1,
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

function migratePlatformPreset(card: StoredCard): StoredCard {
  const config = card.draftConfig;
  if (config.template === "nowcoder-user" && config.theme.preset === "minimal") {
    const blocks = config.layout?.blocks.map((block) => {
      if (block.type === "hero") return { ...block, background: undefined };
      if (block.type === "text" && block.id === "bio" && block.label === "PROFILE") {
        return { ...block, label: "求职档案" };
      }
      return block;
    });
    return {
      ...card,
      draftConfig: {
        ...config,
        layout: blocks ? { blocks } : config.layout,
        theme: {
          ...config.theme,
          preset: "nowcoder",
          surface: "#f6fbf8",
          text: "#18231f",
          radius: 20,
        },
      },
    };
  }
  if (config.template === "zhihu-user" && config.theme.preset === "minimal") {
    const blocks = config.layout?.blocks.map((block) => {
      if (block.type === "hero") {
        return {
          ...block,
          badge: {
            path: "requests.zhihu.__badge",
            fallback: "知乎创作者",
            formatters: [],
          },
        };
      }
      if (block.type === "links") {
        return {
          ...block,
          items: block.items.map((item) => ({
            ...item,
            label: item.label === "访问知乎主页" ? "查看回答与文章" : item.label,
          })),
        };
      }
      return block;
    });
    return {
      ...card,
      draftConfig: {
        ...config,
        layout: blocks ? { blocks } : config.layout,
        theme: { ...config.theme, preset: "zhihu", text: "#121212" },
      },
    };
  }
  if (config.template === "leetcode-user" && config.theme.preset === "glass") {
    return {
      ...card,
      draftConfig: {
        ...config,
        theme: { ...config.theme, preset: "leetcode", radius: 18 },
      },
    };
  }
  return card;
}

export function listLocalCards(): StoredCard[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const cards = seedCards();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    return cards;
  }
  try {
    const supportedTemplates = new Set(templates.map((template) => template.key));
    const cards = (JSON.parse(raw) as StoredCard[])
      .filter((card) => supportedTemplates.has(card.template))
      .map(migratePlatformPreset);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    return cards;
  } catch {
    return seedCards();
  }
}

function write(cards: StoredCard[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeLocalCards(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getLocalCard(id: string): StoredCard | undefined {
  return listLocalCards().find((card) => card.id === id);
}

export function createLocalCard(template: TemplateKey): StoredCard {
  const cards = listLocalCards();
  const activeDraft = cards.find(
    (card) => card.template === template && card.status === "draft",
  );
  if (activeDraft) return activeDraft;

  const config = cloneTemplateConfig(template);
  const timestamp = now();
  const card: StoredCard = {
    id: `local-${crypto.randomUUID()}`,
    name: config.name,
    description: config.description,
    template,
    status: "draft",
    draftConfig: config,
    currentVersion: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  write([card, ...cards]);
  return card;
}

export function saveLocalCard(id: string, config: WorkflowConfig): StoredCard {
  const cards = listLocalCards();
  const index = cards.findIndex((card) => card.id === id);
  const previous = cards[index];
  const updated: StoredCard = {
    ...(previous ?? {
      id,
      template: config.template,
      status: "draft" as const,
      currentVersion: null,
      createdAt: now(),
    }),
    name: config.name,
    description: config.description,
    draftConfig: config,
    updatedAt: now(),
  };
  if (index >= 0) cards[index] = updated;
  else cards.unshift(updated);
  write(cards);
  return updated;
}

export function publishLocalCard(id: string, config: WorkflowConfig): StoredCard {
  const saved = saveLocalCard(id, config);
  const cards = listLocalCards();
  const index = cards.findIndex((card) => card.id === id);
  const published: StoredCard = {
    ...saved,
    status: "published",
    currentVersion: (saved.currentVersion ?? 0) + 1,
    updatedAt: now(),
  };
  cards[index] = published;
  write(cards);
  return published;
}

export function deleteLocalCard(id: string) {
  write(listLocalCards().filter((card) => card.id !== id));
}

export function mergeRemoteCards(remoteCards: StoredCard[]) {
  const local = listLocalCards();
  const demos = local.filter((card) => card.id.startsWith("demo-"));
  const localDrafts = local.filter(
    (card) =>
      card.id.startsWith("local-") &&
      !remoteCards.some((remote) => remote.id === card.id),
  );
  write([...remoteCards, ...localDrafts, ...demos]);
}
