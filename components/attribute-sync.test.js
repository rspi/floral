import { uiTest } from "../test-helper.js";
import assert from "node:assert";

uiTest("Setting property should NOT update host attribute", async (page) => {
  await page.mount(`<ds-input value="initial"></ds-input>`);

  // 1. Initial state
  const initialAttr = await page.evaluate(() =>
    document.querySelector("ds-input").getAttribute("value"),
  );
  const initialProp = await page.evaluate(
    () => document.querySelector("ds-input").value,
  );

  assert.strictEqual(initialAttr, "initial");
  assert.strictEqual(initialProp, "initial");

  // 2. Set property
  await page.evaluate(() => {
    document.querySelector("ds-input").value = "changed-via-prop";
  });

  // 3. Verify property updated but attribute did NOT
  const finalAttr = await page.evaluate(() =>
    document.querySelector("ds-input").getAttribute("value"),
  );
  const finalProp = await page.evaluate(
    () => document.querySelector("ds-input").value,
  );

  assert.strictEqual(
    finalProp,
    "changed-via-prop",
    "Property should be updated",
  );
  assert.strictEqual(
    finalAttr,
    "initial",
    "Attribute should NOT be updated (decoupled)",
  );
});

uiTest("Setting attribute should update property", async (page) => {
  await page.mount(`<ds-input></ds-input>`);

  await page.evaluate(() => {
    document.querySelector("ds-input").setAttribute("value", "via-attr");
  });

  const propValue = await page.evaluate(
    () => document.querySelector("ds-input").value,
  );
  assert.strictEqual(
    propValue,
    "via-attr",
    "Property should update when attribute changes",
  );
});

uiTest("Boolean attribute sync test", async (page) => {
  await page.mount(`<ds-input></ds-input>`);

  // Set disabled property
  await page.evaluate(() => {
    document.querySelector("ds-input").disabled = true;
  });

  const hasAttr = await page.evaluate(() =>
    document.querySelector("ds-input").hasAttribute("disabled"),
  );
  const propValue = await page.evaluate(
    () => document.querySelector("ds-input").disabled,
  );

  assert.strictEqual(propValue, true, "Property should be true");
  assert.strictEqual(hasAttr, false, "Attribute should NOT be present");

  // Set disabled attribute
  await page.evaluate(() => {
    document.querySelector("ds-input").setAttribute("disabled", "");
  });

  const propValueAfterAttr = await page.evaluate(
    () => document.querySelector("ds-input").disabled,
  );
  assert.strictEqual(
    propValueAfterAttr,
    true,
    "Property should be true after attribute set",
  );

  // Remove disabled attribute
  await page.evaluate(() => {
    document.querySelector("ds-input").removeAttribute("disabled");
  });

  const propValueAfterRemove = await page.evaluate(
    () => document.querySelector("ds-input").disabled,
  );
  assert.strictEqual(
    propValueAfterRemove,
    false,
    "Property should be false after attribute removed",
  );
});

uiTest(
  "Setting disabled property on button should disable internal button",
  async (page) => {
    await page.mount(`<ds-button>Click me</ds-button>`);

    await page.evaluate(() => {
      document.querySelector("ds-button").disabled = true;
    });

    const isInternalDisabled = await page.evaluate(() => {
      return document
        .querySelector("ds-button")
        .shadowRoot.querySelector("button").disabled;
    });

    assert.strictEqual(
      isInternalDisabled,
      true,
      "Internal button should be disabled when host property is set",
    );
  },
);
