import sheet from "./switch.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `
<input type="checkbox" role="switch" />
  `;

window.customElements.define(
  "ds-switch",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;
    static formAssociated = true;
    static delegatesFocus = true;

    static meta = {
      attributes: {
        checked: [""],
        disabled: [""],
        "aria-label": [],
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
      }
      if (name === "disabled") {
        this.#updateDisabledState(newValue);
      }
      if (name === "aria-label") {
        if (newValue) {
          this.#input.setAttribute("aria-label", newValue);
        } else {
          this.#input.removeAttribute("aria-label");
        }
      }
    }

    #handleChange = () => {
      this.checked = this.#input.checked;
      this.dispatchEvent(
        new Event("change", { bubbles: true, composed: true }),
      );
    };

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
