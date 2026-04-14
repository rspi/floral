import { test, after } from "node:test";
import { chromium } from "playwright-core";
import { AxeBuilder } from "@axe-core/playwright";
import assert from "node:assert";
import { spawn } from "node:child_process";
import net from "node:net";

let browser;
let server;
let port;

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

const cleanup = async () => {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
  if (server) {
    server.kill();
    server = null;
  }
};

process.on("exit", cleanup);
after(cleanup);

async function setup() {
  if (browser) return;

  port = await getFreePort();

  server = spawn("node", ["tools/dev-server.js"], {
    env: { ...process.env, PORT: port },
    stdio: ["ignore", "pipe", "inherit"],
  });

  server.unref();

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Server start timeout")),
      5000,
    );
    server.stdout.on("data", function onData(data) {
      if (data.toString().includes("Server running")) {
        server.stdout.off("data", onData);
        clearTimeout(timeout);
        resolve();
      }
    });
    server.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  try {
    browser = await chromium.launch();
  } catch (e) {
    console.error("Failed to launch browser. Run `npm run test:install`?");
    if (server) server.kill();
    throw e;
  }
}

export const uiTest = (name, fn) => {
  test(name, async (t) => {
    await setup();
    const context = await browser.newContext();
    const page = await context.newPage();

    let failOnErrors = true;
    page.on("pageerror", (exception) => {
      if (failOnErrors) {
        throw new Error(`Uncaught exception in browser: ${exception.stack}`);
      }
    });

    page.on("console", (msg) => {
      if (failOnErrors && msg.type() === "error") {
        throw new Error(`Console error in browser: ${msg.text()}`);
      }
    });

    try {
      page.setDefaultTimeout(5000);
      await page.goto(`http://localhost:${port}/blank`);
      await page.addStyleTag({
        content: `
          :root {
            --ds-transition: 0s !important;
          }
          *, *::before, *::after {
            transition-duration: 0s !important;
            animation-duration: 0s !important;
          }
        `,
      });
      page.mount = async (html) => {
        await page.evaluate((html) => {
          document.body.innerHTML = `<main>${html}</main>`;
        }, html);
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

      page.checkA11y = async (selector = "body") => {
        const results = await new AxeBuilder({ page })
          .include(selector)
          .analyze();

        if (results.violations.length > 0) {
          const message = results.violations
            .map((v) => {
              const nodes = v.nodes
                .map((n) => `  - ${n.html}\n    ${n.failureSummary}`)
                .join("\n");
              return `${v.id}: ${v.help}\n  Impact: ${v.impact}\n  Nodes:\n${nodes}`;
            })
            .join("\n\n");
          assert.strictEqual(
            results.violations.length,
            0,
            `Axe violations found:\n${message}`,
          );
        }
      };

      page.getSnapshot = async () => {
        if (typeof page._snapshotForAI === "function") {
          const snapshot = await page._snapshotForAI();
          return {
            _text: snapshot.full,
          };
        }
        return null;
      };

      page.findNode = (snapshot, name) => {
        if (!snapshot || !snapshot._text) return null;
        const lines = snapshot._text.split("\n");
        for (const line of lines) {
          if (line.includes(`"${name}"`)) {
            const node = { name };
            // snapshotForAI uses lowercase lowercase [required] [invalid]
            if (line.includes("[required]")) node.required = true;
            if (line.includes("[invalid]")) node.invalid = "true";
            return node;
          }
        }
        return null;
      };

      // Allow the test function to toggle failOnErrors if needed
      page.expectErrors = () => {
        failOnErrors = false;
      };
      await fn(page);
    } finally {
      await page.close();
      await context.close();
    }
  });
};
