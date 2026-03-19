import { uiTest } from "#test-helper";
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

uiTest('ds-button type="button" should NOT submit form', async (page) => {
  await page.mount(`
    <form id="myform">
      <ds-button type="button">Button</ds-button>
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
  assert.ok(
    !submitted,
    'Form should NOT have been submitted with type="button"',
  );
});

uiTest('ds-button should default to type="submit"', async (page) => {
  await page.mount(`
    <form id="myform">
      <ds-button>Default</ds-button>
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
  assert.ok(submitted, "Form should have been submitted with default type");
});

uiTest("ds-button should submit its name and value", async (page) => {
  await page.mount(`
    <form id="myform">
      <ds-button name="test-name" value="test-value" type="submit">Submit</ds-button>
    </form>
  `);
  const formData = await page.evaluate(() => {
    return new Promise((resolve) => {
      const form = document.getElementById("myform");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        resolve(Object.fromEntries(fd.entries()));
      });
      document.querySelector("ds-button").click();
    });
  });
  assert.strictEqual(
    formData["test-name"],
    "test-value",
    "Form data should include button name and value",
  );
});

uiTest('ds-button type="reset" should reset form', async (page) => {
  await page.mount(`
    <form id="myform">
      <input id="myinput" value="initial" />
      <ds-button type="reset">Reset</ds-button>
    </form>
  `);
  await page.fill("#myinput", "changed");
  await page.click("ds-button");
  const inputValue = await page.inputValue("#myinput");
  assert.strictEqual(inputValue, "initial", "Form should have been reset");
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

uiTest(
  "ds-button should not leak value to subsequent submissions with same name",
  async (page) => {
    await page.mount(`
    <form id="myform">
      <ds-button name="action" value="save" id="save">Save</ds-button>
      <ds-button name="action" value="delete" id="delete">Delete</ds-button>
    </form>
  `);

    const getFormData = async (triggerId) => {
      return await page.evaluate((id) => {
        return new Promise((resolve) => {
          const form = document.getElementById("myform");
          const handler = (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            form.removeEventListener("submit", handler);
            resolve(fd.getAll("action"));
          };
          form.addEventListener("submit", handler);
          document.getElementById(id).click();
        });
      }, triggerId);
    };

    const firstSubmission = await getFormData("save");
    assert.deepStrictEqual(firstSubmission, ["save"]);

    const secondSubmission = await getFormData("delete");
    assert.deepStrictEqual(secondSubmission, ["delete"]);
  },
);
