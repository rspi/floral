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
      },
      slots: {
        default: "The button content.",
        start: "Content at the start of button text. Typically used for icons.",
        end: "Content at the end of button text. Typically used for icons.",
      },
      parts: {},
      cssVariables: {},
    };

    attributesChanged(name, oldValue, newValue) {
      switch ((name, newValue)) {
        case ("disabled", ""):
          this.#button.setAttribute(name, newValue);
          break;
        case ("disabled", null):
          this.#button.removeAttribute(name);
          break;
      }
    }

    constructor() {
      super();
      this.#button = this.shadowRoot.querySelector("button");
    }
  },
);
