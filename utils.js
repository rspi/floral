export class CustomElement extends HTMLElement {
  #state = new Map();

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

    this.#reflectAttributes();
  }

  #reflectAttributes() {
    const { meta } = this.constructor;
    if (meta?.attributes) {
      for (const [attrName, possibleValues] of Object.entries(
        meta.attributes,
      )) {
        if (!Object.hasOwn(this, attrName)) {
          const isBoolean = possibleValues.includes("");

          Object.defineProperty(this, attrName, {
            get() {
              if (this.#state.has(attrName)) {
                return this.#state.get(attrName);
              }
              // Fallback for initial access before attributeChangedCallback has run
              return isBoolean
                ? this.hasAttribute(attrName)
                : this.getAttribute(attrName);
            },
            set(value) {
              const oldValue = this[attrName];
              if (oldValue === value) return;

              this.#state.set(attrName, value);
              if (this.attributesChanged) {
                this.attributesChanged(attrName, oldValue, value);
              }
            },
            configurable: true,
            enumerable: true,
          });
        }
      }
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.#validateAttributes(newValue, name);

    const { meta } = this.constructor;
    const isBoolean = meta.attributes[name].includes("");
    const value = isBoolean ? newValue !== null : newValue;

    const internalOldValue = this.#state.get(name);
    // If it's the first time we see this attribute (internalOldValue is undefined),
    // we always want to call attributesChanged to sync initial state.
    if (internalOldValue === value) return;

    this.#state.set(name, value);
    if (this.attributesChanged) {
      this.attributesChanged(name, internalOldValue, value);
    }
  }

  #validateAttributes(value, name) {
    const { attributes } = this.constructor.meta;
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
