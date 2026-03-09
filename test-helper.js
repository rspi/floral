import { test, after } from "node:test";
import { chromium } from "playwright-core";
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

  server = spawn("node", ["dev-server.js"], {
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
    const page = await browser.newPage();
    try {
      page.setDefaultTimeout(5000);
      await page.goto(`http://localhost:${port}/blank`);
      page.mount = async (html) => {
        await page.evaluate((html) => {
          document.body.innerHTML = html;
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
      await fn(page);
    } finally {
      await page.close();
    }
  });
};
