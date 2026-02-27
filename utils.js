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
    this.attachShadow({ mode: "open" });
    if (this.constructor.sheet) {
      this.shadowRoot.adoptedStyleSheets = [this.constructor.sheet];
    }
    this.shadowRoot.appendChild(
      this.constructor.templateNode.content.cloneNode(true),
    );
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.validateAttributes(newValue, name);
    if (this.attributesChanged) {
      this.attributesChanged(name, oldValue, newValue);
    }
  }

  validateAttributes(value, name) {
    const { attributes } = this.constructor.meta;
    if (value !== null && !attributes[name].includes(value)) {
      throw new Error(`${this.tagName.toLowerCase()} got an unexpected value for argument ${JSON.stringify(name)}:
          Expected one of: ${JSON.stringify(attributes[name])}
          Got: ${JSON.stringify(value)}
          `);
    }
  }
}
