import assert from "node:assert";
import { uiTest } from "#test-helper";

uiTest("ds-input should be accessible as a textbox", async (page) => {
  await page.mount(`<ds-input aria-label="Username"></ds-input>`);
  const host = page.locator('ds-input[aria-label="Username"]');
  const input = host.getByRole("textbox");
  await input.waitFor({ state: "visible" });
  assert.ok(await input.isVisible());
});

uiTest("ds-input should sync value attribute", async (page) => {
  await page.mount(`<ds-input value="hello" aria-label="Input"></ds-input>`);
  const host = page.locator('ds-input[aria-label="Input"]');
  const input = host.getByRole("textbox");
  await input.waitFor({ state: "visible" });
  assert.strictEqual(await input.inputValue(), "hello");
});

uiTest("ds-input should update value property when typing", async (page) => {
  await page.mount(`<ds-input aria-label="Input"></ds-input>`);
  const host = page.locator('ds-input[aria-label="Input"]');
  const input = host.getByRole("textbox");
  await input.fill("world");
  const value = await page.evaluate(
    () => document.querySelector("ds-input").value,
  );
  assert.strictEqual(value, "world");
});

uiTest("ds-input should handle disabled attribute", async (page) => {
  await page.mount(`<ds-input disabled aria-label="Input"></ds-input>`);
  const host = page.locator('ds-input[aria-label="Input"]');
  const input = host.getByRole("textbox");
  assert.strictEqual(await input.isDisabled(), true);
});

uiTest(
  "ds-input should be disabled when in a disabled fieldset",
  async (page) => {
    await page.mount(`
    <fieldset disabled>
      <ds-input placeholder="Enter text..." aria-label="Input"></ds-input>
    </fieldset>
  `);

    const host = page.locator('ds-input[aria-label="Input"]');
    const input = host.getByRole("textbox");
    assert.strictEqual(await input.isDisabled(), true);
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
  await page.mount(`<ds-input aria-label="Input"></ds-input>`);

  await page.evaluate(() => {
    window.inputEventDispatched = false;
    document.querySelector("ds-input").addEventListener("input", (e) => {
      window.inputEventDispatched = e.target.tagName === "DS-INPUT";
    });
  });

  const host = page.locator('ds-input[aria-label="Input"]');
  const input = host.getByRole("textbox");
  await input.pressSequentially("h");

  const dispatched = await page.evaluate(() => window.inputEventDispatched);
  assert.strictEqual(dispatched, true);
});

uiTest(
  "ds-input should dispatch 'change' event when value changes",
  async (page) => {
    await page.mount(`<ds-input aria-label="Input"></ds-input>`);

    await page.evaluate(() => {
      window.changeEventDispatched = false;
      document.querySelector("ds-input").addEventListener("change", (e) => {
        window.changeEventDispatched = e.target.tagName === "DS-INPUT";
      });
    });

    const host = page.locator('ds-input[aria-label="Input"]');
    const input = host.getByRole("textbox");
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
      <ds-input required name="my-input" aria-label="Required Input"></ds-input>
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

    const button = page.getByRole("button", { name: "Submit" });
    await button.click();

    const submitted = await page.evaluate(() => window.formSubmitted);
    assert.strictEqual(
      submitted,
      false,
      "Form should NOT have submitted when required input is empty",
    );

    const host = page.locator('ds-input[aria-label="Required Input"]');
    const input = host.getByRole("textbox");
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
    await page.mount(
      `<ds-input required aria-label="Required Input"></ds-input>`,
    );

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

    const host = page.locator('ds-input[aria-label="Required Input"]');
    const input = host.getByRole("textbox");
    await input.fill("filled");

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
      <ds-input name="my-input" value="form-value" aria-label="Input"></ds-input>
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

  const host = page.locator('ds-input[aria-label="Input"]');
  const input = host.getByRole("textbox");
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
    <ds-input name="my-input" value="initial-value" aria-label="Reset Input"></ds-input>
    <button type="reset" id="reset-btn">Reset</button>
  </form>
  `);

  const host = page.locator('ds-input[aria-label="Reset Input"]');
  const input = host.getByRole("textbox");

  // 1. Change the value
  await input.fill("changed-value");

  // Verify it changed
  assert.strictEqual(await input.inputValue(), "changed-value");

  // 2. Reset the form
  await page.getByRole("button", { name: "Reset" }).click();

  // 3. Verify it reset to initial value
  assert.strictEqual(
    await input.inputValue(),
    "initial-value",
    "Form reset should restore initial value of ds-input",
  );
});

uiTest("ds-input should handle readonly attribute", async (page) => {
  await page.mount(
    `<ds-input readonly aria-label="Readonly Input"></ds-input>`,
  );
  const host = page.locator('ds-input[aria-label="Readonly Input"]');
  const input = host.getByRole("textbox");
  assert.strictEqual(await input.isEditable(), false);

  await page.evaluate(() => {
    document.querySelector("ds-input").readonly = false;
  });
  assert.strictEqual(await input.isEditable(), true);
});

uiTest("ds-input should handle name attribute", async (page) => {
  await page.mount(`<ds-input name="test-name"></ds-input>`);
  const name = await page.evaluate(
    () => document.querySelector("ds-input").name,
  );
  assert.strictEqual(name, "test-name");
});

uiTest("ds-input should handle autofocus attribute", async (page) => {
  await page.mount(
    `<ds-input autofocus aria-label="Autofocus Input"></ds-input>`,
  );

  const isFocused = await page.evaluate(async () => {
    const el = document.querySelector("ds-input");
    // Wait a frame for delegation to occur
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return el.shadowRoot.activeElement === el.shadowRoot.querySelector("input");
  });

  assert.strictEqual(
    isFocused,
    true,
    "Internal input should be focused when ds-input has autofocus attribute",
  );
});

uiTest(
  "ds-input should have invalid styles when required and empty after interaction",
  async (page) => {
    await page.mount(
      `<ds-input required aria-label="Required Input"></ds-input>`,
    );

    const host = page.locator('ds-input[aria-label="Required Input"]');
    const input = host.getByRole("textbox");

    // Trigger :user-invalid by typing and then blurring
    await input.focus();
    await input.pressSequentially("t");
    await input.press("Backspace");
    await input.blur();

    const { borderColor, hasTouchedState } = await page.evaluate(() => {
      const el = document.querySelector("ds-input");
      const input = el.shadowRoot.querySelector("input");
      return {
        borderColor: getComputedStyle(input).borderColor,
        hasTouchedState: el.matches(":state(touched)"),
      };
    });

    assert.ok(
      hasTouchedState,
      "ds-input should have :state(touched) after interaction",
    );

    // Now it should be invalid (rose color)
    assert.ok(
      borderColor.includes("rgb(203, 127, 144)") ||
        borderColor.includes("#cb7f90"),
    );
  },
);

uiTest("ds-input should be focusable via label", async (page) => {
  await page.mount(`
    <label for="my-input">Username</label>
    <ds-input id="my-input"></ds-input>
  `);

  // Click the label directly to trigger browser's focus delegation
  await page.locator("label", { hasText: "Username" }).click();

  const isFocused = await page.evaluate(() => {
    const el = document.querySelector("ds-input");
    return (
      document.activeElement === el &&
      el.shadowRoot.activeElement === el.shadowRoot.querySelector("input")
    );
  });

  assert.strictEqual(
    isFocused,
    true,
    "ds-input should be focused when its label is clicked",
  );
});

uiTest("ds-input should delegate focus to internal input", async (page) => {
  await page.mount(`<ds-input aria-label="Input"></ds-input>`);

  // Click the host element directly
  await page.locator("ds-input").click();

  const isFocused = await page.evaluate(() => {
    const el = document.querySelector("ds-input");
    return el.shadowRoot.activeElement === el.shadowRoot.querySelector("input");
  });

  assert.strictEqual(
    isFocused,
    true,
    "Internal input should be focused when host element is clicked",
  );
});

uiTest("ds-input should reflect placeholder attribute", async (page) => {
  await page.mount(
    `<ds-input placeholder="Enter your name" aria-label="Input"></ds-input>`,
  );
  const host = page.locator('ds-input[aria-label="Input"]');
  // Target the internal input directly via shadow DOM
  const internalInput = host.locator("input");
  assert.strictEqual(
    await internalInput.getAttribute("placeholder"),
    "Enter your name",
  );
});

uiTest("ds-input should handle different input types", async (page) => {
  await page.mount(`
    <ds-input type="email" value="test@example.com" aria-label="Email"></ds-input>
    <ds-input type="password" value="secret" aria-label="Password"></ds-input>
  `);

  const emailHost = page.locator('ds-input[type="email"]');
  const emailInput = emailHost.getByRole("textbox");
  assert.strictEqual(await emailHost.evaluate((el) => el.type), "email");
  assert.strictEqual(await emailInput.inputValue(), "test@example.com");

  const passwordHost = page.locator('ds-input[type="password"]');
  assert.strictEqual(await passwordHost.evaluate((el) => el.type), "password");
  assert.strictEqual(await passwordHost.evaluate((el) => el.value), "secret");
});

uiTest("ds-input should handle disabled property", async (page) => {
  await page.mount(`<ds-input aria-label="Input"></ds-input>`);
  const host = page.locator('ds-input[aria-label="Input"]');
  const input = host.getByRole("textbox");

  await host.evaluate((el) => {
    el.disabled = true;
  });

  assert.strictEqual(await input.isDisabled(), true);
});

uiTest(
  "ds-input should handle boolean properties and coercion",
  async (page) => {
    await page.mount(`<ds-input aria-label="Input"></ds-input>`);
    const host = page.locator('ds-input[aria-label="Input"]');
    const input = host.locator("input");

    await host.evaluate((el) => {
      el.required = "truthy string";
      el.readonly = 1;
      el.autofocus = true;
    });

    // Verify host properties are coerced to booleans
    assert.strictEqual(await host.evaluate((el) => el.required), true);
    assert.strictEqual(await host.evaluate((el) => el.readonly), true);
    assert.strictEqual(await host.evaluate((el) => el.autofocus), true);

    // Verify internal input properties
    assert.strictEqual(await input.evaluate((el) => el.required), true);
    assert.strictEqual(await input.evaluate((el) => el.readOnly), true);
    assert.strictEqual(await input.evaluate((el) => el.autofocus), true);

    await host.evaluate((el) => {
      el.required = "";
      el.readonly = 0;
      el.autofocus = false;
    });

    // Verify host properties are coerced to booleans (empty string is falsy for properties)
    assert.strictEqual(await host.evaluate((el) => el.required), false);
    assert.strictEqual(await host.evaluate((el) => el.readonly), false);
    assert.strictEqual(await host.evaluate((el) => el.autofocus), false);

    // Verify internal input properties
    assert.strictEqual(await input.evaluate((el) => el.required), false);
    assert.strictEqual(await input.evaluate((el) => el.readOnly), false);
    assert.strictEqual(await input.evaluate((el) => el.autofocus), false);
  },
);

uiTest("ds-input should pass accessibility audit", async (page) => {
  await page.mount(`
    <label for="accessible-input">Accessible Input</label>
    <ds-input id="accessible-input" placeholder="Accessible Input"></ds-input>
  `);
  await page.checkA11y();
});
