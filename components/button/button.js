import sheet from "./button.css" with { type: "css" };
import { CustomElement } from "../../utils.js";

const html = `
  <button>
    <slot name="start"></slot>
    <div><slot></slot></div>
    <slot name="end"></slot>
  </button>
  `;

window.customElements.define(
  "ds-button",
  class extends CustomElement {
    static template = html;
    static sheet = sheet;
    static formAssociated = true;
    static delegatesFocus = true;

    static meta = {
      attributes: {
        disabled: [""],
        variant: ["default", "primary", "negative"],
        type: ["submit", "reset", "button"],
        value: [],
      },
      slots: {
        default: "The button content.",
        start: "Content at the start of button text. Typically used for icons.",
        end: "Content at the end of button text. Typically used for icons.",
      },
      parts: {},
      cssVariables: {},
    };

    #button;

    #updateDisabledState(disabled) {
      if (disabled) {
        this.#button.setAttribute("disabled", "");
        this.internals.ariaDisabled = "true";
      } else {
        this.#button.removeAttribute("disabled");
        this.internals.ariaDisabled = "false";
      }
    }

    handleStateChange(name, oldValue, newValue) {
      if (name === "disabled") {
        this.#updateDisabledState(newValue);
      }
    }

    #handleSubmit = () => {
      const form = this.internals.form;
      if (form) {
        this.internals.setFormValue(this.value);
        form.requestSubmit();
        this.internals.setFormValue(null);
      }
    };

    #handleReset = () => {
      this.internals.form?.reset();
    };

    #handleClick = (e) => {
      if (this.disabled) {
        e.stopImmediatePropagation();
        return;
      }
      const type = this.type ?? "submit";
      if (type === "submit") {
        this.#handleSubmit();
      } else if (type === "reset") {
        this.#handleReset();
      }
    };

    formDisabledCallback(disabled) {
      this.#updateDisabledState(disabled);
    }

    constructor() {
      super();
      this.internals.role = "button";
      this.#button = this.shadowRoot.querySelector("button");

      // default compose: true
      this.addEventListener("click", this.#handleClick);
    }
  },
);
