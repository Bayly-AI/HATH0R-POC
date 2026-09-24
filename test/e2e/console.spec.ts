import { expect, test } from "@playwright/test";

/**
 * Browser e2e against local Vite + Express.
 * CLI may be missing in CI — UI must still render landmarks and degrade visibly.
 */

test.describe("Integration Console shell", () => {
  test("status page loads with landmarks and overall indicator", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Status", level: 1 })).toBeVisible();
    // Loading resolves to ready or error panel; either way Retry is present.
    await expect(page.getByRole("button", { name: /Retry|Refreshing/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Overall", { exact: true })).toBeVisible();
  });

  test("products page renders catalog region or error remediation", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "Products", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Retry|Refreshing/i })).toBeVisible({
      timeout: 30_000,
    });
    // After load: table, empty, or unavailable diagnostics — not a blank crash.
    const catalog = page.getByRole("heading", { name: "Catalog" });
    const error = page.getByRole("heading", { name: "Unable to load products" });
    await expect(catalog.or(error)).toBeVisible({ timeout: 30_000 });
  });

  test("diagnostics page shows entries or empty state", async ({ page }) => {
    await page.goto("/diagnostics");
    await expect(page.getByRole("heading", { name: "Diagnostics", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Retry|Refreshing/i })).toBeVisible({
      timeout: 30_000,
    });
    const entries = page.getByRole("heading", { name: "Entries" });
    const error = page.getByRole("heading", { name: "Unable to load diagnostics" });
    await expect(entries.or(error)).toBeVisible({ timeout: 30_000 });
  });

  test("about page shows identity and source-of-truth", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: "About", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Source of truth" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Boundaries" })).toBeVisible();
    await expect(page.getByText("HATHOR Integration Console POC")).toBeVisible();
  });

  test("primary nav moves between routes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Products" }).click();
    await expect(page).toHaveURL(/\/products/);
    await page.getByRole("link", { name: "Diagnostics" }).click();
    await expect(page).toHaveURL(/\/diagnostics/);
    await page.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/about/);
    await page.getByRole("link", { name: "Status" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
