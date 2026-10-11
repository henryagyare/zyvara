import { test, expect } from "@playwright/test";
import sharp from "sharp";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
test("desktop: sign in, create, submit, retry, reward, refresh, share, withdraw, delete", async ({
  page,
  request,
}) => {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Small actions. Lasting habits." }),
  ).toBeVisible();
  await expect(page.locator(".challenge-card").first()).toBeVisible();
  const protectedWrite = await request.post("/api/challenges", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: { title: "Unauthorized" },
  });
  expect(protectedWrite.status()).toBe(401);
  const badOrigin = await request.post("/api/session", {
    headers: { Origin: "https://untrusted.example" },
    data: { name: "X", accessCode: "local-zyvara-demo" },
  });
  expect(badOrigin.status()).toBe(403);
  const profile = "E2E " + Date.now();
  await page.goto("/signin?returnTo=/create");
  await page.getByLabel("Demo profile name").fill(profile);
  await page.getByLabel("Demo access code").fill("local-zyvara-demo");
  await page.getByRole("button", { name: "Enter restricted demo" }).click();
  await expect(page).toHaveURL(/\/create$/);
  const title = "Browser cleanup " + Date.now();
  await page.getByLabel("Challenge title").fill(title);
  await page
    .getByLabel("Describe the mission")
    .fill("Clean a small, permitted shared space safely.");
  await page
    .getByLabel("Evidence requirements")
    .fill("Show the cleaned space.\nDescribe safe disposal.");
  await page.getByRole("button", { name: "Publish challenge" }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const challengePath = new URL(page.url()).pathname;
  await page.getByRole("link", { name: "Take this challenge" }).click();
  const photo = await sharp(randomBytes(1200 * 1000 * 3), {
    raw: { width: 1200, height: 1000, channels: 3 },
  })
    .png()
    .toBuffer();
  expect(photo.length).toBeGreaterThan(3 * 1024 * 1024);
  let uploadedPhoto = false;
  page.on("request", (req) => {
    if (req.method() === "PUT" && req.url().endsWith("/file")) {
      uploadedPhoto = true;
      expect(req.headers()["content-type"]).toBe("image/jpeg");
    }
  });
  await page.getByLabel("Result photo (required)").setInputFiles({
    name: "cleanup.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await page
    .getByLabel("What did you do?")
    .fill(
      "I safely collected litter and sorted it into the correct disposal containers.",
    );
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page
    .getByLabel("Development assessment fixture")
    .selectOption("failure_once");
  await page.getByRole("button", { name: "Save evidence & assess" }).click();
  await expect(
    page.getByRole("heading", { name: "No points were awarded" }),
  ).toBeVisible();
  expect(uploadedPhoto).toBe(true);
  const assessmentPath = new URL(page.url()).pathname;
  await page.waitForTimeout(2200);
  await page
    .getByRole("button", { name: "Retry assessment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A contribution worth recognizing" }),
  ).toBeVisible();
  await expect(page.locator(".reward")).toHaveText("+50");
  await page.reload();
  await expect(page.locator(".reward")).toHaveText("+50");
  await expect(
    page.getByText("Sharing is off. Evidence is private."),
  ).toBeVisible();
  const resultSrc = await page
    .getByRole("img", { name: "Your submitted result" })
    .getAttribute("src");
  const savedPhoto = await page.request.get(resultSrc!);
  expect(savedPhoto.status()).toBe(200);
  const savedBytes = await savedPhoto.body();
  expect(savedBytes.length).toBeLessThan(1024 * 1024);
  expect((await sharp(savedBytes).metadata()).format).toBe("webp");
  const privateMedia = await request.get(resultSrc!);
  expect(privateMedia.status()).toBe(404);
  await page
    .getByRole("button", { name: "Share contribution", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Share contribution", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Share contribution", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish contribution", exact: true })
    .click();
  await expect(
    page.getByText("Sharing is on. This contribution is public."),
  ).toBeVisible();
  expect((await request.get(resultSrc!)).status()).toBe(200);
  await page.goto("/community");
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.goto(assessmentPath);
  await page
    .getByRole("button", { name: "Withdraw sharing", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Withdraw sharing", exact: true })
    .click();
  await expect(
    page.getByText("Sharing is off. Evidence is private."),
  ).toBeVisible();
  expect((await request.get(resultSrc!)).status()).toBe(404);
  await page.goto("/progress");
  await expect(page.locator(".stat").first().locator("strong")).toHaveText(
    "50",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await fs.mkdir("test-results/screenshots", { recursive: true });
  await page.screenshot({
    path: "test-results/screenshots/desktop-progress.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/signin?returnTo=/progress");
  await page.getByLabel("Demo profile name").fill(profile);
  await page.getByLabel("Demo access code").fill("local-zyvara-demo");
  await page.getByRole("button", { name: "Enter restricted demo" }).click();
  await expect(page.locator(".stat").first().locator("strong")).toHaveText(
    "50",
  );
  await page.goto(assessmentPath);
  await page
    .getByRole("button", { name: "Delete contribution", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete contribution", exact: true })
    .click();
  await expect(page).toHaveURL(/\/progress$/);
  await expect(
    page.getByRole("heading", { name: "Every journal starts with one action" }),
  ).toBeVisible();
  expect((await request.get(resultSrc!)).status()).toBe(404);
  expect(problems).toEqual([]);
  expect(challengePath).toContain("/challenges/");
});
test("mobile and desktop Discover: responsive layout, filtering and per-record navigation", async ({
  page,
}) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".challenge-card").first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await fs.mkdir("test-results/screenshots", { recursive: true });
    await page.screenshot({
      path: `test-results/screenshots/discover-${width}.png`,
      fullPage: true,
    });
    if (width === 390)
      await expect(
        page.getByRole("navigation", { name: "Mobile navigation" }),
      ).toBeVisible();
  }
  await page.getByRole("button", { name: "Planting", exact: true }).click();
  await expect(page.locator(".challenge-card")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Search challenges" })
    .fill("no matching title");
  await expect(
    page.getByRole("heading", { name: "No challenges found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator(".challenge-card").first()).toBeVisible();
});
