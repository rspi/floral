import assert from "node:assert";
import { uiTest } from "#test-helper";

uiTest("CustomElement should sync attribute to property", async (page) => {
  await page.evaluate(async () => {
    const { CustomElement } = await import("/utils.js");
    if (!customElements.get("ds-test-element-attr")) {
      window.customElements.define(
        "ds-test-element-attr",
        class extends CustomElement {
          static template = "<div></div>";
          static meta = { attributes: { "test-attr": [] } };
        },
      );
    }
  });

  await page.mount(
    '<ds-test-element-attr test-attr="hello"></ds-test-element-attr>',
  );
  const host = page.locator("ds-test-element-attr");
  const value = await host.evaluate((el) => el["test-attr"]);
  assert.strictEqual(value, "hello");
});

uiTest("CustomElement should sync property to state", async (page) => {
  await page.evaluate(async () => {
    const { CustomElement } = await import("/utils.js");
    if (!customElements.get("ds-test-element-state")) {
      window.customElements.define(
        "ds-test-element-state",
        class extends CustomElement {
          static template = "<div></div>";
          static meta = { attributes: { "test-attr": [] } };
        },
      );
    }
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
  await page.evaluate(async () => {
    const { CustomElement } = await import("/utils.js");
    if (!customElements.get("ds-test-element-bool")) {
      window.customElements.define(
        "ds-test-element-bool",
        class extends CustomElement {
          static template = "<div></div>";
          static meta = { attributes: { "test-bool": [""] } };
        },
      );
    }
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
  await page.evaluate(async () => {
    const { CustomElement } = await import("/utils.js");
    if (!customElements.get("ds-test-element-enum")) {
      window.customElements.define(
        "ds-test-element-enum",
        class extends CustomElement {
          static template = "<div></div>";
          static meta = { attributes: { "test-enum": ["a", "b"] } };
        },
      );
    }
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
  await page.evaluate(async () => {
    const { CustomElement } = await import("/utils.js");
    if (!customElements.get("ds-test-element-valid")) {
      window.customElements.define(
        "ds-test-element-valid",
        class extends CustomElement {
          static template = "<div></div>";
          static meta = { attributes: { "test-enum": ["a", "b"] } };
        },
      );
    }
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
  await page.evaluate(async () => {
    const { CustomElement } = await import("/utils.js");
    if (!customElements.get("ds-test-element-change")) {
      window.customElements.define(
        "ds-test-element-change",
        class extends CustomElement {
          static template = "<div></div>";
          static meta = { attributes: { "test-attr": [] } };
          handleStateChange(name, oldValue, newValue) {
            this.lastChange = { name, oldValue, newValue };
          }
        },
      );
    }
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
