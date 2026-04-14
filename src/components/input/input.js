import sheet from "./input.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `
  <div class="container">
    <input />
    <slot name="error" id="error-slot"></slot>
  </div>
`;

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
      slots: {
        error: "Slot for validation error messages.",
      },
      parts: {},
      cssVariables: {},
    };

    #input;
    #initialValue = "";
    #initialValueCaptured = false;

    #updateValidity() {
      const isInvalid = !this.#input.checkValidity();
      const isTouched = this.internals.states.has("touched");

      this.internals.setValidity(
        this.#input.validity,
        this.#input.validationMessage,
        this.#input,
      );

      // Only announce invalidity to screen readers if the user has interacted
      const invalid = isTouched && isInvalid;
      this.internals.ariaInvalid = invalid ? "true" : "false";
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
      } else if (name === "name") {
        this.#input.ariaLabel = newValue || "input";
      } else if (name === "required") {
        this.#input.required = newValue;
        this.internals.ariaRequired = newValue ? "true" : "false";
        this.#updateValidity();
      } else if (name === "readonly") {
        this.#input.readOnly = newValue;
      } else if (name === "autofocus") {
        this.#input.autofocus = newValue;
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

      const errorSlot = this.shadowRoot.getElementById("error-slot");
      const updateErrorAssociation = () => {
        const assigned = errorSlot.assignedElements();
        if (assigned.length > 0) {
          this.internals.ariaDescribedByElements = assigned;
        } else {
          this.internals.ariaDescribedByElements = null;
        }
      };

      errorSlot.addEventListener("slotchange", updateErrorAssociation);
      updateErrorAssociation();
    }

    formDisabledCallback(disabled) {
      this.#updateDisabledState(disabled);
    }

    formResetCallback() {
      this.value = this.#initialValue;
      this.#input.value = this.#initialValue;
      this.internals.setFormValue(this.#initialValue);
      this.internals.states.delete("touched");
      this.#updateValidity();
    }
    #handleInput = () => {
      this.value = this.#input.value;
      this.internals.setFormValue(this.value);
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
      this.internals.role = "textbox";
      this.#input = this.shadowRoot.querySelector("input");

      // Add 'touched' state on invalid event (e.g. form submission attempt)
      this.addEventListener("invalid", () => {
        this.internals.states.add("touched");
        this.#updateValidity();
      });

      // default compose: true
      this.#input.addEventListener("input", this.#handleInput);
      // default compose: false
      this.#input.addEventListener("change", this.#handleChange);

      this.#input.addEventListener("keydown", this.#handleKeyDown);
      this.#input.addEventListener("blur", () => {
        this.internals.states.add("touched");
        this.#updateValidity();
      });

      this.#updateValidity();
    }
  },
);
