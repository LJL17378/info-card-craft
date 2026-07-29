import type {
  CardData,
  FieldBinding,
  Formatter,
  WorkflowConfig,
} from "@/lib/card-schema";

export function getByPath(source: unknown, path: string): unknown {
  if (!path) return source;
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((value, key) => {
      if (value === null || typeof value !== "object") return undefined;
      return (value as Record<string, unknown>)[key];
    }, source);
}

export function applyFormatter(value: unknown, formatter: Formatter): unknown {
  switch (formatter.type) {
    case "compact-number": {
      const number = Number(value);
      if (!Number.isFinite(number)) return value;
      return new Intl.NumberFormat("zh-CN", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(number);
    }
    case "date": {
      const date = new Date(String(value));
      return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(date);
    }
    case "truncate": {
      const text = String(value ?? "");
      const length = Number(formatter.value ?? 80);
      return text.length > length ? `${text.slice(0, length)}…` : text;
    }
    case "fallback":
      return value === undefined || value === null || value === ""
        ? formatter.value ?? ""
        : value;
    case "prefix":
      return `${formatter.value ?? ""}${value ?? ""}`;
    case "suffix":
      return `${value ?? ""}${formatter.value ?? ""}`;
    case "join":
      return Array.isArray(value) ? value.join(String(formatter.value ?? "、")) : value;
  }
}

export function resolveBinding(source: unknown, binding?: FieldBinding): string {
  if (!binding) return "";
  let value = getByPath(source, binding.path);
  if (value === undefined || value === null || value === "") {
    value = binding.fallback ?? "";
  }
  for (const formatter of binding.formatters) {
    value = applyFormatter(value, formatter);
  }
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function safeLink(value: string): string {
  if (!value) return "";
  try {
    const candidate = value.startsWith("http") ? value : `https://${value}`;
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

export function mapToCardData(
  source: unknown,
  config: WorkflowConfig,
): CardData {
  const { mapping } = config;
  return {
    identity: {
      avatar: resolveBinding(source, mapping.avatar),
      title: resolveBinding(source, mapping.title) || config.name,
      subtitle: resolveBinding(source, mapping.subtitle),
      badge: resolveBinding(source, mapping.badge),
    },
    content: {
      description: resolveBinding(source, mapping.description),
      background: safeLink(resolveBinding(source, mapping.background)),
    },
    stats: mapping.stats.map((stat) => ({
      label: stat.label,
      value: resolveBinding(source, stat.value),
    })),
    actions: {
      label: "查看详情",
      url: safeLink(resolveBinding(source, mapping.url)),
    },
  };
}

export function interpolate(
  template: string,
  inputs: Record<string, string | number | boolean>,
): string {
  return template.replace(/\{\{([a-z][a-z0-9-]*)\}\}/g, (_, key: string) =>
    encodeURIComponent(String(inputs[key] ?? "")),
  );
}

export function collectJsonPaths(
  value: unknown,
  prefix = "",
  depth = 0,
): Array<{ path: string; value: unknown }> {
  if (depth > 5 || value === null || typeof value !== "object") {
    return prefix ? [{ path: prefix, value }] : [];
  }
  const result: Array<{ path: string; value: unknown }> = [];
  const entries = Array.isArray(value)
    ? value.slice(0, 4).map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>).slice(0, 50);
  for (const [key, child] of entries) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object") {
      result.push(...collectJsonPaths(child, path, depth + 1));
    } else {
      result.push({ path, value: child });
    }
  }
  return result;
}
