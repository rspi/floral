import { uiTest } from "#test-helper";
import assert from "node:assert";

uiTest("ds-switch should be accessible", async (page) => {
  await page.mount("<ds-switch aria-label='Light mode'></ds-switch>");
  const sw = page.getByRole("switch", { name: "Light mode" });
  await sw.waitFor({ state: "visible" });
  await page.checkA11y();
});

uiTest("ds-switch should render and toggle state on click", async (page) => {
  await page.mount("<ds-switch aria-label='switch'></ds-switch>");
  const sw = page.getByRole("switch", { name: "switch" });
  await sw.waitFor({ state: "visible" });

  assert.strictEqual(await sw.isChecked(), false);

  await sw.click();
  assert.strictEqual(await sw.isChecked(), true);

  await sw.click();
  assert.strictEqual(await sw.isChecked(), false);
});

uiTest("ds-switch should initialize from 'checked' attribute", async (page) => {
  await page.mount("<ds-switch checked aria-label='switch'></ds-switch>");
  const sw = page.getByRole("switch", { name: "switch" });
  await sw.waitFor({ state: "visible" });

  assert.strictEqual(await sw.isChecked(), true);
});

uiTest("ds-switch should toggle state on Space key", async (page) => {
  await page.mount("<ds-switch aria-label='switch'></ds-switch>");
  const sw = page.getByRole("switch", { name: "switch" });
  await sw.waitFor({ state: "visible" });

  await sw.focus();
  await page.keyboard.press(" ");
  assert.strictEqual(await sw.isChecked(), true);

  await page.keyboard.press(" ");
  assert.strictEqual(await sw.isChecked(), false);
});

uiTest("ds-switch should dispatch 'change' event", async (page) => {
  await page.mount("<ds-switch id='sw' aria-label='switch'></ds-switch>");
  await page.evaluate(() => {
    window.changeCount = 0;
    document.getElementById("sw").addEventListener("change", () => {
      window.changeCount++;
    });
  });

  const sw = page.getByRole("switch", { name: "switch" });
  await sw.click();
  await sw.click();

  const count = await page.evaluate(() => window.changeCount);
  assert.strictEqual(
    count,
    2,
    "Change event should have been dispatched twice",
  );
});

uiTest("ds-switch should participate in forms", async (page) => {
  await page.mount(`
    <form id="myform">
      <ds-switch name="notifications" checked aria-label="notifications"></ds-switch>
      <ds-switch name="newsletter" aria-label="newsletter"></ds-switch>
      <button type="submit">Submit</button>
    </form>
  `);

  const formData = await page.evaluate(() => {
    return new Promise((resolve) => {
      const form = document.getElementById("myform");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        resolve(Object.fromEntries(fd.entries()));
      });
      form.querySelector("button").click();
    });
  });

  assert.strictEqual(formData["notifications"], "on");
  assert.strictEqual(formData["newsletter"], undefined);
});

uiTest("ds-switch should respect 'disabled' attribute", async (page) => {
  await page.mount("<ds-switch disabled aria-label='Switch'></ds-switch>");
  const sw = page.getByRole("switch", { name: "Switch" });
  await sw.waitFor({ state: "visible" });

  assert.strictEqual(await sw.isDisabled(), true);

  await sw.click({ force: true });
  const checked = await page.evaluate(() => {
    return document.querySelector("ds-switch").checked;
  });
  assert.strictEqual(checked, false);
});

uiTest("ds-switch should be disabled in a disabled fieldset", async (page) => {
  await page.mount(`
    <fieldset disabled>
      <ds-switch aria-label="Switch"></ds-switch>
    </fieldset>
  `);
  const sw = page.getByRole("switch", { name: "Switch" });
  assert.strictEqual(await sw.isDisabled(), true);
});

uiTest(
  "ds-switch should expose exactly one switch node in the Accessibility Tree (AXTree) to prevent double-announcement",
  async (page) => {
    await page.mount(`
      <label for="double-switch">Turbo Mode</label>
      <ds-switch id="double-switch"></ds-switch>
    `);
    const host = page.locator("#double-switch");
    await host.focus();

    // Query browser's AXTree
    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");

    // Filter for all nodes that expose a "switch" role
    const switchNodes = nodes.filter(
      (n) => n.role?.value === "switch" && !n.ignored,
    );

    assert.strictEqual(
      switchNodes.length,
      1,
      `Expected exactly 1 switch node in the AXTree, but found ${switchNodes.length}. Multiple switch nodes cause screen reader double-announcements.`,
    );

    assert.strictEqual(
      switchNodes[0].name?.value,
      "Turbo Mode",
      "Expected the single switch node to be named 'Turbo Mode'",
    );
  },
);

uiTest(
  "ds-switch should expose exactly one node with the computed accessible name in the Accessibility Tree (AXTree) to prevent the label from being read twice",
  async (page) => {
    await page.mount(`
      <label for="unique-label-switch">Turbo Mode</label>
      <ds-switch id="unique-label-switch"></ds-switch>
    `);
    const host = page.locator("#unique-label-switch");
    await host.focus();

    // Query browser's AXTree
    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");

    // Filter for non-ignored, focusable or interactive control nodes in the tree that carry the name "Turbo Mode"
    const interactiveNamedNodes = nodes.filter((n) => {
      if (n.ignored || n.name?.value !== "Turbo Mode") return false;

      const isControlRole = [
        "textbox",
        "switch",
        "checkbox",
        "button",
      ].includes(n.role?.value);
      const isFocusable = n.properties?.some(
        (p) => p.name === "focusable" && p.value?.value === true,
      );

      return isControlRole || isFocusable;
    });

    assert.strictEqual(
      interactiveNamedNodes.length,
      1,
      `Expected exactly 1 focusable/control node with the computed name "Turbo Mode" in the AXTree, but found ${interactiveNamedNodes.length}. Multiple focusable named nodes cause screen readers to announce the label twice.`,
    );
  },
);

uiTest(
  "ds-switch should dynamically synchronize associated Light-DOM labels to the inner input's computed name in the browser's Accessibility Tree (AXTree)",
  async (page) => {
    await page.mount(`
      <label id="sw-lbl1" for="labeled-switch">Enable Turbo</label>
      <ds-switch id="labeled-switch"></ds-switch>
      <label id="sw-lbl2" for="labeled-switch">Instantly</label>
    `);
    const host = page.locator("#labeled-switch");

    // Ensure focus triggers label syncing
    await host.focus();

    // Verify both labels are concatenated and computed as the accessible name via browser's raw AXTree
    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");
    const switchNode = nodes.find((n) => n.role?.value === "switch");

    assert.ok(switchNode, "Switch node not found in browser AXTree");
    assert.strictEqual(
      switchNode.name?.value,
      "Enable Turbo Instantly",
      "Browser computed an incorrect accessible name in the AXTree",
    );
  },
);

uiTest(
  "ds-switch should dynamically synchronize associated descriptions to the inner input's computed description in the browser's Accessibility Tree (AXTree)",
  async (page) => {
    await page.mount(`
      <ds-switch id="described-switch" aria-label="Dark Mode" aria-describedby="sw-desc1 sw-desc2"></ds-switch>
      <span id="sw-desc1">Turns screen dark.</span>
      <span id="sw-desc2">Saves battery life.</span>
    `);
    const host = page.locator("#described-switch");

    // Ensure focus triggers syncing
    await host.focus();

    // Verify descriptions are concatenated and computed as the accessible description via browser's raw AXTree
    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");
    const switchNode = nodes.find((n) => n.role?.value === "switch");

    assert.ok(switchNode, "Switch node not found in browser AXTree");
    assert.strictEqual(
      switchNode.description?.value,
      "Turns screen dark. Saves battery life.",
      "Browser computed an incorrect accessible description in the AXTree",
    );
  },
);
