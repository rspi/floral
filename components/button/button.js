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

    #button;

    static meta = {
      attributes: {
        disabled: [""],
        variant: ["default", "primary", "negative"],
      },
      slots: {
        default: "The button content.",
        start: "Content at the start of button text. Typically used for icons.",
        end: "Content at the end of button text. Typically used for icons.",
      },
      parts: {},
      cssVariables: {},
    };

    attributesChanged(name, _, newValue) {
      switch (name) {
        case "disabled":
          if (newValue === "") {
            this.#button.setAttribute(name, newValue);
          } else if (newValue === null) {
            this.#button.removeAttribute(name);
          }
          break;
      }
    }

    constructor() {
      super();
      this.#button = this.shadowRoot.querySelector("button");
    }
  },
);
