import { test, expect } from "@playwright/test";

test("renders a default button", async ({ page }) => {
  await page.goto("/blank");
  await page.evaluate(() => {
    document.body.innerHTML = "<ds-button>default</ds-button>";
  });

  const button = page.locator("ds-button");
  await expect(button).toBeVisible();
  await expect(button).toHaveText("default");
});
