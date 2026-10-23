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
        required: [""],
        "aria-label": [],
        "aria-labelledby": [],
        "aria-describedby": [],
        "aria-errormessage": [],
      },
      slots: {},
      parts: {},
      cssVariables: {},
    };

    #input;
    #initialChecked = false;
    #initialCheckedCaptured = false;

    #updateDisabledState(disabled) {
      this.#input.disabled = disabled;
    }

    #updateValidity() {
      this.internals.setValidity(
        this.#input.validity,
        this.#input.validationMessage,
        this.#input,
      );
    }

    checkValidity() {
      return this.internals.checkValidity();
    }

    reportValidity() {
      const valid = this.internals.reportValidity();
      if (valid) {
        this.dispatchEvent(
          new Event("valid", { bubbles: true, composed: true }),
        );
      }
      return valid;
    }

    setCustomValidity(message) {
      this.#input.setCustomValidity(message);
      this.#updateValidity();
      if (!message) {
        this.dispatchEvent(
          new Event("valid", { bubbles: true, composed: true }),
        );
      }
    }

    get validity() {
      return this.internals.validity;
    }

    get validationMessage() {
      return this.internals.validationMessage;
    }

    handleStateChange(name, oldValue, newValue) {
      if (name === "checked") {
        if (!this.#initialCheckedCaptured) {
          this.#initialChecked = newValue;
          this.#initialCheckedCaptured = true;
        }
        this.#input.checked = newValue;
        this.internals.setFormValue(newValue ? "on" : null);
        this.#updateValidity();
      } else if (name === "required") {
        this.#input.required = newValue;
        this.#updateValidity();
      } else if (name === "disabled") {
        this.#updateDisabledState(newValue);
      } else if (name === "aria-label") {
        if (newValue) {
          this.#input.setAttribute("aria-label", newValue);
        } else {
          this.#input.removeAttribute("aria-label");
        }
      } else if (
        name === "aria-labelledby" ||
        name === "aria-describedby" ||
        name === "aria-errormessage"
      ) {
        syncOutwardAccessibility(this, this.#input);
      }
    }

    #handleChange = () => {
      this.checked = this.#input.checked;
      this.dispatchEvent(
        new Event("change", { bubbles: true, composed: true }),
      );
      this.#updateValidity();
    };

    setup() {
      if (!this.#initialCheckedCaptured) {
        this.#initialChecked = this.checked;
        this.#initialCheckedCaptured = true;
      }
      this.#updateValidity();
      syncOutwardAccessibility(this, this.#input);
    }

    connectedCallback() {
      super.connectedCallback();
      syncOutwardAccessibility(this, this.#input);
    }

    formDisabledCallback(disabled) {
      this.#updateDisabledState(disabled);
    }

    formResetCallback() {
      this.checked = this.#initialChecked;
      this.#input.checked = this.#initialChecked;
      this.internals.setFormValue(this.#initialChecked ? "on" : null);
      this.#updateValidity();
    }

    constructor() {
      super();
      this.#input = this.shadowRoot.querySelector("input");
      this.#input.addEventListener("change", this.#handleChange);
      this.#updateValidity();
    }
  },
);
