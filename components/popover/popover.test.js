import { uiTest } from "../../test-helper.js";
import assert from "node:assert";

uiTest(
  "ds-popover should show and hide using the open attribute",
  async (page) => {
    await page.mount(`
    <ds-popover id="pop">Popover content</ds-popover>
  `);

    const popover = page.locator("ds-popover");

    // Initial state: hidden
    assert.ok(
      !(await popover.isVisible()),
      "Popover should be hidden initially",
    );

    // Open via attribute
    await page.evaluate(() => {
      document.getElementById("pop").setAttribute("open", "");
    });
    assert.ok(
      await popover.isVisible(),
      "Popover should be visible after setting open attribute",
    );

    // Close via attribute
    await page.evaluate(() => {
      document.getElementById("pop").removeAttribute("open");
    });
    assert.ok(
      !(await popover.isVisible()),
      "Popover should be hidden after removing open attribute",
    );
  },
);

uiTest(
  "ds-popover should show and hide using show() and hide() methods",
  async (page) => {
    await page.mount(`
    <ds-popover id="pop">Popover content</ds-popover>
  `);

    const popover = page.locator("ds-popover");

    // Open via method
    await page.evaluate(() => {
      document.getElementById("pop").show();
    });
    assert.ok(
      await popover.isVisible(),
      "Popover should be visible after show()",
    );
    assert.ok(
      await popover.evaluate((el) => el.hasAttribute("open")),
      "Open attribute should be set after show()",
    );

    // Close via method
    await page.evaluate(() => {
      document.getElementById("pop").hide();
    });
    assert.ok(
      !(await popover.isVisible()),
      "Popover should be hidden after hide()",
    );
    assert.ok(
      !(await popover.evaluate((el) => el.hasAttribute("open"))),
      "Open attribute should be removed after hide()",
    );
  },
);

uiTest("ds-popover should link to an anchor element", async (page) => {
  await page.mount(`
    <button id="anchor-btn">Anchor</button>
    <ds-popover id="pop" anchor="anchor-btn" position="bottom">
      Popover content
    </ds-popover>
  `);

  const anchor = page.locator("#anchor-btn");
  const popover = page.locator("#pop");

  const anchorName = await anchor.evaluate((el) =>
    el.style.getPropertyValue("anchor-name"),
  );
  const positionAnchor = await popover.evaluate((el) =>
    el.style.getPropertyValue("position-anchor"),
  );
  const positionArea = await popover.evaluate((el) => el.style.positionArea);

  assert.strictEqual(
    anchorName,
    "--anchor-anchor-btn",
    "Anchor should have a predictable anchor-name",
  );
  assert.strictEqual(
    anchorName,
    positionAnchor,
    "Popover position-anchor should match anchor's anchor-name",
  );
  assert.strictEqual(
    positionArea,
    "bottom",
    "Popover position-area should match attribute",
  );
});

uiTest(
  "ds-popover should handle light dismiss and sync open attribute",
  async (page) => {
    await page.mount(`
    <div style="height: 100vh; width: 100vw;">
      <button id="other">Other</button>
      <ds-popover id="pop">Popover content</ds-popover>
    </div>
  `);

    await page.evaluate(() => {
      document.getElementById("pop").show();
    });

    const popover = page.locator("#pop");
    assert.ok(await popover.isVisible(), "Popover should be visible initially");

    // Click outside to trigger light dismiss
    await page.click("#other");

    // Wait for toggle event to propagate and attribute to sync
    await page.waitForFunction(
      () => !document.getElementById("pop").hasAttribute("open"),
    );

    assert.ok(
      !(await popover.isVisible()),
      "Popover should be hidden after light dismiss",
    );
    assert.ok(
      !(await popover.evaluate((el) => el.hasAttribute("open"))),
      "Open attribute should be removed after light dismiss",
    );
  },
);
