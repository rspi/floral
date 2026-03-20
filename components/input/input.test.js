import assert from "node:assert";
import { uiTest } from "../../test-helper.js";

uiTest("ds-input should render an input element", async (page) => {
  await page.mount(`<ds-input></ds-input>`);
  const input = page.locator("ds-input >> input");
  await assert.doesNotReject(input.waitFor());
});

uiTest("ds-input should sync value attribute", async (page) => {
  await page.mount(`<ds-input value="hello"></ds-input>`);
  const value = await page.evaluate(
    () =>
      document.querySelector("ds-input").shadowRoot.querySelector("input")
        .value,
  );
  assert.strictEqual(value, "hello");
});

uiTest("ds-input should update value property when typing", async (page) => {
  await page.mount(`<ds-input></ds-input>`);
  const input = page.locator("ds-input >> input");
  await input.fill("world");
  const value = await page.evaluate(
    () => document.querySelector("ds-input").value,
  );
  assert.strictEqual(value, "world");
});

uiTest("ds-input should handle disabled attribute", async (page) => {
  await page.mount(`<ds-input disabled></ds-input>`);
  const isDisabled = await page.evaluate(
    () =>
      document.querySelector("ds-input").shadowRoot.querySelector("input")
        .disabled,
  );
  assert.strictEqual(isDisabled, true);
});

uiTest(
  "ds-input should be disabled when in a disabled fieldset",
  async (page) => {
    await page.mount(`
    <fieldset disabled>
      <ds-input placeholder="Enter text..."></ds-input>
    </fieldset>
  `);

    const isDisabled = await page.evaluate(() => {
      const inputElement = document.querySelector("ds-input");
      return inputElement.shadowRoot.querySelector("input").disabled;
    });

    assert.strictEqual(isDisabled, true);
  },
);

uiTest("ds-input should integrate with forms", async (page) => {
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

uiTest("ds-input should dispatch 'input' event when typing", async (page) => {
  await page.mount(`<ds-input></ds-input>`);

  await page.evaluate(() => {
    window.inputEventDispatched = false;
    document.querySelector("ds-input").addEventListener("input", (e) => {
      window.inputEventDispatched = e.target.tagName === "DS-INPUT";
    });
  });

  const input = page.locator("ds-input >> input");
  await input.pressSequentially("h");

  const dispatched = await page.evaluate(() => window.inputEventDispatched);
  assert.strictEqual(dispatched, true);
});

uiTest(
  "ds-input should dispatch 'change' event when value changes",
  async (page) => {
    await page.mount(`<ds-input></ds-input>`);

    await page.evaluate(() => {
      window.changeEventDispatched = false;
      document.querySelector("ds-input").addEventListener("change", (e) => {
        window.changeEventDispatched = e.target.tagName === "DS-INPUT";
      });
    });

    const input = page.locator("ds-input >> input");
    await input.focus();
    await input.pressSequentially("hello");
    await input.press("Enter");

    const dispatched = await page.evaluate(() => window.changeEventDispatched);
    assert.strictEqual(dispatched, true);
  },
);

uiTest(
  "ds-input should block form submission when required and empty",
  async (page) => {
    await page.mount(`
    <form id="test-form">
      <ds-input required name="my-input"></ds-input>
      <ds-button type="submit">Submit</ds-button>
    </form>
  `);

    await page.evaluate(() => {
      window.formSubmitted = false;
      document.getElementById("test-form").addEventListener("submit", (e) => {
        e.preventDefault();
        window.formSubmitted = true;
      });
    });

    const button = page.locator("ds-button");
    await button.click();

    const submitted = await page.evaluate(() => window.formSubmitted);
    assert.strictEqual(
      submitted,
      false,
      "Form should NOT have submitted when required input is empty",
    );

    const input = page.locator("ds-input >> input");
    await input.fill("some value");
    await button.click();

    const submittedAfterFill = await page.evaluate(() => window.formSubmitted);
    assert.strictEqual(
      submittedAfterFill,
      true,
      "Form SHOULD have submitted after input is filled",
    );
  },
);

uiTest(
  "ds-input should expose validity and validationMessage",
  async (page) => {
    await page.mount(`<ds-input required></ds-input>`);

    const { isValid, hasValueMissing, validationMessage } = await page.evaluate(
      () => {
        const el = document.querySelector("ds-input");
        return {
          isValid: el.checkValidity(),
          hasValueMissing: el.validity.valueMissing,
          validationMessage: el.validationMessage,
        };
      },
    );

    assert.strictEqual(isValid, false);
    assert.strictEqual(hasValueMissing, true);
    assert.ok(validationMessage.length > 0);

    await page.evaluate(() => {
      const el = document.querySelector("ds-input");
      el.value = "filled";
    });

    const { isValidAfter, hasValueMissingAfter } = await page.evaluate(() => {
      const el = document.querySelector("ds-input");
      return {
        isValidAfter: el.checkValidity(),
        hasValueMissingAfter: el.validity.valueMissing,
      };
    });

    assert.strictEqual(isValidAfter, true);
    assert.strictEqual(hasValueMissingAfter, false);
  },
);

uiTest("ds-input should submit form when pressing Enter", async (page) => {
  await page.mount(`
    <form id="test-form">
      <ds-input name="my-input" value="form-value"></ds-input>
      <button type="submit" id="submit-btn">Submit</button>
    </form>
  `);

  await page.evaluate(() => {
    window.formSubmitted = false;
    document.getElementById("test-form").addEventListener("submit", (e) => {
      e.preventDefault();
      window.formSubmitted = true;
    });
  });

  const input = page.locator("ds-input >> input");
  await input.focus();
  await input.press("Enter");

  const submitted = await page.evaluate(() => window.formSubmitted);
  assert.strictEqual(
    submitted,
    true,
    "Form should have submitted when pressing Enter in ds-input",
  );
});

uiTest("ds-input should reset its value when form is reset", async (page) => {
  await page.mount(`
  <form id="test-form">
    <ds-input name="my-input" value="initial-value"></ds-input>
    <button type="reset" id="reset-btn">Reset</button>
  </form>
  `);

  const input = page.locator("ds-input >> input");

  // 1. Change the value
  await input.fill("changed-value");

  // Verify it changed
  let currentValue = await page.evaluate(
    () => document.querySelector("ds-input").value,
  );
  assert.strictEqual(currentValue, "changed-value");

  // 2. Reset the form
  await page.evaluate(() => {
    const form = document.getElementById("test-form");
    form.reset();
  });

  // 3. Verify it reset to initial value
  const resetValue = await page.evaluate(
    () => document.querySelector("ds-input").value,
  );
  assert.strictEqual(
    resetValue,
    "initial-value",
    "Form reset should restore initial value of ds-input",
  );
});
