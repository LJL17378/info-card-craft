"use client";

import type { StoredCard, TemplateKey, WorkflowConfig } from "@/lib/card-schema";
import { cloneTemplateConfig } from "@/lib/templates";

const STORAGE_KEY = "info-card-craft:cards:v1";
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

export function listLocalCards(): StoredCard[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const cards = seedCards();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    return cards;
  }
  try {
    return JSON.parse(raw) as StoredCard[];
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
  write([card, ...listLocalCards()]);
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
