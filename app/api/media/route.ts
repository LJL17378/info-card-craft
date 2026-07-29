import { NextRequest } from "next/server";

export const runtime = "nodejs";

const allowedHosts = new Set([
  "pic1.zhimg.com",
  "pic2.zhimg.com",
  "pic3.zhimg.com",
  "pic4.zhimg.com",
  "picx.zhimg.com",
]);

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");
  if (!source) return new Response("缺少图片地址", { status: 400 });

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return new Response("图片地址无效", { status: 400 });
  }
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) {
    return new Response("不允许代理该图片域名", { status: 403 });
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "https://www.zhihu.com/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    if (!response.ok) return new Response("图片加载失败", { status: 502 });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return new Response("上游响应不是图片", { status: 502 });
    }
    const body = await response.arrayBuffer();
    if (body.byteLength > 2 * 1024 * 1024) {
      return new Response("图片超过 2 MB", { status: 413 });
    }
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("图片代理请求失败", { status: 502 });
  }
}
