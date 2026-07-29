import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  safeFetchJson: vi.fn(),
}));

vi.mock("@/lib/safe-fetch", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/safe-fetch")>();
  return { ...original, safeFetchJson: mocks.safeFetchJson };
});

import { getTemplate } from "@/lib/templates";
import { executeWorkflow } from "@/lib/workflow";

describe("multi-source workflow", () => {
  beforeEach(() => {
    mocks.safeFetchJson.mockReset();
  });

  it("executes sources in order and lets later URLs reference earlier responses", async () => {
    mocks.safeFetchJson
      .mockResolvedValueOnce({
        userId: 7,
        id: 3,
        title: "First response",
        completed: true,
      })
      .mockResolvedValueOnce({
        title: "Dependent response",
        body: "Combined safely.",
      });

    const config = structuredClone(getTemplate("api-dashboard").config);
    const result = await executeWorkflow(config, { id: 3 });

    expect(mocks.safeFetchJson).toHaveBeenNthCalledWith(
      1,
      "https://jsonplaceholder.typicode.com/todos/3",
    );
    expect(mocks.safeFetchJson).toHaveBeenNthCalledWith(
      2,
      "https://jsonplaceholder.typicode.com/posts/7",
    );
    expect(result.raw).toMatchObject({
      input: { id: 3 },
      requests: {
        todo: { userId: 7 },
        post: { title: "Dependent response" },
      },
    });
    const textBlock = result.data.blocks.find((block) => block.type === "text");
    expect(textBlock?.type === "text" && textBlock.content).toBe("Combined safely.");
  });

  it("keeps a failed optional source in the response context and continues", async () => {
    mocks.safeFetchJson
      .mockResolvedValueOnce({ userId: 1, id: 1, title: "Task", completed: false })
      .mockRejectedValueOnce(new Error("upstream unavailable"));

    const config = structuredClone(getTemplate("api-dashboard").config);
    const result = await executeWorkflow(config, { id: 1 });

    expect(result.raw).toMatchObject({
      requests: {
        post: { __error: "upstream unavailable" },
      },
    });
  });

  it("composes geocoding, dependent weather, a quote and an illustration", async () => {
    mocks.safeFetchJson
      .mockResolvedValueOnce({
        results: [{ name: "上海", latitude: 31.22222, longitude: 121.45806, country: "中国" }],
      })
      .mockResolvedValueOnce({
        current_units: { temperature_2m: "°C", wind_speed_10m: "km/h" },
        current: { temperature_2m: 29.9, apparent_temperature: 36.2, relative_humidity_2m: 76, wind_speed_10m: 6 },
      })
      .mockResolvedValueOnce({ hitokoto: "不负韶华，不忘初心。", from: "Jane", uuid: "quote-id" })
      .mockResolvedValueOnce({
        results: [{ artist_name: "Artist", source_url: "https://example.com/art", url: "https://example.com/art.png" }],
      });

    const config = structuredClone(getTemplate("city-inspiration").config);
    const result = await executeWorkflow(config, { city: "上海" });

    expect(mocks.safeFetchJson).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("latitude=31.22222"),
    );
    expect(mocks.safeFetchJson).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("longitude=121.45806"),
    );
    expect(result.data.identity.title).toBe("上海");
    expect(result.data.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "image", src: "https://example.com/art.png" }),
      expect.objectContaining({ type: "text", content: "不负韶华，不忘初心。" }),
    ]));
  });
});
