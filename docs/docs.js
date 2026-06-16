const discoveredComponents = new Map();
const originalDefine = window.customElements.define;

window.customElements.define = function (name, constructor, options) {
  if (name.startsWith("ds-")) {
    const slug = name.replace("ds-", "");
    discoveredComponents.set(slug, { name, constructor });
  }
  return originalDefine.call(window.customElements, name, constructor, options);
};

const libraryPromise = import("../src/index.js");
const componentRendererPromise = import("./component.js");

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const flowerSvg = `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
        >
          <defs>
            <style>
              .line-art {
                fill: none;
                stroke-width: 4;
                stroke-linecap: round;
                stroke-linejoin: round;

                stroke-dasharray: 150;
                stroke-dashoffset: 150;
                animation: draw 2s ease-in-out forwards;
              }

              .flower {
                stroke: var(--ds-color-lavender-70);
              }
              .stem {
                stroke: var(--ds-color-mint-70);
              }

              .stem {
                animation-delay: 0.1s;
              }
              .leaf-left {
                animation-delay: 0.7s;
              }
              .leaf-right {
                animation-delay: 1.3s;
              }
              .petal-center {
                animation-delay: 1.9s;
              }
              .petal-left {
                animation-delay: 2.2s;
              }
              .petal-right {
                animation-delay: 2.5s;
              }

              @keyframes draw {
                to {
                  stroke-dashoffset: 0;
                }
              }

              .flower-group {
                transform-origin: 50px 95px;
                animation: sway 6s ease-in-out infinite;
              }

              @keyframes sway {
                0%,
                100% {
                  transform: rotate(-2deg);
                }
                50% {
                  transform: rotate(3deg);
                }
              }
            </style>
          </defs>

          <g class="flower-group">
            <path class="line-art stem" d="M 52 95 Q 45 75 50 50" />
            <path
              class="line-art stem leaf-left"
              d="M 49 78 Q 35 75 28 65 Q 35 65 47 72"
            />
            <path
              class="line-art stem leaf-right"
              d="M 48 67 Q 65 65 75 52 Q 65 50 49 60"
            />
            <path
              class="line-art flower petal-center"
              d="M 50 50 Q 38 25 50 10 Q 62 25 50 50"
            />
            <path
              class="line-art flower petal-left"
              d="M 50 50 Q 20 40 30 15 Q 38 28 43 31.5"
            />
            <path
              class="line-art flower petal-right"
              d="M 50 50 Q 80 40 70 15 Q 62 28 57 31.5"
            />
          </g>
        </svg>
`;

const template = document.createElement("template");
template.innerHTML = `
  <aside>
    <div>
      <div class="title">
        <a href="./">Floral</a>
        <div>Design system</div>
      </div>
      <nav>
        <section>
          <h2>Foundations</h2>
          <a href="./?page=foundations/colors">Colors</a>
        </section>
        <section>
          <h2>Examples</h2>
          <a href="./?page=examples/form">Form</a>
        </section>
        <section class="components">
          <h2>Components</h2>
        </section>
      </nav>
    </div>
  </aside>
  <main></main>
  ${flowerSvg}
`;

async function fetchPreviewFragment(slug) {
  try {
    const response = await fetch(`../src/components/${slug}/preview.html`);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

async function fetchStaticPage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);

  return response.text();
}

class DocsShell extends HTMLElement {
  #initialContent = "";

  constructor() {
    super();
  }

  connectedCallback() {
    this.#initialContent = this.innerHTML;

    this.innerHTML = "";
    this.appendChild(template.content.cloneNode(true));

    this.nav = this.querySelector("nav");
    this.main = this.querySelector("main");

    libraryPromise.then(async () => {
      await this.populateComponents();
      this.setupEventListeners();
      this.loadPage(window.location.href);
    });
  }

  async populateComponents() {
    const componentsSection = this.nav.querySelector(".components");

    if (!componentsSection) return;

    const slugs = Array.from(discoveredComponents.keys());
    const previewResults = await Promise.all(
      slugs.map(async (slug) => ({
        slug,
        fragment: await fetchPreviewFragment(slug),
      })),
    );

    for (const { slug, fragment } of previewResults) {
      if (fragment) {
        const info = discoveredComponents.get(slug);
        info.previewContent = fragment;

        const displayName = capitalize(slug);

        const a = document.createElement("a");
        a.href = `./?component=${slug}`;
        a.textContent = displayName;
        componentsSection.appendChild(a);
      }
    }
  }

  setupEventListeners() {
    this.nav.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const href = link.getAttribute("href");
      if (href && !href.startsWith("http")) {
        e.preventDefault();
        this.navigate(link.href);
      }
    });
  }

  async navigate(url) {
    const success = await this.loadPage(url);
    if (success) {
      history.pushState(null, "", url);
    }
  }

  async loadPage(url) {
    const urlObj = new URL(url, window.location.href);
    const component = urlObj.searchParams.get("component");
    const page = urlObj.searchParams.get("page");

    try {
      let title;
      let node;

      if (component) {
        const { renderComponent } = await componentRendererPromise;
        const info = discoveredComponents.get(component);
        const result = await renderComponent(
          component,
          info?.constructor?.meta,
          info?.previewContent,
        );
        title = result.title;
        node = result.element;
      } else {
        const html = page
          ? await fetchStaticPage(`${page}.html`)
          : this.#initialContent;
        title = page ? `Floral - ${capitalize(page)}` : "Floral";

        const template = document.createElement("template");
        template.innerHTML = html;
        node = template.content;
      }

      document.title = title;
      this.main.replaceChildren(node);
      this.syncNav(url);
      window.scrollTo(0, 0);
      return true;
    } catch (err) {
      console.error("Navigation error:", err);
      return false;
    }
  }

  syncNav(url) {
    const currentUrl = new URL(url, window.location.href);

    this.nav.querySelectorAll("a").forEach((link) => {
      const linkUrl = new URL(link.href, window.location.href);
      const active = currentUrl.search === linkUrl.search;
      link.classList.toggle("active", active);
    });
  }
}

customElements.define("docs-shell", DocsShell);

window.addEventListener("popstate", () => {
  document.querySelector("docs-shell")?.loadPage(window.location.href);
});
