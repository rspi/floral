import { uiTest } from "#test-helper";
import assert from "node:assert";

uiTest("ds-label should pass accessibility audit", async (page) => {
  await page.mount(`
    <ds-label for="my-input">Custom Label</ds-label>
    <ds-input id="my-input"></ds-input>
  `);

  await page.checkA11y();
});

uiTest("ds-label should delegate focus to target on click", async (page) => {
  await page.mount(`
    <ds-label id="lbl" for="my-input">Custom Label</ds-label>
    <ds-input id="my-input"></ds-input>
  `);

  const label = page.locator("#lbl");
  await label.click();

  // Verify the input has focus
  const isFocused = await page
    .locator("ds-input")
    .evaluate((el) => el.matches(":focus"));
  assert.ok(isFocused, "ds-input should match :focus after clicking the label");
});

uiTest(
  "ds-label should associate with ds-input and expose correct accessible name in AXTree via AOM",
  async (page) => {
    await page.mount(`
      <ds-label id="lbl" for="my-input">First Name</ds-label>
      <ds-input id="my-input"></ds-input>
    `);

    const input = page.locator("#my-input");
    await input.focus();

    // Create a CDP Session
    const client = await page.context().newCDPSession(page);

    // Request the raw accessibility tree
    const { nodes } = await client.send("Accessibility.getFullAXTree");

    // Find the node that corresponds to the input element (role: "textbox")
    const textboxNode = nodes.find((n) => n.role?.value === "textbox");

    assert.ok(textboxNode, "Textbox node not found in browser AXTree");
    assert.strictEqual(
      textboxNode.name?.value,
      "First Name",
      "Browser computed an incorrect accessible name in the AXTree via ds-label",
    );
  },
);
