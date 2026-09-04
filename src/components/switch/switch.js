import sheet from "./switch.css" with { type: "css" };
import { CustomElement, syncOutwardAccessibility } from "../../utils.js";

const html = `
<input type="checkbox" role="switch" id="inner-input" />
  `;

window.customElements.define(
  "ds-switch",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;
    static formAssociated = true;
    static delegatesFocus = true;
    static referenceTarget = "inner-input";

    static meta = {
      attributes: {
        checked: [""],
        disabled: [""],
        "aria-label": [],
        "aria-labelledby": [],
        "aria-describedby": [],
      },
      slots: {},
      parts: {},
      cssVariables: {},
    };

    #input;

    #updateDisabledState(disabled) {
      this.#input.disabled = disabled;
    }

    handleStateChange(name, oldValue, newValue) {
      if (name === "checked") {
        this.#input.checked = newValue;
        this.internals.setFormValue(newValue ? "on" : null);
      } else if (name === "disabled") {
        this.#updateDisabledState(newValue);
      } else if (name === "aria-label") {
        if (newValue) {
          this.#input.setAttribute("aria-label", newValue);
        } else {
          this.#input.removeAttribute("aria-label");
        }
      } else if (name === "aria-labelledby" || name === "aria-describedby") {
        syncOutwardAccessibility(this, this.#input);
      }
    }

    #handleChange = () => {
      this.checked = this.#input.checked;
      this.dispatchEvent(
        new Event("change", { bubbles: true, composed: true }),
      );
    };

    setup() {
      syncOutwardAccessibility(this, this.#input);
    }

    connectedCallback() {
      super.connectedCallback();
      syncOutwardAccessibility(this, this.#input);
    }

    formDisabledCallback(disabled) {
      this.#updateDisabledState(disabled);
    }

    constructor() {
      super();
      this.#input = this.shadowRoot.querySelector("input");
      this.#input.addEventListener("change", this.#handleChange);
    }
  },
);
