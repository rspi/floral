export class CustomElement extends HTMLElement {
  static get observedAttributes() {
    if (!this.meta || !this.meta.props) {
      throw new Error(
        "A component extending CustomElement is missing the static 'meta.props' property, which is required.",
      );
    }
    return Object.keys(this.meta.props);
  }

  constructor(templateString, sheet) {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [sheet];
    const template = document.createElement("template");
    template.innerHTML = templateString;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.validateAttributes(newValue, name);
    if (this.attributesChanged) {
      this.attributesChanged(name, oldValue, newValue);
    }
  }

  validateAttributes(value, name) {
    const { props } = this.constructor.meta;
    if (value !== null && !props[name].includes(value)) {
      throw new Error(`${this.tagName.toLowerCase()} got an unexpected value for argument ${JSON.stringify(name)}:
          Expected one of: ${JSON.stringify(props[name])}
          Got: ${JSON.stringify(value)}
          `);
    }
  }
}
