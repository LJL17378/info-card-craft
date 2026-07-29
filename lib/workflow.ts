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
    `https://api.bilibili.com/x/web-interface/card?mid=${encodeURIComponent(String(uid))}&photo=true`,
    { headers },
  )) as {
    code?: number;
    message?: string;
    data?: {
      card?: Record<string, unknown> & {
        level_info?: { current_level?: number };
        pendant?: { image?: string; image_enhance?: string };
      };
      space?: { l_img?: string; s_img?: string };
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
      banner:
        cardPayload.data.space?.l_img ??
        cardPayload.data.space?.s_img ??
        enriched.top_photo ??
        "",
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

async function fetchFixedResponse(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        ...init.headers,
      },
    });
    if (!response.ok) {
      throw new SafeFetchError(`上游接口返回 HTTP ${response.status}`, 502);
    }
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > 1024 * 1024) {
      throw new SafeFetchError("上游响应超过 1 MB 限制", 413);
    }
    return response;
  } catch (error) {
    if (error instanceof SafeFetchError) throw error;
    throw new SafeFetchError(
      error instanceof Error && error.name === "TimeoutError"
        ? "上游接口响应超时"
        : "无法连接上游接口",
      502,
    );
  }
}

async function fetchZhihu(token: string | number) {
  const slug = String(token);
  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(slug)) {
    throw new SafeFetchError("知乎主页标识格式不正确");
  }
  const include = [
    "answer_count",
    "articles_count",
    "follower_count",
    "following_count",
    "voteup_count",
    "thanked_count",
  ].join(",");
  const profile = await safeFetchJson(
    `https://www.zhihu.com/api/v4/members/${encodeURIComponent(slug)}?include=${encodeURIComponent(include)}`,
    {
      headers: {
        Referer: `https://www.zhihu.com/people/${encodeURIComponent(slug)}`,
        "User-Agent": "Mozilla/5.0",
      },
    },
  ) as Record<string, unknown>;
  return { ...profile, url: `https://www.zhihu.com/people/${slug}` };
}

async function fetchLeetCode(slugValue: string | number) {
  const slug = String(slugValue);
  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(slug)) {
    throw new SafeFetchError("力扣用户名格式不正确");
  }
  const query = `query getUserProfile($username: String!) {
    userProfileUserQuestionProgress(userSlug: $username) {
      numAcceptedQuestions { count difficulty }
    }
    userProfilePublicProfile(userSlug: $username) {
      siteRanking
      profile {
        userSlug realName aboutMe userAvatar location github job
        school: schoolV2 { name }
        company: companyV2 { name }
      }
    }
  }`;
  const response = await fetchFixedResponse("https://leetcode.cn/graphql/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: `https://leetcode.cn/u/${encodeURIComponent(slug)}/`,
    },
    body: JSON.stringify({ query, variables: { username: slug } }),
  });
  const payload = await response.json() as {
    errors?: Array<{ message?: string }>;
    data?: {
      userProfileUserQuestionProgress?: {
        numAcceptedQuestions?: Array<{ count?: number; difficulty?: string }>;
      };
      userProfilePublicProfile?: {
        siteRanking?: number;
        profile?: Record<string, unknown>;
      };
    };
  };
  const publicProfile = payload.data?.userProfilePublicProfile;
  if (!publicProfile?.profile) {
    throw new SafeFetchError(payload.errors?.[0]?.message || "力扣没有返回用户资料", 502);
  }
  const accepted = Object.fromEntries(
    (payload.data?.userProfileUserQuestionProgress?.numAcceptedQuestions ?? [])
      .map((item) => [String(item.difficulty ?? "").toLowerCase(), Number(item.count) || 0]),
  );
  return {
    username: slug,
    profile: publicProfile.profile,
    siteRanking: Number(publicProfile.siteRanking) || 0,
    accepted: {
      easy: accepted.easy ?? 0,
      medium: accepted.medium ?? 0,
      hard: accepted.hard ?? 0,
      total: Object.values(accepted).reduce((sum, value) => sum + value, 0),
    },
    url: `https://leetcode.cn/u/${slug}/`,
  };
}

async function fetchNowcoder(idValue: string | number) {
  const id = String(idValue);
  if (!/^\d{1,20}$/.test(id)) {
    throw new SafeFetchError("牛客用户 ID 必须是数字");
  }
  const response = await fetchFixedResponse(`https://www.nowcoder.com/users/${id}`, {
    headers: { Accept: "text/html" },
  });
  const html = await response.text();
  if (html.length > 1024 * 1024) {
    throw new SafeFetchError("上游响应超过 1 MB 限制", 413);
  }
  const marker = "window.__INITIAL_STATE__=";
  const start = html.indexOf(marker);
  const end = start < 0 ? -1 : html.indexOf(";(function()", start);
  if (start < 0 || end < 0) {
    throw new SafeFetchError("牛客页面没有返回公开资料", 502);
  }
  let state: {
    store?: {
      profile?: {
        profile?: Record<string, unknown>;
        followData?: Record<string, unknown>;
      };
    };
  };
  try {
    state = JSON.parse(html.slice(start + marker.length, end));
  } catch {
    throw new SafeFetchError("牛客公开资料解析失败", 502);
  }
  const profile = state.store?.profile?.profile;
  if (!profile) throw new SafeFetchError("牛客用户不存在或资料不可见", 404);
  return {
    ...profile,
    stats: state.store?.profile?.followData ?? {},
    url: `https://www.nowcoder.com/users/${id}`,
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
        if (request.type === "zhihu-profile") {
          context.requests[request.id] = await fetchZhihu(String(inputs.token));
          continue;
        }
        if (request.type === "leetcode-profile") {
          context.requests[request.id] = await fetchLeetCode(String(inputs.username));
          continue;
        }
        if (request.type === "nowcoder-profile") {
          context.requests[request.id] = await fetchNowcoder(String(inputs["user-id"]));
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
