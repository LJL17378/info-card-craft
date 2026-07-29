import { createHash } from "node:crypto";
import type { CardData, WorkflowConfig } from "@/lib/card-schema";
import { mapToCardData, interpolate, interpolateFromSource } from "@/lib/mapping";
import { SafeFetchError, safeFetchJson } from "@/lib/safe-fetch";

function normalizedInputs(
  config: WorkflowConfig,
  provided: Record<string, unknown>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    config.inputs.map((input) => {
      const value = provided[input.key] ?? input.defaultValue;
      if (input.required && (value === undefined || value === "")) {
        throw new SafeFetchError(`缺少必填参数：${input.label}`);
      }
      if (input.type === "number") {
        const number = Number(value);
        if (!Number.isFinite(number)) {
          throw new SafeFetchError(`${input.label} 必须是数字`);
        }
        return [input.key, number];
      }
      if (input.type === "boolean") {
        return [input.key, value === true || value === "true"];
      }
      return [input.key, String(value ?? "").slice(0, 240)];
    }),
  );
}

function validateSpecialInput(config: WorkflowConfig, inputs: Record<string, string | number | boolean>) {
  if (config.template === "bilibili-user" && !/^\d{1,20}$/.test(String(inputs.uid))) {
    throw new SafeFetchError("B 站 UID 必须是 1 到 20 位数字");
  }
  if (
    config.template === "github-user" &&
    !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(String(inputs.username))
  ) {
    throw new SafeFetchError("GitHub 用户名格式不正确");
  }
}

const wbiMixinIndexes = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5,
  49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55,
  40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57,
  62, 11, 36, 20, 34, 44, 52,
];

function getWbiKey(url: string) {
  return url.split("/").pop()?.split(".")[0] ?? "";
}

function signWbiQuery(
  params: Record<string, string | number>,
  imgUrl: string,
  subUrl: string,
) {
  const rawKey = getWbiKey(imgUrl) + getWbiKey(subUrl);
  const mixinKey = wbiMixinIndexes
    .map((index) => rawKey[index] ?? "")
    .join("")
    .slice(0, 32);
  const signed: Record<string, string | number> = {
    ...params,
    wts: Math.floor(Date.now() / 1000),
  };
  const query = Object.keys(signed)
    .sort()
    .map((key) => {
      const value = String(signed[key]).replace(/[!'()*]/g, "");
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");
  const wRid = createHash("md5").update(query + mixinKey).digest("hex");
  return `${query}&w_rid=${wRid}`;
}

async function fetchBilibili(uid: string | number) {
  const headers = {
    Referer: `https://space.bilibili.com/${uid}/`,
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138.0 Safari/537.36",
  };
  // The card endpoint is much less likely to be blocked by Bilibili's WBI
  // anti-bot policy. Use it as the reliable base for avatar and pendant, then
  // enrich it with the WBI profile (top_photo) whenever that endpoint permits.
  const cardPayload = (await safeFetchJson(
    `https://api.bilibili.com/x/web-interface/card?mid=${encodeURIComponent(String(uid))}`,
    { headers },
  )) as {
    code?: number;
    message?: string;
    data?: {
      card?: Record<string, unknown> & {
        level_info?: { current_level?: number };
        pendant?: { image?: string; image_enhance?: string };
      };
      archive_count?: number;
      like_num?: number;
    };
  };
  if (cardPayload.code !== 0 || !cardPayload.data?.card) {
    throw new SafeFetchError(cardPayload.message || "B 站没有返回用户资料", 502);
  }
  const card = cardPayload.data.card;
  let enriched: Record<string, unknown> & {
    pendant?: { image?: string; image_enhance?: string };
    top_photo?: string;
  } = {};
  let relation: Record<string, unknown> = {};
  let archiveCount = Number(cardPayload.data.archive_count) || 0;

  try {
    const nav = (await safeFetchJson(
      "https://api.bilibili.com/x/web-interface/nav",
      { headers },
    )) as { data?: { wbi_img?: { img_url?: string; sub_url?: string } } };
    const imgUrl = nav.data?.wbi_img?.img_url;
    const subUrl = nav.data?.wbi_img?.sub_url;
    if (imgUrl && subUrl) {
      const infoQuery = signWbiQuery(
        { mid: uid, platform: "web", token: "", web_location: 1550101 },
        imgUrl,
        subUrl,
      );
      const infoPayload = (await safeFetchJson(
        `https://api.bilibili.com/x/space/wbi/acc/info?${infoQuery}`,
        { headers },
      )) as { code?: number; data?: typeof enriched };
      if (infoPayload.code === 0 && infoPayload.data) enriched = infoPayload.data;

      const archiveQuery = signWbiQuery(
        { mid: uid, pn: 1, ps: 1, order: "pubdate", platform: "web" },
        imgUrl,
        subUrl,
      );
      const archivePayload = (await safeFetchJson(
        `https://api.bilibili.com/x/space/wbi/arc/search?${archiveQuery}`,
        { headers },
      )) as { code?: number; data?: { page?: { count?: number } } };
      if (archivePayload.code === 0) {
        archiveCount = Number(archivePayload.data?.page?.count) || archiveCount;
      }
    }
  } catch {
    // Continue with the reliable card endpoint. The visual preset supplies a
    // platform-native cover when top_photo is temporarily rate-limited.
  }

  try {
    const relationPayload = (await safeFetchJson(
      `https://api.bilibili.com/x/relation/stat?vmid=${encodeURIComponent(String(uid))}`,
      { headers },
    )) as { code?: number; data?: Record<string, unknown> };
    if (relationPayload.code === 0) relation = relationPayload.data ?? {};
  } catch {
    relation = {};
  }

  const pendant = enriched.pendant ?? card.pendant;
  return {
    profile: {
      uid: String(uid),
      name: enriched.name ?? card.name ?? "",
      avatar: enriched.face ?? card.face ?? "",
      // `top_photo` is occasionally blocked on data-center IPs. In that case
      // keep the visual image-backed instead of returning an empty cover.
      banner: enriched.top_photo ?? String(card.face ?? ""),
      avatarFrame:
        pendant?.image_enhance ?? pendant?.image ?? "",
      signature: enriched.sign ?? card.sign ?? "",
      level:
        Number(enriched.level) ||
        Number(card.level_info?.current_level) ||
        0,
      following: Number(relation.following) || Number(card.friend) || 0,
      followers: Number(relation.follower) || Number(card.fans) || 0,
      likes: Number(cardPayload.data.like_num) || 0,
      archiveCount,
      url: `https://space.bilibili.com/${uid}`,
    },
  };
}

export async function executeWorkflow(
  config: WorkflowConfig,
  providedInputs: Record<string, unknown>,
): Promise<{ raw: unknown; data: CardData }> {
  const inputs = normalizedInputs(config, providedInputs);
  validateSpecialInput(config, inputs);
  let raw: unknown;

  // v1 snapshots used one implicit request and a response without namespaces.
  // Keep that shape so already-published cards do not break.
  if (config.requests.length === 0 && config.template === "bilibili-user") {
    raw = await fetchBilibili(String(inputs.uid));
  } else if (config.requests.length === 0) {
    const fixedUrl =
      config.template === "github-user"
        ? `https://api.github.com/users/${encodeURIComponent(String(inputs.username))}`
        : interpolate(config.request?.url ?? "", inputs);
    const url = new URL(fixedUrl);
    for (const [key, value] of Object.entries(config.request?.query ?? {})) {
      url.searchParams.set(key, interpolate(value, inputs));
    }
    raw = await safeFetchJson(url.href);
  } else {
    const context: {
      input: Record<string, string | number | boolean>;
      requests: Record<string, unknown>;
    } = { input: inputs, requests: {} };

    for (const request of config.requests) {
      try {
        if (request.type === "bilibili-profile") {
          context.requests[request.id] = await fetchBilibili(String(inputs.uid));
          continue;
        }

        const url = new URL(interpolateFromSource(request.url, context));
        for (const [key, value] of Object.entries(request.query)) {
          url.searchParams.set(key, decodeURIComponent(interpolateFromSource(value, context)));
        }
        context.requests[request.id] = await safeFetchJson(url.href);
      } catch (error) {
        if (request.failureMode === "continue") {
          context.requests[request.id] = {
            __error: error instanceof Error ? error.message : "请求失败",
          };
          continue;
        }
        throw new SafeFetchError(
          `数据源「${request.name}」失败：${error instanceof Error ? error.message : "请求失败"}`,
          error instanceof SafeFetchError ? error.status : 502,
        );
      }
    }
    raw = context;
  }

  return { raw, data: mapToCardData(raw, config) };
}
