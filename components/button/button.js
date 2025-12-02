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
    static meta = {
      props: {
        disabled: [""],
      },
      slots: {
        default: "The button content.",
        start: "Content at the start of button text. Typically used for icons.",
        end: "Content at the end of button text. Typically used for icons.",
      },
    };

    attributesChanged(name, oldValue, newValue) {
      switch (name) {
        case "disabled":
          this.button.disabled = newValue;
          break;
      }
    }

    constructor() {
      super(html, sheet);
      this.button = this.shadowRoot.querySelector("button");
    }
  },
);
