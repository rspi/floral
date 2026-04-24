export const discoveredComponents = new Map();
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
          <h2>Introduction</h2>
          <a href="./?page=colors">Colors</a>
        </section>
        <section class="components">
          <h2>Components</h2>
        </section>
      </nav>
    </div>
  </aside>
  <main></main>
`;

async function checkPreviewExists(slug) {
  try {
    const response = await fetch(`../src/components/${slug}/preview.html`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}

class DocsShell extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const initialContent = this.innerHTML;

    this.innerHTML = "";
    this.appendChild(template.content.cloneNode(true));

    this.nav = this.querySelector("nav");
    this.main = this.querySelector("main");

    libraryPromise.then(async () => {
      await this.populateComponents();
      this.setupEventListeners();

      const urlObj = new URL(window.location.href);
      if (
        urlObj.searchParams.has("component") ||
        urlObj.searchParams.has("page")
      ) {
        this.loadPage(window.location.href);
      } else {
        this.main.innerHTML = initialContent;
        this.updateActiveLink(window.location.href);
      }
    });
  }

  async populateComponents() {
    const componentsSection = this.nav.querySelector(".components");

    if (!componentsSection) return;

    const slugs = Array.from(discoveredComponents.keys());
    const previewChecks = await Promise.all(
      slugs.map(async (slug) => ({
        slug,
        exists: await checkPreviewExists(slug),
      })),
    );

    for (const { slug, exists } of previewChecks) {
      if (exists) {
        const { toDisplayName } = await componentRendererPromise;
        const displayName = toDisplayName(slug);

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
      if (!link) return;

      // Allow default behavior for modifier keys (new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const href = link.getAttribute("href");
      if (href && !href.startsWith("http")) {
        e.preventDefault();
        this.navigate(link.href);
      }
    });

    window.addEventListener("popstate", () => {
      this.loadPage(window.location.href);
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
    let fetchUrl = urlObj.href;

    try {
      let content;
      let title;
      let element;

      if (component) {
        const { renderComponent } = await componentRendererPromise;
        const info = discoveredComponents.get(component);
        const result = await renderComponent(
          component,
          info?.constructor?.meta,
        );
        content = result.content;
        title = result.title;
        element = result.element;
      } else if (page) {
        const { toDisplayName } = await componentRendererPromise;
        fetchUrl = `${page}.html`;
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Failed to load ${fetchUrl}`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        content = doc.body.innerHTML;
        title = `Floral - ${toDisplayName(page)}`;
      } else {
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Failed to load ${fetchUrl}`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const shellInDoc = doc.querySelector("docs-shell");
        if (shellInDoc) {
          content = shellInDoc.innerHTML;
        } else {
          const bodyMain = doc.querySelector("main");
          content = bodyMain ? bodyMain.innerHTML : doc.body.innerHTML;
        }
        title = doc.title || "Floral";
      }

      document.title = title;
      if (element) {
        this.main.innerHTML = "";
        this.main.appendChild(element);
      } else {
        this.main.innerHTML = content;
      }
      this.updateActiveLink(url);
      window.scrollTo(0, 0);
      return true;
    } catch (err) {
      console.error("Navigation error:", err);
      return false;
    }
  }

  updateActiveLink(url) {
    const currentUrl = new URL(url, window.location.href);
    const currentComponent = currentUrl.searchParams.get("component");
    const currentPage = currentUrl.searchParams.get("page");

    this.nav.querySelectorAll("a").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      const linkUrl = new URL(href, window.location.href);
      const linkComponent = linkUrl.searchParams.get("component");
      const linkPage = linkUrl.searchParams.get("page");

      if (currentComponent || linkComponent || currentPage || linkPage) {
        link.classList.toggle(
          "active",
          (currentComponent === linkComponent && !!linkComponent) ||
            (currentPage === linkPage && !!linkPage),
        );
      } else {
        // Match static pages by pathname
        link.classList.toggle(
          "active",
          currentUrl.pathname.endsWith(linkUrl.pathname),
        );
      }
    });
  }
}

customElements.define("docs-shell", DocsShell);
