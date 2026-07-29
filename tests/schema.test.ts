import { describe, expect, it } from "vitest";
import { workflowConfigSchema } from "@/lib/card-schema";
import { getTemplate } from "@/lib/templates";

describe("workflow schema", () => {
  it("accepts all official template defaults", () => {
    for (const key of [
      "bilibili-user",
      "github-user",
      "custom-json",
      "multi-source-profile",
      "api-dashboard",
      "nowcoder-user",
      "zhihu-user",
      "leetcode-user",
    ] as const) {
      expect(workflowConfigSchema.safeParse(getTemplate(key).config).success).toBe(true);
    }
  });

  it("rejects unsafe input names and excess mappings", () => {
    const config = structuredClone(getTemplate("custom-json").config);
    config.inputs[0].key = "Bad Key";
    expect(workflowConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects duplicate request namespaces", () => {
    const config = structuredClone(getTemplate("github-user").config);
    config.requests[1].id = config.requests[0].id;
    expect(workflowConfigSchema.safeParse(config).success).toBe(false);
  });
});
