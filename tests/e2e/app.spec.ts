import { expect, test } from "@playwright/test";

test("landing page explains the workflow and opens the studio", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "把流动的数据，做成博客的一部分。" }),
  ).toBeVisible();
  await expect(page.getByText("六步，从接口到博客。")).toBeVisible();
  await page.getByRole("link", { name: "进入工坊" }).click();
  await expect(page.getByRole("heading", { name: "卡片工坊" })).toBeVisible();
  await expect(page.getByText("我的 B 站名片")).toBeVisible();
});

test("creates a multi-source card and customizes its layout", async ({ page }) => {
  await page.goto("/studio/new");
  await page.getByRole("button", { name: /多源人物档案/ }).click();
  await expect(page.getByRole("heading", { name: "项目" })).toBeVisible();
  await page.getByRole("button", { name: "2 数据源" }).click();
  await expect(page.getByText("响应命名空间：requests.person")).toBeVisible();
  await expect(page.getByText("响应命名空间：requests.posts")).toBeVisible();
  await page.getByRole("button", { name: "5 视觉" }).click();
  await page.getByLabel("卡片方向").selectOption("vertical");
  await expect(page.getByText("560px · 纵向", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "6 发布" }).click();
  await expect(page.locator(".code-window pre")).toContainText("<info-card-craft");
});

test("offers Nowcoder, Zhihu and LeetCode templates with live previews", async ({
  page,
}) => {
  await page.goto("/studio/new");
  await expect(page.getByRole("button", { name: /牛客档案/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /知乎创作者/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /抖音主页/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /小红书主页/ })).toBeVisible();
  await page.getByRole("button", { name: /力扣进度/ }).click();
  await expect(page.getByText("LeetCode", { exact: true })).toBeVisible();
  await expect(page.getByText("已解决", { exact: true })).toBeVisible();
  await expect(page.locator(".leetcode-ring")).toBeVisible();
});

test("public demo render endpoint returns a normalized card", async ({ request }) => {
  const response = await request.get(
    "/api/public/cards/demo-github/render?input-username=torvalds",
  );
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.cardId).toBe("demo-github");
  expect(payload.data.identity.title).toBeTruthy();
  expect(payload.theme.direction).toBe("horizontal");
});

test("framework-free Web Component renders inside plain HTML", async ({ page }) => {
  await page.goto("/embed-test.html");
  const host = page.locator("info-card-craft");
  await expect
    .poll(() =>
      host.evaluate((element) =>
        element.shadowRoot?.querySelector(".card .name")?.textContent?.trim(),
      ),
    )
    .toBe("Linus Torvalds");
  await expect
    .poll(() =>
      host.evaluate((element) =>
        Math.round(element.getBoundingClientRect().width),
      ),
    )
    .toBe(560);
});
