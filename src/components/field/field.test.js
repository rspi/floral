import { uiTest } from "#test-helper";
import assert from "node:assert";

uiTest("ds-field should pass basic a11y audit", async (page) => {
  await page.mount(`
    <div style="background-color: var(--ds-color-background); padding: var(--ds-space-xl);">
      <ds-field>
        <label slot="label" for="username-input">Username</label>
        <ds-input id="username-input" placeholder="Username"></ds-input>
        <span slot="helper">Enter your custom username.</span>
      </ds-field>
    </div>
  `);
  await page.checkA11y();
});

uiTest(
  "ds-field should establish correct name and description in AXTree across shadow boundaries",
  async (page) => {
    await page.mount(`
    <div>
      <ds-field>
        <label slot="label" for="email-input">Email Address</label>
        <ds-input id="email-input" aria-describedby="email-helper"></ds-input>
        <span slot="helper" id="email-helper">We'll never share your email address.</span>
      </ds-field>
    </div>
  `);

    const host = page.locator("ds-field");
    await host.waitFor({ state: "visible" });

    // Focus the host/control to trigger complete accessibility tree updates
    await page.locator("ds-input").focus();

    // Open a CDP session to query Chrome's Accessibility Tree (AXTree)
    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");

    // Locate the inner input textbox node
    const textboxNode = nodes.find(
      (n) => n.role?.value === "textbox" && !n.ignored,
    );

    assert.ok(textboxNode, "Textbox element not found in AXTree");
    assert.strictEqual(
      textboxNode.name?.value,
      "Email Address",
      "Textbox should have calculated label 'Email Address'",
    );
    assert.strictEqual(
      textboxNode.description?.value,
      "We'll never share your email address.",
      "Textbox should have calculated description 'We'll never share your email address.'",
    );
  },
);

uiTest(
  "ds-field should maintain correct reading order (Label -> Control -> Helper) in AXTree",
  async (page) => {
    await page.mount(`
    <div>
      <ds-field>
        <label slot="label" for="fullname-input">Full Name</label>
        <ds-input id="fullname-input" aria-describedby="fullname-helper"></ds-input>
        <span slot="helper" id="fullname-helper">Enter your legal full name</span>
      </ds-field>
    </div>
  `);

    const host = page.locator("ds-field");
    await host.waitFor({ state: "visible" });

    // Focus the host/control to trigger complete accessibility tree updates
    await page.locator("ds-input").focus();

    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");

    // Reconstruct pre-order traversal of the accessibility tree
    const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));
    const root = nodes.find((n) => !n.parentId);
    const ordered = [];
    function traverse(node) {
      ordered.push(node);
      for (const childId of node.childIds || []) {
        const child = nodeMap.get(childId);
        if (child) traverse(child);
      }
    }
    if (root) traverse(root);

    // Find indices in tree traversal of AXTree
    const labelIndex = ordered.findIndex(
      (n) => n.name?.value === "Full Name" && !n.ignored,
    );
    const controlIndex = ordered.findIndex(
      (n) => n.role?.value === "textbox" && !n.ignored,
    );
    const helperIndex = ordered.findIndex(
      (n) => n.name?.value === "Enter your legal full name" && !n.ignored,
    );

    assert.ok(labelIndex !== -1, "Label not found in AXTree");
    assert.ok(controlIndex !== -1, "Control not found in AXTree");
    assert.ok(helperIndex !== -1, "Helper text not found in AXTree");

    // Assert correct reading/navigating order
    assert.ok(
      labelIndex < controlIndex,
      "Label should precede Control in AXTree reading order",
    );
    assert.ok(
      controlIndex < helperIndex,
      "Control should precede Helper text in AXTree reading order",
    );
  },
);

uiTest(
  "ds-field should delegate click from label to focus control and toggle checkable controls",
  async (page) => {
    await page.mount(`
    <div>
      <ds-field>
        <label slot="label" for="my-switch" id="clickable-label">My Switch</label>
        <ds-switch id="my-switch"></ds-switch>
      </ds-field>
    </div>
  `);

    const label = page.locator("#clickable-label");
    await label.waitFor({ state: "visible" });

    const sw = page.locator("ds-switch");
    assert.strictEqual(await sw.evaluate((el) => el.checked), false);

    // Click the label once
    await label.click();

    // Verify focus was delegated to the switch component
    const activeTag = await page.evaluate(() =>
      document.activeElement.tagName.toLowerCase(),
    );
    assert.strictEqual(activeTag, "ds-switch");

    const isFocused = await sw.evaluate((el) => el.matches(":focus"));
    assert.ok(isFocused, "ds-switch should have focus state after label click");

    // Verify switch was toggled on
    assert.strictEqual(
      await sw.evaluate((el) => el.checked),
      true,
      "ds-switch should be checked after first label click",
    );

    // Click the label again
    await label.click();

    // Verify switch was toggled off
    assert.strictEqual(
      await sw.evaluate((el) => el.checked),
      false,
      "ds-switch should be unchecked after second label click",
    );
  },
);

uiTest("ds-field should respect layout attributes", async (page) => {
  await page.mount(`
    <div>
      <ds-field id="my-field" layout="horizontal">
        <label slot="label" for="toggle-switch">Toggle</label>
        <ds-switch id="toggle-switch"></ds-switch>
      </ds-field>
    </div>
  `);

  const host = page.locator("ds-field");
  await host.waitFor({ state: "visible" });

  const hasHorizontalState = await page.evaluate(() => {
    return document
      .getElementById("my-field")
      .matches(":state(layout-horizontal)");
  });
  assert.ok(
    hasHorizontalState,
    "ds-field should have layout-horizontal custom state",
  );
});

uiTest(
  "ds-field should work with native checkable inputs and labels",
  async (page) => {
    await page.mount(`
    <div>
      <ds-field>
        <label slot="label" for="native-check" id="checkbox-label">Accept terms</label>
        <input type="checkbox" id="native-check" />
      </ds-field>
    </div>
  `);

    const label = page.locator("#checkbox-label");
    await label.waitFor({ state: "visible" });

    assert.strictEqual(
      await page.locator("#native-check").isChecked(),
      false,
      "Checkbox should initially be unchecked",
    );

    await label.click();
    assert.strictEqual(
      await page.locator("#native-check").isChecked(),
      true,
      "Checkbox should be checked after label click",
    );
  },
);

uiTest(
  "ds-field should support subgrid alignment across multiple horizontal fields",
  async (page) => {
    await page.mount(`
    <style>
      .subgrid-form {
        display: grid;
        grid-template-columns: max-content 1fr;
        width: 500px;
      }
      .subgrid-form ds-field {
        display: contents;
        --ds-field-columns: subgrid;
      }
    </style>
    <div class="subgrid-form">
      <ds-field layout="horizontal">
        <label slot="label" for="short-label-input">Short</label>
        <ds-input id="short-label-input"></ds-input>
      </ds-field>
      <ds-field layout="horizontal">
        <label slot="label" for="long-label-input">Very Long Organization Name Label</label>
        <ds-input id="long-label-input"></ds-input>
      </ds-field>
    </div>
  `);

    const input1 = page.locator("#short-label-input");
    const input2 = page.locator("#long-label-input");

    await input1.waitFor({ state: "visible" });
    await input2.waitFor({ state: "visible" });

    const box1 = await input1.boundingBox();
    const box2 = await input2.boundingBox();

    assert.ok(box1 && box2, "Both bounding boxes should be available");
    assert.strictEqual(
      Math.round(box1.x),
      Math.round(box2.x),
      "Controls across horizontal subgrid fields should align to the exact same X coordinate",
    );
  },
);

uiTest(
  "ds-field should pass accessibility audit with slotted error message",
  async (page) => {
    await page.mount(`
    <div style="background-color: var(--ds-color-background); padding: var(--ds-space-xl);">
      <ds-field id="error-field">
        <label slot="label" for="username-error-input">Username</label>
        <ds-input id="username-error-input" aria-label="Username" aria-errormessage="user-err" aria-describedby="user-err" aria-invalid="true"></ds-input>
        <span slot="error" id="user-err">Username is already taken.</span>
        <span slot="helper">Enter your custom username.</span>
      </ds-field>
    </div>
  `);
    await page.checkA11y();
  },
);

uiTest(
  "ds-field should reflect has-error custom state and display error when slot='error' is provided",
  async (page) => {
    await page.mount(`
      <div>
        <ds-field id="test-field">
          <label slot="label" for="test-input">Email</label>
          <ds-input id="test-input"></ds-input>
          <span slot="error">Invalid email address</span>
        </ds-field>
      </div>
    `);

    const field = page.locator("#test-field");
    await field.waitFor({ state: "visible" });

    const hasError = await page.evaluate(() => {
      return document.getElementById("test-field").matches(":state(has-error)");
    });
    assert.strictEqual(
      hasError,
      true,
      "ds-field should have :state(has-error) when error is slotted",
    );

    const errorText = page.getByText("Invalid email address");
    await errorText.waitFor({ state: "visible" });
    assert.ok(
      await errorText.isVisible(),
      "Slotted error message should be visible",
    );
  },
);

uiTest(
  "ds-field should dynamically update has-error state when error slot is added or removed",
  async (page) => {
    await page.mount(`
      <div>
        <ds-field id="dynamic-field">
          <label slot="label" for="dynamic-input">Username</label>
          <ds-input id="dynamic-input"></ds-input>
          <span slot="helper" id="dynamic-help">Enter a username</span>
        </ds-field>
      </div>
    `);

    const field = page.locator("#dynamic-field");
    await field.waitFor({ state: "visible" });

    // Initially no error
    const initiallyHasError = await page.evaluate(() => {
      return document
        .getElementById("dynamic-field")
        .matches(":state(has-error)");
    });
    assert.strictEqual(
      initiallyHasError,
      false,
      "ds-field should NOT have :state(has-error) initially",
    );

    // Add error dynamically
    await page.evaluate(() => {
      const err = document.createElement("span");
      err.slot = "error";
      err.id = "dynamic-err";
      err.textContent = "Username is taken";
      document.getElementById("dynamic-field").appendChild(err);
    });

    const errorLocator = page.locator("#dynamic-err");
    await errorLocator.waitFor({ state: "visible" });

    const hasErrorAfterAdd = await page.evaluate(() => {
      return document
        .getElementById("dynamic-field")
        .matches(":state(has-error)");
    });
    assert.strictEqual(
      hasErrorAfterAdd,
      true,
      "ds-field should have :state(has-error) after adding error slot",
    );

    // Remove error dynamically
    await page.evaluate(() => {
      document.getElementById("dynamic-err").remove();
    });

    await errorLocator.waitFor({ state: "detached" });

    const hasErrorAfterRemove = await page.evaluate(() => {
      return document
        .getElementById("dynamic-field")
        .matches(":state(has-error)");
    });
    assert.strictEqual(
      hasErrorAfterRemove,
      false,
      "ds-field should remove :state(has-error) when error slot is removed",
    );
  },
);

uiTest(
  "ds-field should maintain correct reading order (Label -> Control -> Error -> Helper) in AXTree",
  async (page) => {
    await page.mount(`
      <div>
        <ds-field>
          <label slot="label" for="ordered-input">Account Name</label>
          <ds-input id="ordered-input" aria-describedby="ordered-helper"></ds-input>
          <span slot="error" id="ordered-error">Name already in use</span>
          <span slot="helper" id="ordered-helper">Must be unique across the organization</span>
        </ds-field>
      </div>
    `);

    const host = page.locator("ds-field");
    await host.waitFor({ state: "visible" });

    await page.locator("ds-input").focus();

    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");

    const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));
    const root = nodes.find((n) => !n.parentId);
    const ordered = [];
    function traverse(node) {
      ordered.push(node);
      for (const childId of node.childIds || []) {
        const child = nodeMap.get(childId);
        if (child) traverse(child);
      }
    }
    if (root) traverse(root);

    const labelIndex = ordered.findIndex(
      (n) => n.name?.value === "Account Name" && !n.ignored,
    );
    const controlIndex = ordered.findIndex(
      (n) => n.role?.value === "textbox" && !n.ignored,
    );
    const errorIndex = ordered.findIndex(
      (n) => n.name?.value === "Name already in use" && !n.ignored,
    );
    const helperIndex = ordered.findIndex(
      (n) =>
        n.name?.value === "Must be unique across the organization" &&
        !n.ignored,
    );

    assert.ok(labelIndex !== -1, "Label not found in AXTree");
    assert.ok(controlIndex !== -1, "Control not found in AXTree");
    assert.ok(errorIndex !== -1, "Error not found in AXTree");
    assert.ok(helperIndex !== -1, "Helper text not found in AXTree");

    assert.ok(
      labelIndex < controlIndex,
      "Label should precede Control in AXTree reading order",
    );
    assert.ok(
      controlIndex < errorIndex,
      "Control should precede Error in AXTree reading order",
    );
    assert.ok(
      errorIndex < helperIndex,
      "Error should precede Helper in AXTree reading order",
    );
  },
);

uiTest(
  "ds-field should collapse error row when slot='error' is omitted",
  async (page) => {
    await page.mount(`
      <div>
        <ds-field id="gap-field">
          <label slot="label" for="gap-input">Label</label>
          <ds-input id="gap-input"></ds-input>
          <span slot="helper" id="gap-helper">Helper text</span>
        </ds-field>
      </div>
    `);

    const input = page.locator("#gap-input");
    const helper = page.locator("#gap-helper");

    await input.waitFor({ state: "visible" });
    await helper.waitFor({ state: "visible" });

    const inputBox1 = await input.boundingBox();
    const helperBox1 = await helper.boundingBox();
    const baselineDistance = helperBox1.y - (inputBox1.y + inputBox1.height);

    // Dynamically add error
    await page.evaluate(() => {
      const err = document.createElement("span");
      err.slot = "error";
      err.id = "temp-err";
      err.textContent = "Error message";
      document.getElementById("gap-field").appendChild(err);
    });

    await page.locator("#temp-err").waitFor({ state: "visible" });

    const inputBox2 = await input.boundingBox();
    const helperBox2 = await helper.boundingBox();
    const withErrorDistance = helperBox2.y - (inputBox2.y + inputBox2.height);

    assert.ok(
      withErrorDistance > baselineDistance,
      "Distance between control and helper should increase when error is present",
    );

    // Dynamically remove error
    await page.evaluate(() => {
      document.getElementById("temp-err").remove();
    });

    await page.locator("#temp-err").waitFor({ state: "detached" });

    const inputBox3 = await input.boundingBox();
    const helperBox3 = await helper.boundingBox();
    const restoredDistance = helperBox3.y - (inputBox3.y + inputBox3.height);

    assert.strictEqual(
      Math.round(restoredDistance),
      Math.round(baselineDistance),
      "Distance between control and helper should return to baseline when error is removed",
    );
  },
);

uiTest(
  "ds-field should support horizontal layout with slotted error positioned under the controller",
  async (page) => {
    await page.mount(`
      <div>
        <ds-field id="horiz-error-field" layout="horizontal">
          <label slot="label" for="horiz-switch">Notifications</label>
          <ds-switch id="horiz-switch"></ds-switch>
          <span slot="error" id="horiz-err">Failed to update notification preference</span>
          <span slot="helper" id="horiz-help">Receive email notifications</span>
        </ds-field>
      </div>
    `);

    const field = page.locator("#horiz-error-field");
    await field.waitFor({ state: "visible" });

    const hasHorizontalState = await page.evaluate(() => {
      return document
        .getElementById("horiz-error-field")
        .matches(":state(layout-horizontal)");
    });
    const hasErrorState = await page.evaluate(() => {
      return document
        .getElementById("horiz-error-field")
        .matches(":state(has-error)");
    });

    assert.ok(hasHorizontalState, "Should match :state(layout-horizontal)");
    assert.ok(hasErrorState, "Should match :state(has-error)");

    const errorMsg = page.locator("#horiz-err");
    const sw = page.locator("#horiz-switch");
    const label = page.locator("label");

    await errorMsg.waitFor({ state: "visible" });
    await sw.waitFor({ state: "visible" });
    await label.waitFor({ state: "visible" });

    const swBox = await sw.boundingBox();
    const errorBox = await errorMsg.boundingBox();
    const labelBox = await label.boundingBox();

    assert.ok(
      swBox && errorBox && labelBox,
      "Bounding boxes should be defined",
    );

    // Verify error is vertically below the control
    assert.ok(
      errorBox.y >= swBox.y + swBox.height,
      `Error (y: ${errorBox.y}) should be below control (bottom: ${swBox.y + swBox.height})`,
    );

    // Verify error is in the control column (aligned to the right of label)
    assert.ok(
      errorBox.x > labelBox.x,
      `Error (x: ${errorBox.x}) should be to the right of label (x: ${labelBox.x})`,
    );
    assert.strictEqual(
      Math.round(errorBox.x),
      Math.round(swBox.x),
      "Error should align with the control column start",
    );
  },
);

uiTest(
  "ds-field should automatically display and clear validation error on submit, typing, and blur",
  async (page) => {
    await page.mount(`
      <form id="test-form">
        <ds-field id="f-auto">
          <label slot="label" for="auto-input">Username</label>
          <ds-input id="auto-input" required></ds-input>
        </ds-field>
        <button type="submit" id="auto-sub">Submit</button>
      </form>
    `);

    const field = page.locator("#f-auto");
    const autoError = page.locator("#f-auto .auto-error");
    const input = page.locator("#auto-input").getByRole("textbox");
    const submitBtn = page.locator("#auto-sub");

    // Pristine initially
    let hasError = await page.evaluate(() =>
      document.getElementById("f-auto").matches(":state(has-error)"),
    );
    assert.strictEqual(hasError, false, "Should not have has-error initially");

    // Submit form -> triggers invalid event, captures it, prevents native popup
    await submitBtn.click();
    hasError = await page.evaluate(() =>
      document.getElementById("f-auto").matches(":state(has-error)"),
    );
    assert.strictEqual(
      hasError,
      true,
      "Should have has-error after submit attempt",
    );
    assert.ok(await autoError.isVisible(), "Auto error should be visible");
    const msg = await autoError.textContent();
    assert.ok(msg.length > 0, "Validation message should not be empty");

    // Typing valid text resolves the error
    await input.fill("john_doe");
    hasError = await page.evaluate(() =>
      document.getElementById("f-auto").matches(":state(has-error)"),
    );
    assert.strictEqual(hasError, false, "Should remove has-error once valid");
    assert.strictEqual(
      await autoError.isVisible(),
      false,
      "Auto error should be hidden once valid",
    );

    // Clearing input and blurring re-triggers error
    await input.fill("");
    await submitBtn.focus();
    hasError = await page.evaluate(() =>
      document.getElementById("f-auto").matches(":state(has-error)"),
    );
    assert.strictEqual(
      hasError,
      true,
      "Should have has-error after blur on empty required field",
    );
    assert.ok(
      await autoError.isVisible(),
      "Auto error should be visible again",
    );

    // Form reset clears error
    await page.evaluate(() => document.getElementById("test-form").reset());
    hasError = await page.evaluate(() =>
      document.getElementById("f-auto").matches(":state(has-error)"),
    );
    assert.strictEqual(hasError, false, "Should clear has-error on form reset");
  },
);

uiTest(
  "ds-field should prioritize consumer slotted error over automatic validation error",
  async (page) => {
    await page.mount(`
      <form id="override-form">
        <ds-field id="f-override">
          <label slot="label" for="override-input">Email</label>
          <ds-input id="override-input" required></ds-input>
          <span slot="error" id="custom-override-err">Custom Server Error</span>
        </ds-field>
        <button type="submit" id="override-sub">Submit</button>
      </form>
    `);

    const customErr = page.locator("#custom-override-err");
    const autoErr = page.locator("#f-override .auto-error");
    const submitBtn = page.locator("#override-sub");

    assert.ok(
      await customErr.isVisible(),
      "Custom slotted error should be visible",
    );
    assert.strictEqual(
      await autoErr.isVisible(),
      false,
      "Auto error should not be visible when custom error is slotted",
    );

    // Submit form (triggers invalid on control)
    await submitBtn.click();

    // Custom error should remain visible, auto error must not override
    assert.ok(
      await customErr.isVisible(),
      "Custom slotted error should remain visible after invalid event",
    );
    assert.strictEqual(
      await autoErr.isVisible(),
      false,
      "Auto error must not override slotted error",
    );
    assert.strictEqual(await customErr.textContent(), "Custom Server Error");
  },
);

uiTest(
  "ds-field should support automatic validation with native form controls",
  async (page) => {
    await page.mount(`
      <form id="native-form">
        <ds-field id="f-native">
          <label slot="label" for="native-field-input">Password</label>
          <input id="native-field-input" type="password" required />
        </ds-field>
        <button type="submit" id="native-sub">Submit</button>
      </form>
    `);

    const autoError = page.locator("#f-native .auto-error");
    const submitBtn = page.locator("#native-sub");
    const input = page.locator("#native-field-input");

    await submitBtn.click();
    assert.ok(
      await autoError.isVisible(),
      "Auto error should show for native input on submit",
    );

    await input.fill("secret123");
    assert.strictEqual(
      await autoError.isVisible(),
      false,
      "Auto error should clear when typing valid text into native input",
    );
  },
);

uiTest(
  "ds-field should update all invalid fields on submit even when one field is focused",
  async (page) => {
    await page.mount(`
      <form id="multi-form">
        <ds-field id="f-multi-1">
          <label slot="label" for="in-multi-1">First Name</label>
          <ds-input id="in-multi-1" required autofocus></ds-input>
        </ds-field>
        <ds-field id="f-multi-2">
          <label slot="label" for="in-multi-2">Last Name</label>
          <ds-input id="in-multi-2" required></ds-input>
        </ds-field>
        <ds-button type="submit" id="multi-sub">Register</ds-button>
      </form>
    `);

    const submitBtn = page.locator("#multi-sub");
    await submitBtn.click();

    const f1HasError = await page.evaluate(() =>
      document.getElementById("f-multi-1").matches(":state(has-error)"),
    );
    const f2HasError = await page.evaluate(() =>
      document.getElementById("f-multi-2").matches(":state(has-error)"),
    );

    assert.strictEqual(
      f1HasError,
      true,
      "First field should show error on first submit attempt",
    );
    assert.strictEqual(
      f2HasError,
      true,
      "Second field should also show error on first submit attempt",
    );
  },
);

uiTest(
  "ds-field should focus the first invalid field on form submission",
  async (page) => {
    await page.mount(`
      <form id="focus-form">
        <ds-field id="f-foc-1">
          <label slot="label" for="in-foc-1">First</label>
          <ds-input id="in-foc-1" required></ds-input>
        </ds-field>
        <ds-field id="f-foc-2">
          <label slot="label" for="in-foc-2">Second</label>
          <ds-input id="in-foc-2" required></ds-input>
        </ds-field>
        <ds-button type="submit" id="foc-sub">Submit</ds-button>
      </form>
    `);

    // Focus the second input first
    await page.locator("#in-foc-2").focus();

    // Submit form
    await page.locator("#foc-sub").click();

    // Focus must move to the FIRST invalid field (in-foc-1)
    const activeId = await page.evaluate(() => document.activeElement?.id);
    assert.strictEqual(
      activeId,
      "in-foc-1",
      "Focus should move to the first invalid control on submission failure",
    );
  },
);

uiTest(
  "ds-field should clear custom error when input.setCustomValidity('') is called programmatically",
  async (page) => {
    await page.mount(`
      <ds-field id="f-prog">
        <label slot="label" for="in-prog">Username</label>
        <ds-input id="in-prog"></ds-input>
      </ds-field>
    `);

    const autoError = page.locator("#f-prog .auto-error");

    // Invalidate via setCustomValidity and reportValidity
    await page.evaluate(() => {
      const input = document.getElementById("in-prog");
      input.setCustomValidity("Username already taken");
      input.reportValidity();
    });

    let hasError = await page.evaluate(() =>
      document.getElementById("f-prog").matches(":state(has-error)"),
    );
    assert.strictEqual(
      hasError,
      true,
      "Field should display error after reportValidity",
    );
    assert.ok(await autoError.isVisible(), "Auto error should be visible");
    assert.strictEqual(await autoError.textContent(), "Username already taken");

    // Clear programmatically without user typing
    await page.evaluate(() => {
      document.getElementById("in-prog").setCustomValidity("");
    });

    hasError = await page.evaluate(() =>
      document.getElementById("f-prog").matches(":state(has-error)"),
    );
    assert.strictEqual(
      hasError,
      false,
      "Field should clear error immediately after setCustomValidity('')",
    );
    assert.strictEqual(
      await autoError.isVisible(),
      false,
      "Auto error element should be hidden",
    );
  },
);
