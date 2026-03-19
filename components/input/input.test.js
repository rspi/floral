import assert from "node:assert";
import { uiTest } from "../../test-helper.js";

uiTest("ds-input: should render an input element", async (page) => {
  await page.mount(`<ds-input></ds-input>`);
  const input = page.locator("ds-input >> input");
  await assert.doesNotReject(input.waitFor());
});

uiTest("ds-input: should sync value attribute", async (page) => {
  await page.mount(`<ds-input value="hello"></ds-input>`);
  const value = await page.evaluate(
    () =>
      document.querySelector("ds-input").shadowRoot.querySelector("input")
        .value,
  );
  assert.strictEqual(value, "hello");
});

uiTest("ds-input: should update value property when typing", async (page) => {
  await page.mount(`<ds-input></ds-input>`);
  const input = page.locator("ds-input >> input");
  await input.fill("world");
  const value = await page.evaluate(
    () => document.querySelector("ds-input").value,
  );
  assert.strictEqual(value, "world");
});

uiTest("ds-input: should handle disabled attribute", async (page) => {
  await page.mount(`<ds-input disabled></ds-input>`);
  const isDisabled = await page.evaluate(
    () =>
      document.querySelector("ds-input").shadowRoot.querySelector("input")
        .disabled,
  );
  assert.strictEqual(isDisabled, true);
});

uiTest("ds-input: should integrate with forms", async (page) => {
  await page.mount(`
    <form id="test-form">
      <ds-input name="my-input" value="form-value"></ds-input>
    </form>
  `);
  const formDataValue = await page.evaluate(() => {
    const form = document.getElementById("test-form");
    const formData = new FormData(form);
    return formData.get("my-input");
  });
  assert.strictEqual(formDataValue, "form-value");
});
