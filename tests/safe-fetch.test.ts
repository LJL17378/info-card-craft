import { describe, expect, it } from "vitest";
import { assertPublicUrl, isPrivateAddress } from "@/lib/safe-fetch";

describe("SSRF guard", () => {
  it("blocks private and metadata address ranges", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
    expect(isPrivateAddress("10.0.0.8")).toBe(true);
    expect(isPrivateAddress("169.254.169.254")).toBe(true);
    expect(isPrivateAddress("192.168.1.1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("::1")).toBe(true);
  });

  it("rejects credentials and non-https URLs", async () => {
    await expect(assertPublicUrl("http://example.com/data")).rejects.toThrow(
      "只允许公开 HTTPS",
    );
    await expect(
      assertPublicUrl("https://user:secret@example.com/data"),
    ).rejects.toThrow("账号或密码");
    await expect(assertPublicUrl("https://127.0.0.1/data")).rejects.toThrow(
      "私有网络",
    );
  });
});
