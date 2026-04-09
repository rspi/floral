function renderMetadata(meta) {
  if (!meta) return "";

  let html = `
      <section class="metadata">
        <h2>Metadata</h2>

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
              ${Object.entries(meta.attributes || {})
                .map(
                  ([name, values]) => `
              <tr>
                <td><code>${name}</code></td>
                <td>${
                  values
                    .map((v) =>
                      v === "" ? "<em>boolean</em>" : `<code>${v}</code>`,
                    )
                    .join(", ") || "<em>any</em>"
                }</td>
              </tr>
            `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        ${
          meta.slots && Object.keys(meta.slots).length > 0
            ? `
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
                ${Object.entries(meta.slots)
                  .map(
                    ([name, desc]) => `
                  <tr>
                    <td><code>${name}</code></td>
                    <td>${desc}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
            : ""
        }
      </section>
    `;
  return html;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function renderComponent(slug, meta) {
  const fetchUrl = `../src/components/${slug}/preview.html`;
  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error(`Failed to load ${fetchUrl}`);
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const shellInDoc = doc.querySelector("docs-shell");
  let content;

  if (shellInDoc) {
    content = shellInDoc.innerHTML;
  } else {
    const bodyMain = doc.querySelector("main");
    content = bodyMain ? bodyMain.innerHTML : doc.body.innerHTML;
  }

  // Clean up indentation for the code preview
  const lines = content.trim().split("\n");
  const minIndent = lines.reduce((min, line) => {
    if (line.trim().length === 0) return min;
    const match = line.match(/^(\s*)/);
    return Math.min(min, match[0].length);
  }, Infinity);

  const cleanContent = lines
    .map((line) => line.slice(minIndent === Infinity ? 0 : minIndent))
    .join("\n");

  const displayName = slug.charAt(0).toUpperCase() + slug.slice(1);

  let finalHtml = `
    <h1>${displayName}</h1>
    <section class="example">
      <div class="rendered">
        ${content}
      </div>

      <pre><code>${escapeHtml(cleanContent)}</code></pre>
    </section>
  `;

  finalHtml += renderMetadata(meta);

  return {
    content: finalHtml,
    title: `Floral - ${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
  };
}
