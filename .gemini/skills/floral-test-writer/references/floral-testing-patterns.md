# Floral Testing Patterns

This reference guide contains established patterns for writing robust tests in the Floral design system.

## Resilient Role-Based Locators

Always prefer `getByRole`, `getByLabel`, and `getByText` with the `name` option to increase resilience.

```javascript
uiTest("ds-input should be accessible as a textbox", async (page) => {
  await page.mount(`<ds-input label="Username"></ds-input>`);
  const input = page.getByRole("textbox", { name: "Username" });
  await assert.doesNotReject(input.waitFor());
});

uiTest("ds-button should handle specific action label", async (page) => {
  await page.mount(`<ds-button>Save Changes</ds-button>`);
  const button = page.getByRole("button", { name: "Save Changes" });
  await assert.doesNotReject(button.waitFor());
});
```

## Shadow DOM & Chaining

While Playwright pierces Shadow DOM by default, chaining locators provides a clearer path for complex components.

````javascript
uiTest("ds-button should render internal button", async (page) => {
  await page.mount("<ds-button>Click Me</ds-button>");

  // Chain the host component locator with the internal role locator
  const innerButton = page
    .locator("ds-button")
    .getByRole("button", { name: "Click Me" });

  // Web-First: Wait for visibility before asserting
  await innerButton.waitFor({ state: "visible" });
  assert.ok(await innerButton.isVisible());
});

## ARIA Relationships & Accessibility

Verify correct ARIA roles and relationships, especially when linking components (e.g., `aria-describedby`, `aria-controls`).

```javascript
uiTest("ds-tooltip should link to its anchor via aria-describedby", async (page) => {
  await page.mount(`
    <ds-tooltip delay="0">
      <button id="anchor">Hover me</button>
      <div slot="content" id="content">Tooltip Content</div>
    </ds-tooltip>
  `);

  const anchor = page.locator("#anchor");
  const tooltip = page.locator("ds-tooltip >> #tooltip");

  // Show the tooltip
  await anchor.hover();
  await tooltip.waitFor({ state: "visible" });

  // Verify the relationship
  const tooltipId = await tooltip.getAttribute("id");
  const describedBy = await anchor.getAttribute("aria-describedby");
  assert.strictEqual(describedBy, tooltipId, "Anchor should be described by the tooltip");
});
````

## Testing Error States

## Testing Error States

Use `page.expectErrors()` to allow expected console errors or exceptions during a test.

```javascript
uiTest("ds-input should log error for invalid type", async (page) => {
  await page.mount(`<ds-input type="unsupported-type"></ds-input>`);

  // Disable automatic failure on browser console errors/exceptions
  page.expectErrors();

  const value = await page.evaluate(
    () => document.querySelector("ds-input").type,
  );
  assert.strictEqual(value, "text"); // Fallback behavior
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
