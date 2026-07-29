import { describe, expect, it } from "vitest";
import {
  applyFormatter,
  collectJsonPaths,
  getByPath,
  interpolate,
  mapToCardData,
} from "@/lib/mapping";
import { getTemplate } from "@/lib/templates";

describe("field mapping", () => {
  it("reads nested objects and arrays", () => {
    const source = { user: { repos: [{ name: "craft" }] } };
    expect(getByPath(source, "user.repos[0].name")).toBe("craft");
    expect(getByPath(source, "user.missing")).toBeUndefined();
  });

  it("applies finite safe formatters", () => {
    expect(applyFormatter(12500, { type: "compact-number" })).toContain("万");
    expect(applyFormatter("abcdefgh", { type: "truncate", value: 4 })).toBe("abcd…");
    expect(applyFormatter("42", { type: "prefix", value: "LV" })).toBe("LV42");
    expect(applyFormatter(["A", "B"], { type: "join", value: " / " })).toBe("A / B");
  });

  it("maps a GitHub response into the normalized card model", () => {
    const config = getTemplate("github-user").config;
    const result = mapToCardData(
      {
        name: "Octo Cat",
        login: "octocat",
        avatar_url: "https://example.com/avatar.png",
        html_url: "https://github.com/octocat",
        type: "User",
        bio: "Hello",
        public_repos: 12,
        followers: 3456,
        following: 7,
      },
      config,
    );
    expect(result.identity.title).toBe("Octo Cat");
    expect(result.identity.subtitle).toBe("@octocat");
    expect(result.stats[0]).toEqual({ label: "仓库", value: "12" });
    expect(result.actions.url).toBe("https://github.com/octocat");
  });

  it("interpolates only named input placeholders", () => {
    expect(interpolate("https://example.com/{{id}}?q={{name}}", { id: 3, name: "a b" })).toBe(
      "https://example.com/3?q=a%20b",
    );
  });

  it("collects leaf paths for the visual response picker", () => {
    const paths = collectJsonPaths({ user: { name: "Ada", tags: ["dev"] } }).map(
      (item) => item.path,
    );
    expect(paths).toEqual(["user.name", "user.tags.0"]);
  });
});
