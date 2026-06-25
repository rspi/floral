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
      } else if (
        name === "aria-label" ||
        name === "aria-labelledby" ||
        name === "aria-describedby"
      ) {
        this.syncAccessibilityAttributes(this.#input);
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

    setup() {
      this.syncAccessibilityAttributes(this.#input);
    }

    constructor() {
      super();
      this.internals.role = "none";
      this.#input = this.shadowRoot.querySelector("input");
      this.#input.addEventListener("change", this.#handleChange);

      this.addEventListener("focusin", () => {
        this.syncAccessibilityAttributes(this.#input);
      });
    }
  },
);
