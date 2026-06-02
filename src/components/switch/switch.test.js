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

async function assertAccessibleName(page, expectedRole, expectedName) {
  const client = await page.context().newCDPSession(page);

  let lastName;
  const targetExpected = expectedName ?? "";
  for (let i = 0; i < 20; i++) {
    const { nodes } = await client.send("Accessibility.getFullAXTree");
    const axNode = nodes.find((n) => n.role?.value === expectedRole);
    lastName = axNode?.name?.value ?? "";
    if (lastName === targetExpected) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  assert.strictEqual(
    lastName,
    targetExpected,
    `Expected accessible name for role "${expectedRole}" to be "${targetExpected}", but got "${lastName}"`,
  );
}

uiTest(
  "ds-switch should dynamically sync aria-label in browser AXTree",
  async (page) => {
    await page.mount('<ds-switch aria-label="Dark mode toggle"></ds-switch>');
    await assertAccessibleName(page, "switch", "Dark mode toggle");

    // Dynamically update the attribute
    await page.locator("ds-switch").evaluate((el) => {
      el.setAttribute("aria-label", "Light mode toggle");
    });
    await assertAccessibleName(page, "switch", "Light mode toggle");

    // Dynamically remove the attribute
    await page.locator("ds-switch").evaluate((el) => {
      el.removeAttribute("aria-label");
    });
    await assertAccessibleName(page, "switch", undefined);
  },
);
