import sheet from "./input.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `<input />`;

window.customElements.define(
  "ds-input",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;
    static formAssociated = true;
    static delegatesFocus = true;

    static meta = {
      attributes: {
        value: [],
        placeholder: [],
        type: ["text", "password", "email", "number", "tel", "url"],
        disabled: [""],
        required: [""],
      },
      slots: {},
      parts: {},
      cssVariables: {},
    };

    #input;
    #internals;

    constructor() {
      super();
      this.#internals = this.attachInternals();
      this.#input = this.shadowRoot.querySelector("input");

      this.#input.addEventListener("input", () => {
        this.value = this.#input.value;
        this.#internals.setFormValue(this.value);
        this.dispatchEvent(
          new Event("input", { bubbles: true, composed: true }),
        );
      });

      this.#input.addEventListener("change", () => {
        this.dispatchEvent(
          new Event("change", { bubbles: true, composed: true }),
        );
      });
    }

    attributesChanged(name, oldValue, newValue) {
      if (name === "value") {
        this.#input.value = newValue || "";
        this.#internals.setFormValue(newValue);
      } else if (name === "type") {
        this.#input.type = newValue || "text";
      } else if (name === "placeholder") {
        this.#input.placeholder = newValue || "";
      } else if (name === "disabled") {
        this.#input.disabled = newValue !== null;
      } else if (name === "required") {
        this.#input.required = newValue !== null;
      }
    }
  },
);
