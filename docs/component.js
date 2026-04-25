function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dedent(text) {
  const lines = text.trim().split("\n");
  const minIndent = lines.reduce((min, line) => {
    if (line.trim().length === 0) return min;
    const match = line.match(/^(\s*)/);
    return Math.min(min, match[0].length);
  }, Infinity);

  return lines
    .map((line) => line.slice(minIndent === Infinity ? 0 : minIndent))
    .join("\n");
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderAttributeValue(name, value, isActive, currentValue) {
  const isValActive =
    isActive && (value === "" ? currentValue === "" : currentValue === value);
  const label = value === "" ? "boolean" : value;
  const classes = `interactive ${isValActive ? "selected" : ""}`;

  return `<code class="${classes}" data-meta-attr="${name}" data-meta-val="${value}">${label}</code>`;
}

function renderAttributesTable(attributes, activeAttrs) {
  if (!attributes || Object.keys(attributes).length === 0) return "";

  const rows = Object.entries(attributes)
    .map(([name, values]) => {
      const isActive = Object.prototype.hasOwnProperty.call(activeAttrs, name);
      const currentValue = activeAttrs[name];
      const renderedValues =
        values
          .map((v) => renderAttributeValue(name, v, isActive, currentValue))
          .join(", ") || "<code>string</code>";

      return `
        <tr>
          <td><code>${name}</code></td>
          <td>${renderedValues}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="metadata-section">
      <h3>Attributes</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Values</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderSlotsTable(slots) {
  if (!slots || Object.keys(slots).length === 0) return "";

  const rows = Object.entries(slots)
    .map(
      ([name, desc]) => `
      <tr>
        <td><code>${name}</code></td>
        <td>${desc}</td>
      </tr>
    `,
    )
    .join("");

  return `
    <div class="metadata-section">
      <h3>Slots</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function getActiveAttributes(element) {
  return Array.from(element.attributes).reduce((acc, attr) => {
    acc[attr.name] = attr.value;
    return acc;
  }, {});
}

function renderMetadata(meta, componentNode) {
  if (!meta) return "";

  const activeAttrs = getActiveAttributes(componentNode);

  return `
    <section class="metadata">
      <h2>Metadata</h2>
      ${renderAttributesTable(meta.attributes, activeAttrs)}
      ${renderSlotsTable(meta.slots)}
    </section>
  `;
}

function highlightHtml(html) {
  return html
    .replace(/(&lt;!--.*?--&gt;)/g, '<span class="code-comment">$1</span>')
    .replace(/(&lt;\/?)([a-zA-Z0-9-]+)(.*?)&gt;/g, (match, p1, p2, p3) => {
      const highlightedAttributes = p3.replace(
        /(\s)([a-zA-Z0-9-]+)(=(&quot;.*?&quot;|&#039;.*?&#039;|[^\s&]+))?/g,
        (m, s, attr, valPart) => {
          let res = `<span class="code-attr">${attr}</span>`;
          if (valPart) {
            const val = valPart.substring(1);
            if (val === "&quot;&quot;" || val === "&#039;&#039;")
              return s + res;
            res += `=<span class="code-string">${val}</span>`;
          }
          return s + res;
        },
      );
      return `${p1}<span class="code-tag">${p2}</span>${highlightedAttributes}&gt;`;
    });
}

function refreshCodePreview(renderedEl, codeEl) {
  const content = dedent(renderedEl.innerHTML);
  codeEl.innerHTML = highlightHtml(escapeHtml(content));
}

function toggleAttribute(el, attrName, specificValue) {
  if (el.getAttribute(attrName) === specificValue) {
    el.removeAttribute(attrName);
  } else {
    el.setAttribute(attrName, specificValue);
  }
}

export async function renderComponent(slug, meta, content) {
  const container = document.createElement("div");
  container.innerHTML = `
    <h1>${capitalize(slug)}</h1>
    <section class="example">
      <div class="rendered">
        ${content}
      </div>

      <pre><code></code></pre>
    </section>
  `;

  const renderedEl = container.querySelector(".rendered");
  const codeEl = container.querySelector("code");
  const primaryComponent = renderedEl.querySelector(`ds-${slug}`);

  const syncDocumentation = () => {
    refreshCodePreview(renderedEl, codeEl);

    if (!primaryComponent) return;

    const metadataHtml = renderMetadata(meta, primaryComponent);
    const oldMetadata = container.querySelector(".metadata");

    if (oldMetadata) {
      oldMetadata.outerHTML = metadataHtml;
    } else {
      container.insertAdjacentHTML("beforeend", metadataHtml);
    }
  };

  syncDocumentation();

  container.addEventListener("click", (e) => {
    const interactive = e.target.closest(".interactive");
    if (!interactive) return;

    const attrName = interactive.dataset.metaAttr;
    const metaVal = interactive.dataset.metaVal;

    if (attrName && primaryComponent) {
      toggleAttribute(primaryComponent, attrName, metaVal);
      syncDocumentation();
    }
  });

  return {
    title: `Floral - ${capitalize(slug)}`,
    element: container,
  };
}
