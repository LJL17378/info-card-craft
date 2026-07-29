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

test("creates and edits a vertical custom JSON card", async ({ page }) => {
  await page.goto("/studio/new");
  await page.getByRole("button", { name: /自定义 JSON API/ }).click();
  await expect(page.getByRole("heading", { name: "基础信息" })).toBeVisible();
  await page.getByRole("button", { name: /卡片设计/ }).click();
  await page.getByRole("button", { name: "纵向窄卡片" }).click();
  await expect(page.getByText("实时预览 · 纵向")).toBeVisible();
  await page.getByRole("button", { name: /预览发布/ }).click();
  await expect(page.locator(".code-window pre")).toContainText("<info-card-craft");
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
    .toBe(520);
});
