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

    #updateValidity() {
      this.#internals.setValidity(
        this.#input.validity,
        this.#input.validationMessage,
        this.#input,
      );
    }

    checkValidity() {
      return this.#internals.checkValidity();
    }

    reportValidity() {
      return this.#internals.reportValidity();
    }

    get validity() {
      return this.#internals.validity;
    }

    get validationMessage() {
      return this.#internals.validationMessage;
    }

    attributesChanged(name, oldValue, newValue) {
      if (name === "value") {
        this.#input.value = newValue || "";
        this.#internals.setFormValue(newValue);
        this.#updateValidity();
      } else if (name === "type") {
        this.#input.type = newValue || "text";
        this.#updateValidity();
      } else if (name === "placeholder") {
        this.#input.placeholder = newValue || "";
      } else if (name === "required") {
        this.#input.required = newValue !== null;
        this.#updateValidity();
      }
    }

    formDisabledCallback(disabled) {
      if (disabled) {
        this.#input.setAttribute("disabled", "");
        this.#internals.ariaDisabled = "true";
      } else {
        this.#input.removeAttribute("disabled");
        this.#internals.ariaDisabled = "false";
      }
    }

    #handleInput = () => {
      this.value = this.#input.value;
      this.#internals.setFormValue(this.value);
      this.#updateValidity();
    };

    #handleChange = () => {
      this.dispatchEvent(
        new Event("change", { bubbles: true, composed: true }),
      );
    };

    #handleKeyDown = (event) => {
      if (event.key === "Enter" && this.#internals.form) {
        this.#internals.form.requestSubmit();
      }
    };

    constructor() {
      super();
      this.#internals = this.attachInternals();
      this.#input = this.shadowRoot.querySelector("input");

      // default compose: true
      this.#input.addEventListener("input", this.#handleInput);
      // default compose: false
      this.#input.addEventListener("change", this.#handleChange);

      this.#input.addEventListener("keydown", this.#handleKeyDown);

      this.#updateValidity();
    }
  },
);
