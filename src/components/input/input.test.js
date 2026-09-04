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
    return el.matches(":focus");
  });

  assert.strictEqual(
    isFocused,
    true,
    "ds-input should be focused when it has autofocus attribute",
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

    const hasTouchedState = await host.evaluate((el) =>
      el.matches(":state(touched)"),
    );

    assert.ok(
      hasTouchedState,
      "ds-input should have :state(touched) after interaction",
    );

    // Verify it is invalid via ARIA or validity state
    const isInvalid = await host.evaluate((el) => !el.checkValidity());
    assert.ok(isInvalid, "ds-input should be invalid after interaction");
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
    return document.activeElement === el && el.matches(":focus");
  });

  assert.strictEqual(
    isFocused,
    true,
    "ds-input should be focused when its label is clicked",
  );
});

uiTest("ds-input should delegate focus", async (page) => {
  await page.mount(`<ds-input aria-label="Input"></ds-input>`);

  // Click the host element directly
  await page.locator("ds-input").click();

  const isFocused = await page.evaluate(() => {
    const el = document.querySelector("ds-input");
    return el.matches(":focus");
  });

  assert.strictEqual(
    isFocused,
    true,
    "ds-input should be focused when host element is clicked",
  );
});

uiTest("ds-input should reflect placeholder attribute", async (page) => {
  await page.mount(
    `<ds-input placeholder="Enter your name" aria-label="Input"></ds-input>`,
  );
  const host = page.locator('ds-input[aria-label="Input"]');
  const input = host.getByRole("textbox");
  assert.strictEqual(
    await input.getAttribute("placeholder"),
    "Enter your name",
  );
});

uiTest("ds-input should pass accessibility audit", async (page) => {
  await page.mount(`
    <label for="accessible-input">Accessible Input</label>
    <ds-input id="accessible-input" placeholder="Accessible Input"></ds-input>
  `);
  await page.checkA11y();
});

uiTest(
  "ds-input should synchronize the 'aria-invalid' attribute on validation changes",
  async (page) => {
    await page.mount(`<ds-input required aria-label="Input"></ds-input>`);
    const input = page.getByRole("textbox");

    // Initially required and empty -> should be invalid -> aria-invalid="true"
    assert.strictEqual(await input.getAttribute("aria-invalid"), "true");

    // Fill the input -> should be valid -> aria-invalid should be removed
    await input.fill("valid value");
    assert.strictEqual(await input.getAttribute("aria-invalid"), null);

    // Empty it again -> should be invalid -> aria-invalid="true"
    await input.fill("");
    assert.strictEqual(await input.getAttribute("aria-invalid"), "true");
  },
);

uiTest(
  "ds-input should expose exactly one textbox node in the Accessibility Tree (AXTree) to prevent double-announcement",
  async (page) => {
    await page.mount(`
      <label for="double-input">Billing Address</label>
      <ds-input id="double-input"></ds-input>
    `);
    const host = page.locator("#double-input");
    await host.focus();

    // Query browser's AXTree
    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");

    // Filter for all nodes that expose a "textbox" role
    const textboxNodes = nodes.filter(
      (n) => n.role?.value === "textbox" && !n.ignored,
    );

    assert.strictEqual(
      textboxNodes.length,
      1,
      `Expected exactly 1 textbox node in the AXTree, but found ${textboxNodes.length}. Multiple textbox nodes cause screen reader double-announcements.`,
    );

    assert.strictEqual(
      textboxNodes[0].name?.value,
      "Billing Address",
      "Expected the single textbox node to be named 'Billing Address'",
    );
  },
);

uiTest(
  "ds-input should expose exactly one node with the computed accessible name in the Accessibility Tree (AXTree) to prevent the label from being read twice",
  async (page) => {
    await page.mount(`
      <label for="unique-label-input">Billing Address</label>
      <ds-input id="unique-label-input"></ds-input>
    `);
    const host = page.locator("#unique-label-input");
    await host.focus();

    // Query browser's AXTree
    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");

    // Filter for non-ignored, focusable or interactive control nodes in the tree that carry the name "Billing Address"
    const interactiveNamedNodes = nodes.filter((n) => {
      if (n.ignored || n.name?.value !== "Billing Address") return false;

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
      `Expected exactly 1 focusable/control node with the computed name "Billing Address" in the AXTree, but found ${interactiveNamedNodes.length}. Multiple focusable named nodes cause screen readers to announce the label twice.`,
    );
  },
);

uiTest(
  "ds-input should dynamically synchronize associated Light-DOM labels to the inner input's computed name in the browser's Accessibility Tree (AXTree)",
  async (page) => {
    await page.mount(`
      <label id="lbl1" for="labeled-input">First Label</label>
      <ds-input id="labeled-input"></ds-input>
      <label id="lbl2" for="labeled-input">Second Label</label>
    `);
    const host = page.locator("#labeled-input");

    // Ensure focus triggers label syncing
    await host.focus();

    // Verify both labels are concatenated and computed as the accessible name via browser's raw AXTree
    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");
    const textboxNode = nodes.find((n) => n.role?.value === "textbox");

    assert.ok(textboxNode, "Textbox node not found in browser AXTree");
    assert.strictEqual(
      textboxNode.name?.value,
      "First Label Second Label",
      "Browser computed an incorrect accessible name in the AXTree",
    );
  },
);

uiTest(
  "ds-input should have the correct computed name in the browser's raw Accessibility Tree (AXTree)",
  async (page) => {
    await page.mount(`
      <label for="cax-input">Billing Address</label>
      <ds-input id="cax-input"></ds-input>
    `);
    const host = page.locator("#cax-input");

    // Focus to trigger label synchronization
    await host.focus();

    // Create a CDP Session
    const client = await page.context().newCDPSession(page);

    // Request the raw accessibility tree
    const { nodes } = await client.send("Accessibility.getFullAXTree");

    // Find the node that corresponds to the input element (role: "textbox")
    const textboxNode = nodes.find((n) => n.role?.value === "textbox");

    assert.ok(textboxNode, "Textbox node not found in browser AXTree");
    assert.strictEqual(
      textboxNode.name?.value,
      "Billing Address",
      "Browser computed an incorrect accessible name in the AXTree",
    );
  },
);
