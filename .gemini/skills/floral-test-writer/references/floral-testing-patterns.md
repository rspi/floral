# Floral Testing Patterns

This reference guide contains established patterns for writing robust tests in the Floral design system.

## Intent-Based Selection

Always prefer `getByRole`, `getByLabel`, and `getByText` over CSS selectors.

```javascript
uiTest("ds-input should be accessible as a textbox", async (page) => {
  await page.mount(`<ds-input label="Username"></ds-input>`);
  const input = page.getByRole("textbox", { name: "Username" });
  await assert.doesNotReject(input.waitFor());
});
```

## Form & Validation API

Verify that the component correctly participates in forms and handles validation.

```javascript
uiTest("ds-input should expose validity", async (page) => {
  await page.mount(`<ds-input required></ds-input>`);
  const { isValid, validationMessage } = await page.evaluate(() => {
    const el = document.querySelector("ds-input");
    return {
      isValid: el.checkValidity(),
      validationMessage: el.validationMessage,
    };
  });
  assert.strictEqual(isValid, false);
  assert.ok(validationMessage.length > 0);
});
```

## Internal Focus Delegation

Verify focus is correctly delegated to internal shadow DOM elements.

```javascript
uiTest("ds-button should delegate focus to internal button", async (page) => {
  await page.mount('<ds-button id="btn">Focus</ds-button>');
  await page.focus("ds-button");

  const activeTag = await page.evaluate(() =>
    document.activeElement.tagName.toLowerCase(),
  );
  assert.strictEqual(activeTag, "ds-button");

  const innerFocused = await page.evaluate(() => {
    return document
      .getElementById("btn")
      .shadowRoot.activeElement.tagName.toLowerCase();
  });
  assert.strictEqual(innerFocused, "button");
});
```

## Event Dispatching

Verify that custom events are correctly dispatched with the expected state.

```javascript
uiTest("ds-input should dispatch 'input' event when typing", async (page) => {
  await page.mount(`<ds-input></ds-input>`);
  await page.evaluate(() => {
    window.inputEventDispatched = false;
    document.querySelector("ds-input").addEventListener("input", (e) => {
      window.inputEventDispatched = e.target.tagName === "DS-INPUT";
    });
  });
  const input = page.getByRole("textbox");
  await input.pressSequentially("h");
  const dispatched = await page.evaluate(() => window.inputEventDispatched);
  assert.strictEqual(dispatched, true);
});
```

## CSS Pseudo-Classes and Custom States

Verify visual states and custom CSS states (like `:state(touched)`).

```javascript
uiTest(
  "ds-input should have :state(touched) after interaction",
  async (page) => {
    await page.mount(`<ds-input></ds-input>`);
    const input = page.getByRole("textbox");
    await input.focus();
    await input.blur();
    const hasTouchedState = await page.evaluate(() => {
      return document.querySelector("ds-input").matches(":state(touched)");
    });
    assert.ok(hasTouchedState);
  },
);
```

## Disabled State (Fieldset Inheritance)

Verify that the component correctly inherits the disabled state from its parent fieldset.

```javascript
uiTest(
  "ds-button should be disabled when in a disabled fieldset",
  async (page) => {
    await page.mount(`
    <fieldset disabled>
      <ds-button></ds-button>
    </fieldset>
  `);
    const isDisabled = await page.evaluate(() => {
      const el = document.querySelector("ds-button");
      return el.shadowRoot.querySelector("button").disabled;
    });
    assert.strictEqual(isDisabled, true);
  },
);
```
