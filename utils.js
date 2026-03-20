export class CustomElement extends HTMLElement {
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
    if (this.constructor.meta?.attributes) {
      for (const attrName of Object.keys(this.constructor.meta.attributes)) {
        if (!Object.hasOwn(this, attrName)) {
          Object.defineProperty(this, attrName, {
            get() {
              if (this.constructor.meta.attributes[attrName].includes("")) {
                return this.hasAttribute(attrName);
              }
              return this.getAttribute(attrName);
            },
            set(value) {
              if (this.constructor.meta.attributes[attrName].includes("")) {
                const hasAttr = this.hasAttribute(attrName);
                if (value && !hasAttr) {
                  this.setAttribute(attrName, "");
                } else if (!value && hasAttr) {
                  this.removeAttribute(attrName);
                }
              } else {
                const current = this.getAttribute(attrName);
                if (value === null || value === undefined) {
                  if (current !== null) {
                    this.removeAttribute(attrName);
                  }
                } else if (String(value) !== current) {
                  this.setAttribute(attrName, String(value));
                }
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
    if (this.attributesChanged) {
      this.attributesChanged(name, oldValue, newValue);
    }
  }

  #validateAttributes(value, name) {
    const { attributes } = this.constructor.meta;
    if (
      value !== null &&
      attributes[name]?.length !== 0 &&
      !attributes[name].includes(value)
    ) {
      throw new Error(`${this.tagName.toLowerCase()} got an unexpected value for argument ${JSON.stringify(name)}:
          Expected one of: ${JSON.stringify(attributes[name])}
          Got: ${JSON.stringify(value)}
          `);
    }
  }
}
