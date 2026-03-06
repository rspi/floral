import { uiTest } from "../../test-helper.js";
import assert from "node:assert";

uiTest("ds-button should render with text", async (page) => {
  await page.mount("<ds-button>Click me</ds-button>");
  const button = page.locator("ds-button");
  await assert.strictEqual(await button.textContent(), "Click me");
});

uiTest("ds-button should handle variants (visual test)", async (page) => {
  await page.mount(`
    <ds-button variant="primary">Primary</ds-button>
    <ds-button variant="negative">Negative</ds-button>
  `);

  const primaryButton = page.locator('ds-button[variant="primary"] >> button');
  const negativeButton = page.locator(
    'ds-button[variant="negative"] >> button',
  );

  const primaryBg = await primaryButton.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  const negativeBg = await negativeButton.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );

  assert.notStrictEqual(
    primaryBg,
    negativeBg,
    "Primary and Negative buttons should have different colors",
  );
});

uiTest("ds-button should handle click events", async (page) => {
  await page.mount('<ds-button id="btn">Click me</ds-button>');
  await page.evaluate(() => {
    window.clicked = false;
    document.getElementById("btn").addEventListener("click", () => {
      window.clicked = true;
    });
  });
  await page.click("ds-button");
  const clicked = await page.evaluate(() => window.clicked);
  assert.ok(clicked, "Button should have been clicked");
});

uiTest("ds-button should submit a form", async (page) => {
  await page.mount(`
    <form id="myform">
      <ds-button type="submit">Submit</ds-button>
    </form>
  `);
  await page.evaluate(() => {
    window.submitted = false;
    document.getElementById("myform").addEventListener("submit", (e) => {
      e.preventDefault();
      window.submitted = true;
    });
  });
  await page.click("ds-button");
  const submitted = await page.evaluate(() => window.submitted);
  assert.ok(submitted, "Form should have been submitted");
});

uiTest("ds-button should be activated by Enter key", async (page) => {
  await page.mount('<ds-button id="btn">Enter</ds-button>');
  await page.evaluate(() => {
    window.clicked = false;
    document.getElementById("btn").addEventListener("click", () => {
      window.clicked = true;
    });
  });
  await page.focus("ds-button");
  await page.keyboard.press("Enter");
  const clicked = await page.evaluate(() => window.clicked);
  assert.ok(clicked, "Button should have been activated by Enter");
});

uiTest("ds-button should be activated by Space key", async (page) => {
  await page.mount('<ds-button id="btn">Space</ds-button>');
  await page.evaluate(() => {
    window.clicked = false;
    document.getElementById("btn").addEventListener("click", () => {
      window.clicked = true;
    });
  });
  await page.focus("ds-button");
  await page.keyboard.press(" ");
  const clicked = await page.evaluate(() => window.clicked);
  assert.ok(clicked, "Button should have been activated by Space");
});

uiTest("ds-button should delegate focus to internal button", async (page) => {
  await page.mount('<ds-button id="btn">Focus</ds-button>');
  await page.focus("ds-button");

  const activeElementTag = await page.evaluate(() =>
    document.activeElement.tagName.toLowerCase(),
  );
  assert.strictEqual(
    activeElementTag,
    "ds-button",
    "ds-button should be the active element",
  );

  // But inside shadow DOM, the button should be focused
  const innerFocused = await page.evaluate(() => {
    return document
      .getElementById("btn")
      .shadowRoot.activeElement.tagName.toLowerCase();
  });
  assert.strictEqual(
    innerFocused,
    "button",
    "Internal button should have focus in shadow root",
  );
});

uiTest("ds-button should NOT be focusable when disabled", async (page) => {
  await page.mount('<ds-button disabled id="btn">Disabled</ds-button>');
  // Try to focus it
  await page.focus("ds-button").catch(() => {});
  const isFocused = await page.evaluate(() => {
    const btn = document.getElementById("btn");
    return btn.shadowRoot.activeElement !== null;
  });
  assert.ok(!isFocused, "Disabled button should not be focused in shadow root");
});

uiTest("ds-button should NOT trigger click when disabled", async (page) => {
  await page.mount('<ds-button disabled id="btn">Disabled</ds-button>');
  await page.evaluate(() => {
    window.clicked = false;
    document.getElementById("btn").addEventListener("click", () => {
      window.clicked = true;
    });
  });
  await page.click("ds-button", { force: true });
  const clicked = await page.evaluate(() => window.clicked);
  assert.ok(!clicked, "Disabled button should not trigger click");
});
