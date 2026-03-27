import { uiTest } from "#test-helper";
import assert from "node:assert";

uiTest("ds-component should be accessible", async (page) => {
  await page.mount("<ds-component></ds-component>");

  // Favor role-based selection (e.g., 'button', 'textbox', 'checkbox', etc.)
  const component = page.getByRole("generic");
  await assert.doesNotReject(component.waitFor());

  // Perform standard accessibility audit
  await page.checkA11y();
});

uiTest("ds-component should handle basic state", async (page) => {
  await page.mount('<ds-component state="active"></ds-component>');
  // ... verify state via evaluate or ARIA
});
