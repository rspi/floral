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
        width: ["tiny", "full"],
        disabled: [""],
        required: [""],
        readonly: [""],
        autofocus: [""],
        name: [],
      },
      slots: {},
      parts: {},
      cssVariables: {},
    };

    #input;
    #initialValue = "";
    #initialValueCaptured = false;

    #updateValidity() {
      this.internals.setValidity(
        this.#input.validity,
        this.#input.validationMessage,
        this.#input,
      );
    }

    #updateDisabledState(disabled) {
      if (disabled) {
        this.#input.setAttribute("disabled", "");
        this.internals.ariaDisabled = "true";
      } else {
        this.#input.removeAttribute("disabled");
        this.internals.ariaDisabled = "false";
      }
    }

    checkValidity() {
      return this.internals.checkValidity();
    }

    reportValidity() {
      return this.internals.reportValidity();
    }

    get validity() {
      return this.internals.validity;
    }

    get validationMessage() {
      return this.internals.validationMessage;
    }

    handleStateChange(name, oldValue, newValue) {
      if (name === "value") {
        if (!this.#initialValueCaptured) {
          this.#initialValue = newValue || "";
          this.#initialValueCaptured = true;
        }
        this.#input.value = newValue || "";
        this.internals.setFormValue(newValue);
        this.#updateValidity();
      } else if (name === "type") {
        this.#input.type = newValue || "text";
        this.#updateValidity();
      } else if (name === "placeholder") {
        this.#input.placeholder = newValue || "";
      } else if (name === "required") {
        this.#input.required = !!newValue;
        this.#updateValidity();
      } else if (name === "readonly") {
        this.#input.readOnly = !!newValue;
      } else if (name === "autofocus") {
        this.#input.autofocus = !!newValue;
      } else if (name === "disabled") {
        this.#updateDisabledState(newValue);
      }
    }

    setup() {
      if (!this.#initialValueCaptured) {
        this.#initialValue = this.value || "";
        this.#initialValueCaptured = true;
      }
      this.#updateValidity();
    }

    formDisabledCallback(disabled) {
      this.#updateDisabledState(disabled);
    }

    formResetCallback() {
      this.value = this.#initialValue;
      this.#input.value = this.#initialValue;
      this.internals.setFormValue(this.#initialValue);
      this.#updateValidity();
    }
    #handleInput = () => {
      this.value = this.#input.value;
      this.internals.setFormValue(this.value);
      this.internals.states.add("touched");
      this.#updateValidity();
    };

    #handleChange = () => {
      this.dispatchEvent(
        new Event("change", { bubbles: true, composed: true }),
      );
    };

    #handleKeyDown = (event) => {
      if (event.key === "Enter" && this.internals.form) {
        this.internals.form.requestSubmit();
      }
    };

    constructor() {
      super();
      this.#input = this.shadowRoot.querySelector("input");

      // Add 'touched' state on invalid event (e.g. form submission attempt)
      this.addEventListener("invalid", () => {
        this.internals.states.add("touched");
      });

      // default compose: true
      this.#input.addEventListener("input", this.#handleInput);
      // default compose: false
      this.#input.addEventListener("change", this.#handleChange);

      this.#input.addEventListener("keydown", this.#handleKeyDown);
      this.#input.addEventListener("blur", () => {
        this.internals.states.add("touched");
      });

      this.#updateValidity();
    }
  },
);
