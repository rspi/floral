import { uiTest } from "#test-helper";
import assert from "node:assert";

uiTest("ds-field should pass basic a11y audit", async (page) => {
  await page.mount(`
    <div style="background-color: var(--ds-color-background); padding: var(--ds-space-xl);">
      <ds-field>
        <span slot="label">Username</span>
        <ds-input></ds-input>
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
        <span slot="label">Email Address</span>
        <ds-input></ds-input>
        <span slot="helper">We'll never share your email address.</span>
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
        <span slot="label">Full Name</span>
        <ds-input></ds-input>
        <span slot="helper">Enter your legal full name</span>
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
  "ds-field should delegate click from label to focus control",
  async (page) => {
    await page.mount(`
    <div>
      <ds-field>
        <span slot="label" id="clickable-label">My Switch</span>
        <ds-switch></ds-switch>
      </ds-field>
    </div>
  `);

    const label = page.locator("#clickable-label");
    await label.waitFor({ state: "visible" });

    // Click the label
    await label.click();

    // Verify focus was delegated to the switch component
    const activeTag = await page.evaluate(() =>
      document.activeElement.tagName.toLowerCase(),
    );
    assert.strictEqual(activeTag, "ds-switch");

    const isFocused = await page
      .locator("ds-switch")
      .evaluate((el) => el.matches(":focus"));
    assert.ok(isFocused, "ds-switch should have focus state after label click");
  },
);

uiTest("ds-field should respect layout attributes", async (page) => {
  await page.mount(`
    <div>
      <ds-field id="my-field" layout="horizontal">
        <span slot="label">Toggle</span>
        <ds-switch></ds-switch>
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
