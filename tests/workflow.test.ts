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

  it("builds a social profile from embed inputs without making a network request", async () => {
    const config = structuredClone(getTemplate("douyin-profile").config);
    const result = await executeWorkflow(config, {
      name: "Video Maker",
      handle: "video-maker",
      followers: 12000,
      likes: 88000,
      "profile-url": "https://www.douyin.com/user/example",
    });

    expect(mocks.safeFetchJson).not.toHaveBeenCalled();
    expect(result.data.identity.title).toBe("Video Maker");
    expect(result.data.blocks.find((block) => block.type === "stats")).toMatchObject({
      type: "stats",
      items: expect.arrayContaining([{ label: "粉丝", value: "1.2万" }]),
    });
  });
});
