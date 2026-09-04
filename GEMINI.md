# Floral Guidelines

- **Host Elements**: Never mutate the host; the consumer owns it. Keep all changes inside the Shadow DOM.
- **Accessibility**: Design for accessibility. e.g `aria-label`, focus handing, form handling, proper keyboard navigation, think about screen readers.
- **Modern Browsers**: Target modern evergreen browsers exclusively. Avoid legacy fallback code.

## Accessibility Relationships & AXTree Testing

When establishing cross-root accessibility relationships (e.g. linking external `<label>` elements or descriptions with elements inside the Shadow DOM), adhere to the following standards:

1. **Native Element Reference Properties**: Always use modern `ARIAMixin` properties like `ariaLabelledByElements` and `ariaDescribedByElements` to directly reference DOM elements across shadow boundaries. Never use fragile string-based ID copying or real-time text-content copying hacks.
2. **No Faux Fallbacks in Source Code**: Do not write source code modifications or attribute-copying loops solely to satisfy limitations in test-runner selection engines (such as Playwright's `getByRole`). The codebase should remain pristine and rely exclusively on native platform APIs.
3. **Asserting via the Accessibility Tree (AXTree)**:
   - Playwright's static `getByRole` name-matching engine crawls HTML attributes and may not resolve dynamic JS-set element properties like `ariaLabelledByElements` or `ariaDescribedByElements`.
   - Therefore, always verify cross-root accessibility relationships by querying the browser's raw **Accessibility Tree (AXTree)** directly via a Chrome DevTools Protocol (CDP) session.
   - **AXTree Test Pattern Example**:

     ```javascript
     uiTest(
       "should have the correct computed accessible name",
       async (page) => {
         await page.mount(`
         <label id="lbl" for="my-element">Name</label>
         <ds-input id="my-element"></ds-input>
       `);
         const host = page.locator("#my-element");
         await host.focus(); // Trigger sync

         // Retrieve real-time AXTree from the browser
         const client = await page.context().newCDPSession(page);
         const { nodes } = await client.send("Accessibility.getFullAXTree");

         // Find the inner element node and assert its calculated accessible name
         const inputNode = nodes.find((n) => n.role?.value === "textbox");
         assert.ok(
           inputNode,
           "Interactive textbox element missing from AXTree",
         );
         assert.strictEqual(inputNode.name?.value, "Name");
       },
     );
     ```

4. **Double-Announcement Prevention**:
   - To prevent screen readers from reading a component's name or role twice, ensure that **only one element** in the component's subtree exposes the interactive role.
   - Verify this mathematically in the component's test suite by querying the AXTree and asserting that the number of active, non-ignored nodes of the target role is **exactly 1**:
     ```javascript
     const textboxNodes = nodes.filter(
       (n) => n.role?.value === "textbox" && !n.ignored,
     );
     assert.strictEqual(
       textboxNodes.length,
       1,
       "Duplicate textbox roles found (causes double-announcement)",
     );
     ```
