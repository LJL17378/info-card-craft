import { createHash } from "node:crypto";
import type { CardData, WorkflowConfig } from "@/lib/card-schema";
import { mapToCardData, interpolate } from "@/lib/mapping";
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
  const nav = (await safeFetchJson(
    "https://api.bilibili.com/x/web-interface/nav",
    { headers },
  )) as {
    data?: { wbi_img?: { img_url?: string; sub_url?: string } };
  };
  const imgUrl = nav.data?.wbi_img?.img_url;
  const subUrl = nav.data?.wbi_img?.sub_url;
  if (!imgUrl || !subUrl) {
    throw new SafeFetchError("B 站没有返回公开签名参数", 502);
  }

  const infoQuery = signWbiQuery(
    { mid: uid, platform: "web", token: "", web_location: 1550101 },
    imgUrl,
    subUrl,
  );
  const archiveQuery = signWbiQuery(
    { mid: uid, pn: 1, ps: 1, order: "pubdate", platform: "web" },
    imgUrl,
    subUrl,
  );
  // Bilibili's public endpoints rate-limit bursts from data-center IPs, so keep
  // this connector sequential and let the public render route cache the result.
  const infoPayload = (await safeFetchJson(
    `https://api.bilibili.com/x/space/wbi/acc/info?${infoQuery}`,
    { headers },
  )) as { code?: number; message?: string; data?: Record<string, unknown> };
  const relationPayload = (await safeFetchJson(
    `https://api.bilibili.com/x/relation/stat?vmid=${encodeURIComponent(String(uid))}`,
    { headers },
  )) as { code?: number; data?: Record<string, unknown> };
  const archivePayload = (await safeFetchJson(
    `https://api.bilibili.com/x/space/wbi/arc/search?${archiveQuery}`,
    { headers },
  )) as {
    code?: number;
    data?: { page?: { count?: number } };
  };
  if (infoPayload.code !== 0 || !infoPayload.data) {
    throw new SafeFetchError(
      infoPayload.message || "B 站没有返回用户资料",
      502,
    );
  }
  const profile = infoPayload.data;
  const relation = relationPayload.code === 0 ? relationPayload.data ?? {} : {};
  return {
    profile: {
      uid: String(uid),
      name: profile.name ?? "",
      avatar: profile.face ?? "",
      banner: "",
      signature: profile.sign ?? "",
      level: Number(profile.level) || 0,
      following: Number(relation.following) || 0,
      followers: Number(relation.follower) || 0,
      likes: 0,
      archiveCount:
        archivePayload.code === 0 ? Number(archivePayload.data?.page?.count) || 0 : 0,
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

  if (config.template === "bilibili-user") {
    raw = await fetchBilibili(String(inputs.uid));
  } else {
    const fixedUrl =
      config.template === "github-user"
        ? `https://api.github.com/users/${encodeURIComponent(String(inputs.username))}`
        : interpolate(config.request.url, inputs);
    const url = new URL(fixedUrl);
    for (const [key, value] of Object.entries(config.request.query)) {
      url.searchParams.set(key, interpolate(value, inputs));
    }
    raw = await safeFetchJson(url.href);
  }

  return { raw, data: mapToCardData(raw, config) };
}
