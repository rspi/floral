import assert from "node:assert";
import { uiTest } from "#test-helper";

async function defineElement(page, name, config = {}) {
  await page.evaluate(
    async ({ name, config }) => {
      if (customElements.get(name)) return;
      const { CustomElement } = await import("/src/utils.js");
      window.customElements.define(
        name,
        class extends CustomElement {
          static template = config.template || "<div></div>";
          static meta = config.meta || {};
          handleStateChange(n, o, nv) {
            if (config.trackChanges) {
              this.lastChange = { name: n, oldValue: o, newValue: nv };
            }
          }
        },
      );
    },
    { name, config },
  );
}

uiTest("CustomElement should sync attribute to property", async (page) => {
  await defineElement(page, "ds-test-element-attr", {
    meta: { attributes: { "test-attr": [] } },
  });

  await page.mount(
    '<ds-test-element-attr test-attr="hello"></ds-test-element-attr>',
  );
  const host = page.locator("ds-test-element-attr");
  const value = await host.evaluate((el) => el["test-attr"]);
  assert.strictEqual(value, "hello");
});

uiTest("CustomElement should sync property to state", async (page) => {
  await defineElement(page, "ds-test-element-state", {
    meta: { attributes: { "test-attr": [] } },
  });

  await page.mount("<ds-test-element-state></ds-test-element-state>");
  const host = page.locator("ds-test-element-state");

  await host.evaluate((el) => {
    el["test-attr"] = "world";
  });

  const value = await host.evaluate((el) => el["test-attr"]);
  assert.strictEqual(value, "world");
});

uiTest("CustomElement should handle boolean attributes", async (page) => {
  await defineElement(page, "ds-test-element-bool", {
    meta: { attributes: { "test-bool": [""] } },
  });

  await page.mount("<ds-test-element-bool test-bool></ds-test-element-bool>");
  const host = page.locator("ds-test-element-bool");

  assert.strictEqual(await host.evaluate((el) => el["test-bool"]), true);
  assert.strictEqual(
    await host.evaluate((el) => el.internals.states.has("test-bool")),
    true,
  );

  await host.evaluate((el) => {
    el["test-bool"] = false;
  });

  assert.strictEqual(await host.evaluate((el) => el["test-bool"]), false);
  assert.strictEqual(
    await host.evaluate((el) => el.internals.states.has("test-bool")),
    false,
  );
});

uiTest("CustomElement should handle enum attributes", async (page) => {
  await defineElement(page, "ds-test-element-enum", {
    meta: { attributes: { "test-enum": ["a", "b"] } },
  });

  await page.mount(
    '<ds-test-element-enum test-enum="a"></ds-test-element-enum>',
  );
  const host = page.locator("ds-test-element-enum");

  assert.strictEqual(await host.evaluate((el) => el["test-enum"]), "a");
  assert.strictEqual(
    await host.evaluate((el) => el.internals.states.has("test-enum-a")),
    true,
  );

  await host.evaluate((el) => {
    el["test-enum"] = "b";
  });

  assert.strictEqual(
    await host.evaluate((el) => el.internals.states.has("test-enum-a")),
    false,
  );
  assert.strictEqual(
    await host.evaluate((el) => el.internals.states.has("test-enum-b")),
    true,
  );
});

uiTest("CustomElement should validate allowed values", async (page) => {
  await defineElement(page, "ds-test-element-valid", {
    meta: { attributes: { "test-enum": ["a", "b"] } },
  });

  await page.mount("<ds-test-element-valid></ds-test-element-valid>");
  const host = page.locator("ds-test-element-valid");

  page.expectErrors();
  await assert.rejects(
    host.evaluate((el) => {
      el["test-enum"] = "invalid";
    }),
    /unexpected value for argument/,
  );
});

uiTest("CustomElement should call handleStateChange", async (page) => {
  await defineElement(page, "ds-test-element-change", {
    meta: { attributes: { "test-attr": [] } },
    trackChanges: true,
  });

  await page.mount("<ds-test-element-change></ds-test-element-change>");
  const host = page.locator("ds-test-element-change");

  await host.evaluate((el) => {
    el["test-attr"] = "changed";
  });

  const lastChange = await host.evaluate((el) => el.lastChange);
  assert.deepStrictEqual(lastChange, {
    name: "test-attr",
    oldValue: null,
    newValue: "changed",
  });
});
