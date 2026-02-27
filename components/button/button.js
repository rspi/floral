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
    static formAssociated = true;
    static template = html;
    static sheet = sheet;

    #button;
    #handleSubmit = () => {
      this.internals.form?.requestSubmit();
    };

    static meta = {
      attributes: {
        disabled: [""],
        variant: ["default", "primary", "negative"],
        type: ["submit"],
      },
      slots: {
        default: "The button content.",
        start: "Content at the start of button text. Typically used for icons.",
        end: "Content at the end of button text. Typically used for icons.",
      },
      parts: {},
      cssVariables: {},
    };

    formDisabledCallback(disabled) {
      // handle disable state from <fieldset>
      if (disabled) {
        this.setAttribute("disabled", "");
      } else {
        this.removeAttribute("disabled");
      }
    }

    attributesChanged(name, _, newValue) {
      switch (name) {
        case "type":
          if (newValue === "submit") {
            this.#button.addEventListener("click", this.#handleSubmit);
          } else {
            this.#button.removeEventListener("click", this.#handleSubmit);
          }
          break;
        case "disabled":
          if (newValue === "") {
            this.#button.setAttribute(name, newValue);
            this.setAttribute("aria-disabled", "true");
          } else if (newValue === null) {
            this.#button.removeAttribute(name);
            this.setAttribute("aria-disabled", "false");
          }
          break;
      }
    }

    constructor() {
      super();
      this.internals = this.attachInternals();
      this.#button = this.shadowRoot.querySelector("button");
    }
  },
);
