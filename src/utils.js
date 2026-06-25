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

  syncAccessibilityAttributes(innerElement, extraAttributes = []) {
    if (!innerElement) return;

    // 1. Accessible Name
    const ariaLabel = this.getAttribute("aria-label");
    if (ariaLabel) {
      innerElement.setAttribute("aria-label", ariaLabel);
    } else {
      const ariaLabelledBy = this.getAttribute("aria-labelledby");
      if (ariaLabelledBy) {
        const resolvedText = ariaLabelledBy
          .split(/\s+/)
          .map((id) => {
            const el = document.getElementById(id);
            return el ? el.textContent.trim() : "";
          })
          .filter(Boolean)
          .join(" ");
        if (resolvedText) {
          innerElement.setAttribute("aria-label", resolvedText);
        } else {
          innerElement.removeAttribute("aria-label");
        }
      } else if (this.internals.labels && this.internals.labels.length > 0) {
        const labelText = Array.from(this.internals.labels)
          .map((label) => label.textContent.trim())
          .join(" ");
        innerElement.setAttribute("aria-label", labelText);
      } else {
        innerElement.removeAttribute("aria-label");
      }
    }

    // 2. Accessible Description
    const ariaDescribedBy = this.getAttribute("aria-describedby");
    if (ariaDescribedBy) {
      const resolvedDescription = ariaDescribedBy
        .split(/\s+/)
        .map((id) => {
          const el = document.getElementById(id);
          return el ? el.textContent.trim() : "";
        })
        .filter(Boolean)
        .join(" ");
      if (resolvedDescription) {
        innerElement.setAttribute("aria-description", resolvedDescription);
      } else {
        innerElement.removeAttribute("aria-description");
      }
    } else {
      innerElement.removeAttribute("aria-description");
    }

    // 3. Component-Specific Extra Attributes
    for (const attr of extraAttributes) {
      const value = this.getAttribute(attr);
      if (value !== null) {
        innerElement.setAttribute(attr, value);
      } else {
        innerElement.removeAttribute(attr);
      }
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
