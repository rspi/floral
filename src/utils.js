export class CustomElement extends HTMLElement {
  #state = new Map();
  internals;

  static get observedAttributes() {
    if (!this.meta?.attributes) {
      throw new Error(
        "A component extending CustomElement is missing the static 'meta.attributes' property, which is required.",
      );
    }
    return Object.keys(this.meta.attributes);
  }

  static get templateNode() {
    if (!this.hasOwnProperty("_template")) {
      this._template = document.createElement("template");
      this._template.innerHTML = this.template;
    }
    return this._template;
  }

  constructor() {
    super();
    this.internals = this.attachInternals();

    this.attachShadow({
      mode: "open",
      delegatesFocus: this.constructor.delegatesFocus || false,
    });

    if (this.constructor.sheet) {
      this.shadowRoot.adoptedStyleSheets = [this.constructor.sheet];
    }

    this.shadowRoot.appendChild(
      this.constructor.templateNode.content.cloneNode(true),
    );

    queueMicrotask(() => {
      this.#setupStateAndProperties();
      this.setup?.();
    });
  }

  connectedCallback() {
    if (this.autofocus) {
      requestAnimationFrame(() => {
        this.focus();
      });
    }
  }

  #setupStateAndProperties() {
    const metaAttrs = this.constructor.meta?.attributes;
    if (!metaAttrs) return;

    for (const [attrName, allowedValues] of Object.entries(metaAttrs)) {
      const isBoolean = allowedValues.includes("");
      const initialAttrValue = this.getAttribute(attrName);
      const initialValue = isBoolean
        ? initialAttrValue !== null
        : initialAttrValue;

      this.#state.set(attrName, initialValue);
      this.#updateInternalsState(attrName, initialValue);

      Object.defineProperty(this, attrName, {
        get: () => this.#state.get(attrName),
        set: (value) => {
          const processedValue = isBoolean ? !!value : value;

          this.#validateAttributes(processedValue, attrName);
          const oldValue = this.#state.get(attrName);
          if (oldValue !== processedValue) {
            this.#state.set(attrName, processedValue);
            this.#updateInternalsState(attrName, processedValue);
            this.handleStateChange?.(attrName, oldValue, processedValue);
          }
        },
        configurable: true,
        enumerable: true,
      });

      if (initialAttrValue !== null) {
        this.handleStateChange?.(attrName, undefined, initialValue);
      }
    }
  }

  #updateInternalsState(name, value) {
    const metaAttrs = this.constructor.meta.attributes[name];

    // Clear existing value-based states for this attribute
    for (const possibleValue of metaAttrs) {
      if (possibleValue !== "") {
        this.internals.states.delete(`${name}-${possibleValue}`);
      }
    }

    if (typeof value === "boolean") {
      if (value) {
        this.internals.states.add(name);
      } else {
        this.internals.states.delete(name);
      }
    } else if (value !== null && value !== undefined) {
      // Only add state if it's one of the predefined values (not an empty list)
      if (metaAttrs.length > 0 && metaAttrs.includes(value)) {
        this.internals.states.add(`${name}-${value}`);
      }
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.#validateAttributes(newValue, name);
    const isBoolean = this.constructor.meta.attributes[name].includes("");
    const processedValue = isBoolean ? newValue !== null : newValue;

    const oldStateValue = this.#state.get(name);
    if (oldStateValue !== processedValue) {
      this.#state.set(name, processedValue);
      this.#updateInternalsState(name, processedValue);
      this.handleStateChange?.(name, oldStateValue, processedValue);
    }
  }

  #validateAttributes(value, name) {
    const attributes = this.constructor.meta?.attributes;

    const isBoolean = attributes[name]?.includes("");

    if (isBoolean && typeof value === "boolean") {
      return;
    }

    if (
      value !== null &&
      attributes[name]?.length !== 0 &&
      !attributes[name].includes(value)
    ) {
      throw new Error(`${this.tagName.toLowerCase()} got an unexpected value for argument ${JSON.stringify(
        name,
      )}:
          Expected one of: ${JSON.stringify(attributes[name])}
          Got: ${JSON.stringify(value)}
          `);
    }
  }
}

export function syncAccessibility(host, target) {
  if (!host || !target) return;

  // 1. Set ariaLabelledByElements natively if supported
  if ("ariaLabelledByElements" in target) {
    const elements = [];

    // Add external label elements (from <label for="..."> or wrapping <label>)
    if (host.internals?.labels && host.internals.labels.length > 0) {
      elements.push(...Array.from(host.internals.labels));
    }

    // Add aria-labelledby elements
    const ariaLabelledby = host.getAttribute("aria-labelledby");
    if (ariaLabelledby) {
      const root = host.getRootNode();
      if (root && typeof root.getElementById === "function") {
        const ids = ariaLabelledby.split(/\s+/);
        for (const id of ids) {
          const el = root.getElementById(id);
          if (el) elements.push(el);
        }
      }
    }

    target.ariaLabelledByElements = elements;
  }

  // 2. Set aria-label if there are no element labels
  const ariaLabel = host.getAttribute("aria-label");
  const hasAriaLabelledby = host.hasAttribute("aria-labelledby");
  const hasLabels = host.internals?.labels && host.internals.labels.length > 0;

  if (ariaLabel && !hasAriaLabelledby && !hasLabels) {
    target.setAttribute("aria-label", ariaLabel);
  } else {
    target.removeAttribute("aria-label");
  }

  // 3. Set descriptions natively via element references and sync to aria-description attribute.
  // We use aria-description attribute because element reference properties (ariaDescribedByElements)
  // silently fail in Chromium when referencing elements outside the Shadow DOM tree-scope.
  const ariaDescribedby = host.getAttribute("aria-describedby");
  if (ariaDescribedby) {
    const root = host.getRootNode();
    if (root && typeof root.getElementById === "function") {
      const ids = ariaDescribedby.split(/\s+/);
      const elements = ids.map((id) => root.getElementById(id)).filter(Boolean);

      if (elements.length > 0) {
        const descriptionText = elements
          .map((el) => el.textContent.trim())
          .join(" ");
        target.setAttribute("aria-description", descriptionText);

        if ("ariaDescribedByElements" in target) {
          target.ariaDescribedByElements = elements;
        }
      } else {
        target.removeAttribute("aria-description");
        if ("ariaDescribedByElements" in target) {
          target.ariaDescribedByElements = [];
        }
      }
    }
  } else {
    target.removeAttribute("aria-description");
    if ("ariaDescribedByElements" in target) {
      target.ariaDescribedByElements = [];
    }
  }

  // Sync general description attribute fallback
  if (ariaDescribedby) {
    target.setAttribute("aria-describedby", ariaDescribedby);
  } else {
    target.removeAttribute("aria-describedby");
  }
}
