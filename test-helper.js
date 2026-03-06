import { test, after } from "node:test";
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";

let browser;
let server;
const PORT = 4712;

async function setup() {
  if (browser) return;

  // Start dev server
  server = spawn("node", ["dev-server.js"], {
    env: { ...process.env, PORT },
    stdio: ["ignore", "pipe", "inherit"], // Pipe stdout so we can listen to it
  });

  // Allow Node to exit even if the server is still running
  server.unref();

  // Wait for the "Server running" message event
  await new Promise((resolve) => {
    server.stdout.on("data", function onData(data) {
      if (data.toString().includes("Server running")) {
        server.stdout.off("data", onData); // Stop listening once ready
        resolve();
      }
    });
  });

  try {
    browser = await chromium.launch();
  } catch (e) {
    console.error(
      "Failed to launch browser. Did you run `npm run test:install`?",
    );
    if (server) server.kill();
    throw e;
  }

  process.on("exit", () => {
    if (browser) browser.close();
    if (server) server.kill();
  });

  // This will run after all tests in a FILE have finished.
  // Since each file imports this, it will ensure browser is closed eventually.
  after(async () => {
    if (browser) {
      await browser.close();
      browser = null; // Reset so next file can re-init if needed
    }
    if (server) {
      server.kill();
      server = null;
    }
  });
}

export const uiTest = (name, fn) => {
  test(name, async (t) => {
    await setup();
    const page = await browser.newPage();
    try {
      await page.goto(`http://localhost:${PORT}/blank`);
      // Helper to set content easily
      page.mount = async (html) => {
        await page.evaluate((html) => {
          document.body.innerHTML = html;
        }, html);
        // Wait for components to be defined
        await page.evaluate(async () => {
          const elements = Array.from(document.body.querySelectorAll("*"));
          const customElements = elements.filter((el) =>
            el.tagName.includes("-"),
          );
          await Promise.all(
            customElements.map((el) =>
              window.customElements.whenDefined(el.tagName.toLowerCase()),
            ),
          );
        });
      };
      await fn(page);
    } finally {
      await page.close();
    }
  });
};
