import { getTemplate } from "@/lib/templates";
import { executeWorkflow } from "@/lib/workflow";

const config = structuredClone(getTemplate("city-inspiration").config);
const result = await executeWorkflow(config, { city: "杭州" });
const raw = result.raw as {
  requests: {
    location: { results?: Array<{ name?: string }> };
    weather: { current?: { temperature_2m?: number } };
    quote: { hitokoto?: string };
    art: { results?: Array<{ url?: string }> };
  };
};

const summary = {
  city: raw.requests.location.results?.[0]?.name,
  temperature: raw.requests.weather.current?.temperature_2m,
  quote: raw.requests.quote.hitokoto,
  image: raw.requests.art.results?.[0]?.url,
  renderedBlocks: result.data.blocks.map((block) => block.type),
};

if (
  !summary.city ||
  typeof summary.temperature !== "number" ||
  !summary.quote ||
  !summary.image
) {
  throw new Error(`公共 API 组合结果不完整：${JSON.stringify(summary)}`);
}

console.log(JSON.stringify(summary, null, 2));
