import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 8_000;

export class SafeFetchError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "SafeFetchError";
  }
}

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) return true;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export async function assertPublicUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeFetchError("请求地址不是有效 URL");
  }

  const allowHttp =
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_INSECURE_HTTP === "true";
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    throw new SafeFetchError("只允许公开 HTTPS 地址");
  }
  if (url.username || url.password) {
    throw new SafeFetchError("请求地址不能包含账号或密码");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal"
  ) {
    throw new SafeFetchError("不能请求本机、局域网或云元数据地址");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new SafeFetchError("不能请求私有网络地址");
    }
  } else {
    let addresses;
    try {
      addresses = await lookup(hostname, { all: true });
    } catch {
      throw new SafeFetchError("无法解析请求域名");
    }
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new SafeFetchError("请求域名解析到了非公网地址");
    }
  }
  return url;
}

async function readLimitedBody(response: Response) {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new SafeFetchError("上游响应超过 1 MB 限制", 413);
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new SafeFetchError("上游响应超过 1 MB 限制", 413);
    }
    chunks.push(value);
  }
  const output = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(output);
}

export async function safeFetchJson(
  rawUrl: string,
  options: { headers?: Record<string, string> } = {},
): Promise<unknown> {
  let url = await assertPublicUrl(rawUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "InfoCardCraft/0.1 (+https://github.com/LJL17378/info-card-craft)",
          ...options.headers,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new SafeFetchError(
        error instanceof Error && error.name === "TimeoutError"
          ? "上游接口响应超时"
          : "无法连接上游接口",
        502,
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) {
        throw new SafeFetchError("上游重定向次数过多", 502);
      }
      url = await assertPublicUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok) {
      throw new SafeFetchError(`上游接口返回 HTTP ${response.status}`, 502);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json") && !contentType.includes("+json")) {
      throw new SafeFetchError("首版只支持 JSON 响应");
    }
    const text = await readLimitedBody(response);
    try {
      return JSON.parse(text);
    } catch {
      throw new SafeFetchError("上游没有返回有效 JSON", 502);
    }
  }
  throw new SafeFetchError("请求失败", 502);
}
