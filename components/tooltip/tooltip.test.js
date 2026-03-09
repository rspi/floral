import { uiTest } from "../../test-helper.js";
import assert from "node:assert";

uiTest("ds-tooltip should show on hover and hide on mouseleave", async (page) => {
  await page.mount(`
    <button id="trigger">Hover me</button>
    <ds-tooltip id="tip" anchor="trigger" delay="0">Tooltip content</ds-tooltip>
  `);

  const tooltipPopover = page.locator("ds-tooltip ds-popover");

  // Initial state: hidden
  assert.ok(
    !(await tooltipPopover.isVisible()),
    "Tooltip should be hidden initially",
  );

  // Hover to show
  await page.hover("#trigger");
  assert.ok(
    await tooltipPopover.isVisible(),
    "Tooltip should be visible on hover",
  );

  // Leave to hide
  await page.mouse.move(0, 0);
  await page.waitForFunction(
    () => !document.querySelector("ds-tooltip ds-popover").hasAttribute("open"),
  );
  assert.ok(
    !(await tooltipPopover.isVisible()),
    "Tooltip should be hidden after mouseleave",
  );
});

uiTest("ds-tooltip should show on focus and hide on blur", async (page) => {
  await page.mount(`
    <button id="trigger">Focus me</button>
    <ds-tooltip id="tip" anchor="trigger" delay="0">Tooltip content</ds-tooltip>
  `);

  const tooltipPopover = page.locator("ds-tooltip ds-popover");

  // Focus to show
  await page.focus("#trigger");
  assert.ok(
    await tooltipPopover.isVisible(),
    "Tooltip should be visible on focus",
  );

  // Blur to hide
  await page.evaluate(() => document.getElementById("trigger").blur());
  await page.waitForFunction(
    () => !document.querySelector("ds-tooltip ds-popover").hasAttribute("open"),
  );
  assert.ok(
    !(await tooltipPopover.isVisible()),
    "Tooltip should be hidden after blur",
  );
});

uiTest("ds-tooltip should respect delay attribute", async (page) => {
  await page.mount(`
    <button id="trigger">Delay</button>
    <ds-tooltip id="tip" anchor="trigger" delay="500">Tooltip content</ds-tooltip>
  `);

  const tooltipPopover = page.locator("ds-tooltip ds-popover");

  await page.hover("#trigger");

  // Should still be hidden immediately after hover
  assert.ok(
    !(await tooltipPopover.isVisible()),
    "Tooltip should not be visible immediately with delay",
  );

  // Wait for delay
  await page.waitForTimeout(600);
  assert.ok(
    await tooltipPopover.isVisible(),
    "Tooltip should be visible after delay",
  );
});

uiTest("ds-tooltip should update when anchor attribute changes", async (page) => {
  await page.mount(`
    <button id="btn1">Button 1</button>
    <button id="btn2">Button 2</button>
    <ds-tooltip id="tip" anchor="btn1" delay="0">Tooltip content</ds-tooltip>
  `);

  const tooltipPopover = page.locator("ds-tooltip ds-popover");

  // Verify first anchor
  await page.hover("#btn1");
  assert.ok(await tooltipPopover.isVisible(), "Visible on first anchor");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(100);

  // Change anchor
  await page.evaluate(() => {
    document.getElementById("tip").setAttribute("anchor", "btn2");
  });

  // Hover first anchor again (should NOT show)
  await page.hover("#btn1");
  assert.ok(
    !(await tooltipPopover.isVisible()),
    "Should NOT be visible on old anchor",
  );

  // Hover second anchor (should show)
  await page.hover("#btn2");
  assert.ok(
    await tooltipPopover.isVisible(),
    "Should be visible on new anchor",
  );
});
