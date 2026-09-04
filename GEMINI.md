# ⚠️ UNBREAKABLE CORE ARCHITECTURAL LAWS (ZERO TOLERANCE) ⚠️

Any violation of these laws will result in immediate system rejection.

- **Sacred Host Elements**: NEVER mutate, add, or modify attributes or styles on the host element (`this` or host tag). The consumer owns it. Keep all changes inside the Shadow DOM.
- **Native Accessibility First**: Design natively for standard accessibility. NEVER write source-code attribute-copying hacks or custom fallbacks solely to satisfy test-runner engines (like Playwright's `getByRole`). Use native platform features like `referenceTarget`, `ariaLabelledByElements`, and `ariaDescribedByElements` on Shadow DOM elements exclusively.
- **Evergreen Browsers Only**: Target modern, standard evergreen browser specifications (Chrome 151+, modern Safari/Firefox). NEVER write legacy fallback scripts, polyfills, or outdated UA-sniffing hacks. Rely 100% on the native browser engine.
- **Mandatory Quality Verification**: After ANY change, you MUST run the test suite (`npm test`) and run the formatter/linter (`npm run format`) to guarantee 100% code formatting compliance and zero functional regressions.
