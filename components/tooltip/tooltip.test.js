import { uiTest } from "#test-helper";
import assert from "node:assert";

uiTest("ds-tooltip should show on hover after default delay", async (page) => {
  await page.mount(`
    <ds-tooltip>
      <button id="anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

  const tooltip = page.locator("ds-tooltip >> #tooltip");

  await page.hover("#anchor");
  assert.ok(!(await tooltip.isVisible()), "Initially hidden");

  // Fast forward 500ms (default show delay)
  await page.clock.fastForward(500);
  assert.ok(await tooltip.isVisible(), "Visible after show delay");
});

uiTest(
  "ds-tooltip should render and show on hover (no delay)",
  async (page) => {
    await page.mount(`
    <ds-tooltip delay="0">
      <button id="anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

    const tooltip = page.locator("ds-tooltip >> #tooltip");

    assert.ok(!(await tooltip.isVisible()), "Initially hidden");

    await page.hover("#anchor");

    await page.clock.fastForward(0);
    assert.ok(
      await tooltip.isVisible(),
      "Tooltip should be visible after 0 delay",
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
    await page.clock.fastForward(0);
    assert.ok(await tooltip.isVisible(), "Tooltip visible");

    // Move mouse away (completely outside)
    await page.mouse.move(1000, 1000);

    // Should still be visible immediately due to 200ms hide delay
    assert.ok(
      await tooltip.isVisible(),
      "Tooltip should still be visible immediately after mouseleave",
    );

    // Should be hidden after grace period (200ms JS delay)
    await page.clock.fastForward(200);
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
    await page.clock.fastForward(0);
    assert.ok(await tooltip.isVisible(), "Tooltip visible");

    // Move mouse to the tooltip content
    const box = await tooltip.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // Fast forward more than the 200ms hardcoded delay to ensure it doesn't close
    await page.clock.fastForward(250);
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
  await page.clock.fastForward(0);
  assert.ok(await tooltip.isVisible(), "Tooltip should be visible on focus");

  // Blur the anchor
  await page.evaluate(() => document.activeElement.blur());
  assert.ok(!(await tooltip.isVisible()), "Tooltip should be hidden on blur");
});

uiTest("ds-tooltip should handle ESC key to hide", async (page) => {
  await page.mount(`
    <ds-tooltip delay="0">
      <button id="anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

  const tooltip = page.locator("ds-tooltip >> #tooltip");

  await page.hover("#anchor");
  await page.clock.fastForward(0);
  assert.ok(await tooltip.isVisible(), "Tooltip visible");

  await page.keyboard.press("Escape");
  assert.ok(!(await tooltip.isVisible()), "Tooltip should hide on Escape key");
});

uiTest(
  "ds-tooltip with clickToOpen should show on click and hide on backdrop click",
  async (page) => {
    await page.mount(`
    <div id="container" style="padding: 100px;">
      <ds-tooltip clickToOpen delay="0">
        <button id="anchor">Click me</button>
        <div slot="content" id="content">Tooltip Content</div>
      </ds-tooltip>
      <div id="outside">Outside Element</div>
    </div>
  `);

    const tooltip = page.locator("ds-tooltip >> #tooltip");
    const anchor = page.locator("button#anchor");
    const outside = page.locator("#outside");

    // Initially hidden
    assert.ok(!(await tooltip.isVisible()), "Initially hidden");

    // Click the anchor
    await anchor.click();
    await page.clock.fastForward(0);
    assert.ok(await tooltip.isVisible(), "Visible after click");

    // Click outside
    await outside.click();
    assert.ok(!(await tooltip.isVisible()), "Hidden after outside click");
  },
);
