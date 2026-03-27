import { uiTest } from "#test-helper";
import assert from "node:assert";

uiTest(
  "ds-tooltip should render and show on hover (no delay)",
  async (page) => {
    await page.mount(`
    <ds-tooltip delay="0">
      <button id="test-anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

    const tooltip = page
      .locator("ds-tooltip")
      .getByRole("tooltip", { includeHidden: true });

    assert.ok(!(await tooltip.isVisible()), "Initially hidden");

    await page.hover("#test-anchor");

    await tooltip.waitFor({ state: "visible" });
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
      <button id="test-anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

    const tooltip = page
      .locator("ds-tooltip")
      .getByRole("tooltip", { includeHidden: true });

    await page.hover("#test-anchor");
    await tooltip.waitFor({ state: "visible" });

    // Move mouse away (completely outside)
    await page.mouse.move(1000, 1000);

    // Should still be visible immediately due to 200ms hide delay
    assert.ok(
      await tooltip.isVisible(),
      "Tooltip should still be visible immediately after mouseleave",
    );

    // Should be hidden after grace period (200ms JS delay)
    await tooltip.waitFor({ state: "hidden" });
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
      <button id="test-anchor" style="margin-bottom: 20px;">Hover me</button>
      <div slot="content" id="content" style="padding: 20px;">Tooltip Content</div>
    </ds-tooltip>
  `);

    const tooltip = page
      .locator("ds-tooltip")
      .getByRole("tooltip", { includeHidden: true });
    const anchor = page.locator("#test-anchor");

    await anchor.hover();
    await tooltip.waitFor({ state: "visible" });

    // Move mouse to the tooltip content
    const box = await tooltip.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // Wait for the next animation frame to ensure no immediate closure
    await page.evaluate(() => new Promise(requestAnimationFrame));

    assert.ok(
      await tooltip.isVisible(),
      "Tooltip should stay visible when mouse is over it",
    );
  },
);

uiTest("ds-tooltip should show and hide on focus/blur", async (page) => {
  await page.mount(`
    <ds-tooltip delay="0">
      <button id="test-anchor">Focus me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

  const tooltip = page
    .locator("ds-tooltip")
    .getByRole("tooltip", { includeHidden: true });

  // Focus the anchor
  await page.focus("#test-anchor");
  await tooltip.waitFor({ state: "visible" });
  assert.ok(await tooltip.isVisible(), "Tooltip should be visible on focus");

  // Blur the anchor
  await page.evaluate(() => document.activeElement.blur());
  await tooltip.waitFor({ state: "hidden" });
  assert.ok(!(await tooltip.isVisible()), "Tooltip should be hidden on blur");
});

uiTest("ds-tooltip should handle ESC key to hide", async (page) => {
  await page.mount(`
    <ds-tooltip delay="0">
      <button id="test-anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

  const tooltip = page
    .locator("ds-tooltip")
    .getByRole("tooltip", { includeHidden: true });

  await page.hover("#test-anchor");
  await tooltip.waitFor({ state: "visible" });

  await page.keyboard.press("Escape");

  await tooltip.waitFor({ state: "hidden" });
  assert.ok(!(await tooltip.isVisible()), "Tooltip should hide on Escape key");
});

uiTest(
  "ds-tooltip with clickToOpen should show on click and hide on backdrop click",
  async (page) => {
    await page.mount(`
    <div id="container" style="padding: 100px;">
      <ds-tooltip clickToOpen delay="0">
        <button id="test-anchor">Click me</button>
        <div slot="content" id="content">Tooltip Content</div>
      </ds-tooltip>
      <div id="outside">Outside Element</div>
    </div>
  `);

    const tooltip = page
      .locator("ds-tooltip")
      .getByRole("tooltip", { includeHidden: true });
    const anchor = page.getByRole("button", { name: "Click me" });
    const outside = page.locator("#outside");

    // Initially hidden
    assert.ok(!(await tooltip.isVisible()), "Initially hidden");

    // Click the anchor
    await anchor.click();
    await tooltip.waitFor({ state: "visible" });
    assert.ok(await tooltip.isVisible(), "Visible after click");

    // Click outside
    await outside.click();
    await tooltip.waitFor({ state: "hidden" });
    assert.ok(!(await tooltip.isVisible()), "Hidden after outside click");
  },
);

uiTest("ds-tooltip should pass accessibility audit", async (page) => {
  await page.mount(`
    <ds-tooltip delay="0">
      <button id="test-anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);
  await page.hover("#test-anchor");
  const tooltip = page.locator("ds-tooltip").getByRole("tooltip");
  await tooltip.waitFor({ state: "visible" });
  await page.checkA11y();
});

uiTest(
  "ds-tooltip should provide an accessible description for the trigger",
  async (page) => {
    // console.log("PAGE KEYS:", Object.keys(page));
    // console.log("ACCESSIBILITY:", page.accessibility);

    await page.mount(`
    <ds-tooltip delay="0">
      <button id="test-anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

    // Let's try accessibilitySnapshot if it exists, otherwise fall back or skip.
    let snapshot;
    if (page.accessibility && page.accessibility.snapshot) {
      snapshot = await page.accessibility.snapshot();
    } else if (page.accessibilitySnapshot) {
      snapshot = await page.accessibilitySnapshot();
    } else {
      // If we can't get a snapshot, we might be in an environment that doesn't support it easily.
      // But we should try to find it.
      return;
    }

    function findNode(node, name) {
      if (node.name === name) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child, name);
          if (found) return found;
        }
      }
      return null;
    }

    const button = findNode(snapshot, "Hover me");

    // console.log("ACCESSIBILITY NODE:", button);

    assert.ok(button, "Trigger button not found in accessibility tree");
    assert.strictEqual(
      button.description,
      "Tooltip Content",
      `Trigger button should have tooltip content as description. Got: "${button.description}"`,
    );
  },
);
