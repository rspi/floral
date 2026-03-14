import { uiTest } from "../../test-helper.js";
import assert from "node:assert";

uiTest(
  "ds-tooltip should render and show on hover after delay",
  async (page) => {
    await page.mount(`
    <ds-tooltip delay="500">
      <button id="anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

    const tooltip = page.locator("ds-tooltip >> #tooltip");

    // Initially hidden
    await assert.rejects(tooltip.waitFor({ state: "visible", timeout: 100 }));

    // Hover over the anchor
    await page.hover("#anchor");

    // Should become visible after delay (500ms)
    await tooltip.waitFor({ state: "visible", timeout: 1000 });
    assert.ok(
      await tooltip.isVisible(),
      "Tooltip should be visible after delay",
    );
  },
);

uiTest(
  "ds-tooltip should hide on mouseleave after grace period",
  async (page) => {
    await page.mount(`
    <ds-tooltip delay="0">
      <button id="anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

    const tooltip = page.locator("ds-tooltip >> #tooltip");

    await page.hover("#anchor");
    await tooltip.waitFor({ state: "visible" });

    // Move mouse away
    await page.mouse.move(0, 0);

    // Should still be visible immediately due to 150ms hide delay
    assert.ok(
      await tooltip.isVisible(),
      "Tooltip should still be visible immediately after mouseleave",
    );

    // Should be hidden after grace period (200ms JS delay + 200ms CSS transition)
    await tooltip.waitFor({ state: "hidden", timeout: 1000 });
    assert.ok(
      !(await tooltip.isVisible()),
      "Tooltip should be hidden after grace period",
    );
  },
);

uiTest(
  "ds-tooltip should stay open when moving mouse from anchor to tooltip",
  async (page) => {
    await page.mount(`
    <ds-tooltip delay="0">
      <button id="anchor" style="margin-bottom: 20px;">Hover me</button>
      <div slot="content" id="content" style="padding: 20px;">Tooltip Content</div>
    </ds-tooltip>
  `);

    const tooltip = page.locator("ds-tooltip >> #tooltip");

    await page.hover("#anchor");
    await tooltip.waitFor({ state: "visible" });

    // Move mouse to the tooltip content
    const box = await tooltip.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // Wait a bit to ensure it doesn't close
    await page.waitForTimeout(300);
    assert.ok(
      await tooltip.isVisible(),
      "Tooltip should stay visible when mouse is over it",
    );
  },
);

uiTest("ds-tooltip should show and hide on focus/blur", async (page) => {
  await page.mount(`
    <ds-tooltip delay="0">
      <button id="anchor">Focus me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

  const tooltip = page.locator("ds-tooltip >> #tooltip");

  // Focus the anchor
  await page.focus("#anchor");
  await tooltip.waitFor({ state: "visible" });
  assert.ok(await tooltip.isVisible(), "Tooltip should be visible on focus");

  // Blur the anchor
  await page.evaluate(() => document.activeElement.blur());
  await tooltip.waitFor({ state: "hidden" });
  assert.ok(!(await tooltip.isVisible()), "Tooltip should be hidden on blur");
});

uiTest("ds-tooltip should handle ESC key to hide", async (page) => {
  // Popover API handles ESC automatically if it has focus or is a light-dismiss popover.
  // Our tooltip uses 'popover' attribute.
  await page.mount(`
    <ds-tooltip delay="0">
      <button id="anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

  const tooltip = page.locator("ds-tooltip >> #tooltip");

  await page.hover("#anchor");
  await tooltip.waitFor({ state: "visible" });

  await page.keyboard.press("Escape");

  // Note: Popover API might need the popover to be focused or have a specific configuration for ESC.
  // By default, a 'popover' should hide on ESC.
  await tooltip.waitFor({ state: "hidden" });
  assert.ok(!(await tooltip.isVisible()), "Tooltip should hide on Escape key");
});
